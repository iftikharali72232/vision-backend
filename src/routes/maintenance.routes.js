/**
 * Maintenance Routes
 * -------------------
 * SECRET-PROTECTED routes for running DB migrations / fixes across ALL tenant
 * databases (and optionally the system_db) without requiring a login.
 *
 * Security: every request MUST include the header:
 *   X-Maintenance-Key: <MAINTENANCE_SECRET from .env>
 *
 * Usage examples (curl):
 *   # List all tenants
 *   curl http://localhost:8000/maintenance/tenants \
 *     -H "X-Maintenance-Key: maint-k3y-v1s10n-p0s-2026"
 *
 *   # Run a built-in named migration on all tenants
 *   curl -X POST http://localhost:8000/maintenance/run \
 *     -H "X-Maintenance-Key: maint-k3y-v1s10n-p0s-2026" \
 *     -H "Content-Type: application/json" \
 *     -d '{"migration": "make_user_id_nullable"}'
 *
 *   # Run custom SQL on all tenants
 *   curl -X POST http://localhost:8000/maintenance/run-sql \
 *     -H "X-Maintenance-Key: maint-k3y-v1s10n-p0s-2026" \
 *     -H "Content-Type: application/json" \
 *     -d '{"sql": "ALTER TABLE orders MODIFY user_id INTEGER NULL", "target": "tenants"}'
 *
 * target options: "tenants" (default) | "system" | "all"
 */

const express = require('express');
const router = express.Router();
const mysql = require('mysql2/promise');

// ── Named migrations catalogue ──────────────────────────────────────────────
// Each migration can be:
//   (a) an array of SQL strings  → executed one-by-one
//   (b) an async function(conn)  → receives an open mysql2 Connection for complex logic
// All migrations should be idempotent (safe to run multiple times).
const MIGRATIONS = {
  /**
   * make_user_id_nullable
   * Makes user_id nullable in orders, held_orders, inventory_movements.
   * Required because master users have no branchUser record (user_id = null).
   * Uses a function to handle conditional FK drop/re-add without PREPARE/EXECUTE.
   */
  make_user_id_nullable: async (conn, dbName) => {
    const steps = [];

    // Helper: run one SQL and record result (ignores duplicate FK name errors)
    async function exec(label, sql) {
      try {
        await conn.execute(sql);
        steps.push({ label, ok: true });
      } catch (err) {
        const ignorable = [
          'ER_DUP_KEYNAME', 'ER_FK_DUP_NAME',
          'ER_CANT_DROP_FIELD_OR_KEY', 'ER_ERROR_ON_DROP', 'ER_DROP_INDEX_FK',
        ];
        if (ignorable.includes(err.code) ||
            (err.message && /duplicate key name|can't drop|doesn't exist/i.test(err.message))) {
          steps.push({ label, ok: true, note: 'already done – skipped' });
        } else {
          steps.push({ label, ok: false, error: err.message });
          throw err; // stop on unexpected errors
        }
      }
    }

    // 1. Find and drop existing user_id FKs on all three tables
    const tables = ['orders', 'held_orders', 'inventory_movements'];
    for (const tbl of tables) {
      const [rows] = await conn.execute(
        `SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE
         WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = 'user_id'
           AND REFERENCED_TABLE_NAME IS NOT NULL LIMIT 1`,
        [dbName, tbl]
      );
      if (rows.length > 0) {
        const fk = rows[0].CONSTRAINT_NAME;
        await exec(`drop FK ${fk} on ${tbl}`,
          `ALTER TABLE \`${tbl}\` DROP FOREIGN KEY \`${fk}\``);
      } else {
        steps.push({ label: `drop FK on ${tbl}`, ok: true, note: 'no FK found – skipped' });
      }
    }

    // 2. Make user_id nullable on all three tables
    for (const tbl of tables) {
      await exec(`nullable user_id on ${tbl}`,
        `ALTER TABLE \`${tbl}\` MODIFY \`user_id\` INTEGER NULL`);
    }

    // 3. Re-add FK with ON DELETE SET NULL (only if branch_users table exists)
    const [buRows] = await conn.execute(
      `SELECT COUNT(*) AS cnt FROM information_schema.TABLES
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'branch_users'`,
      [dbName]
    );
    const hasBranchUsers = buRows[0].cnt > 0;

    if (hasBranchUsers) {
      const fkDefs = {
        orders:               'orders_user_id_fkey',
        held_orders:          'held_orders_user_id_fkey',
        inventory_movements:  'inventory_movements_user_id_fkey',
      };
      for (const [tbl, fkName] of Object.entries(fkDefs)) {
        await exec(`add FK ${fkName}`,
          `ALTER TABLE \`${tbl}\` ADD CONSTRAINT \`${fkName}\`
           FOREIGN KEY (\`user_id\`) REFERENCES \`branch_users\`(\`id\`)
           ON DELETE SET NULL ON UPDATE CASCADE`);
      }
    } else {
      steps.push({ label: 're-add FKs', ok: true, note: 'branch_users table not found – FKs skipped' });
    }

    return steps;
  },

  // ── Add new migrations below ──────────────────────────────────────────────
  // Example – SQL array migration:
  // add_some_column: [
  //   'ALTER TABLE some_table ADD COLUMN new_col VARCHAR(255) NULL',
  // ],
  //
  // Example – function migration:
  // my_complex_migration: async (conn, dbName) => { ... return steps; },
};

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Parse the DATABASE_URL or SYSTEM_DATABASE_URL to get connection params
 */
function parseDbUrl(url) {
  const match = url.match(/mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(\S+)/);
  if (!match) throw new Error(`Cannot parse DB URL: ${url}`);
  return {
    host: match[3],
    port: parseInt(match[4]),
    user: match[1],
    password: decodeURIComponent(match[2]),
    database: match[5].split('?')[0],
  };
}

/**
 * Execute a migration on a given database.
 * migration can be:
 *   - an array of SQL strings (executed one-by-one)
 *   - an async function(conn, dbName) that returns an array of step results
 */
async function runMigrationOnDb(dbName, migration) {
  const base = parseDbUrl(process.env.DATABASE_URL || process.env.SYSTEM_DATABASE_URL);
  let conn;
  try {
    conn = await mysql.createConnection({
      host: base.host,
      port: base.port,
      user: base.user,
      password: base.password,
      database: dbName,
      multipleStatements: false,
    });

    let results;

    if (typeof migration === 'function') {
      // Function-based migration — receives open connection
      results = await migration(conn, dbName);
    } else {
      // SQL-array migration — execute each statement
      results = [];
      for (const sql of migration) {
        const trimmed = sql.trim();
        if (!trimmed) continue;
        try {
          await conn.execute(trimmed);
          results.push({ sql: trimmed.slice(0, 80), ok: true });
        } catch (err) {
          const ignorable = ['ER_DUP_KEYNAME', 'ER_FK_DUP_NAME'];
          if (ignorable.includes(err.code) ||
              (err.message && /duplicate key name/i.test(err.message))) {
            results.push({ sql: trimmed.slice(0, 80), ok: true, note: 'already exists – skipped' });
          } else {
            results.push({ sql: trimmed.slice(0, 80), ok: false, error: err.message });
          }
        }
      }
    }

    await conn.end();
    const failed = (results || []).filter(r => !r.ok);
    return { db: dbName, success: failed.length === 0, results, failCount: failed.length };
  } catch (connErr) {
    if (conn) await conn.end().catch(() => {});
    return { db: dbName, success: false, results: [], error: connErr.message };
  }
}

/**
 * Execute an array of raw SQL statements on a given database (for /run-sql).
 */
async function runSqlOnDb(dbName, statements) {
  return runMigrationOnDb(dbName, statements);
}

/**
 * Get all tenant DB names from system_db
 */
async function getAllTenantDbs() {
  const base = parseDbUrl(process.env.SYSTEM_DATABASE_URL || process.env.DATABASE_URL);
  const conn = await mysql.createConnection({
    host: base.host,
    port: base.port,
    user: base.user,
    password: base.password,
    database: 'system_db',
  });
  const [rows] = await conn.execute(
    'SELECT id, name, tenant_db FROM companies WHERE tenant_db IS NOT NULL AND status != "deleted"'
  );
  await conn.end();
  return rows;
}

// ── Secret key middleware ─────────────────────────────────────────────────────
function requireMaintenanceKey(req, res, next) {
  const secret = (process.env.MAINTENANCE_SECRET || '').replace(/^"|"$/g, '');
  const provided = req.headers['x-maintenance-key'] || req.query.key;

  if (!secret) {
    return res.status(500).json({ success: false, message: 'MAINTENANCE_SECRET not configured in .env' });
  }
  if (!provided || provided !== secret) {
    return res.status(401).json({ success: false, message: 'Invalid or missing maintenance key' });
  }
  next();
}

// Apply key check to all routes in this router
router.use(requireMaintenanceKey);

// ── Routes ────────────────────────────────────────────────────────────────────

/**
 * GET /maintenance/ping
 * Health check – confirms the key works.
 */
router.get('/ping', (req, res) => {
  res.json({
    success: true,
    message: 'Maintenance access granted',
    timestamp: new Date().toISOString(),
    available_migrations: Object.keys(MIGRATIONS),
  });
});

/**
 * GET /maintenance/tenants
 * List all tenant databases registered in system_db.
 */
router.get('/tenants', async (req, res) => {
  try {
    const tenants = await getAllTenantDbs();
    res.json({ success: true, data: tenants });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /maintenance/run
 * Run a named migration (from the MIGRATIONS catalogue) on all tenants.
 *
 * Body: { "migration": "<name>", "target": "tenants" | "system" | "all" }
 */
router.post('/run', async (req, res) => {
  const { migration, target = 'tenants' } = req.body;

  if (!migration) {
    return res.status(400).json({
      success: false,
      message: 'Body must include "migration" field',
      available: Object.keys(MIGRATIONS),
    });
  }

  const statements = MIGRATIONS[migration];
  if (!statements) {
    return res.status(400).json({
      success: false,
      message: `Unknown migration: "${migration}"`,
      available: Object.keys(MIGRATIONS),
    });
  }

  const report = [];

  try {
    // Run on tenant DBs
    if (target === 'tenants' || target === 'all') {
      const tenants = await getAllTenantDbs();
      for (const t of tenants) {
        const result = await runMigrationOnDb(t.tenant_db, statements);
        report.push({ company: t.name, ...result });
      }
    }

    // Run on system_db
    if (target === 'system' || target === 'all') {
      const base = parseDbUrl(process.env.SYSTEM_DATABASE_URL || process.env.DATABASE_URL);
      const result = await runMigrationOnDb(base.database, statements);
      report.push({ company: 'SYSTEM_DB', ...result });
    }

    const allOk = report.every(r => r.success);
    res.json({
      success: allOk,
      migration,
      target,
      databases_processed: report.length,
      report,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message, report });
  }
});

/**
 * POST /maintenance/run-sql
 * Run arbitrary SQL statement(s) on chosen databases.
 *
 * Body: {
 *   "sql": "ALTER TABLE ..." | ["stmt1", "stmt2"],
 *   "target": "tenants" | "system" | "all"   (default: "tenants")
 * }
 */
router.post('/run-sql', async (req, res) => {
  let { sql, target = 'tenants' } = req.body;

  if (!sql) {
    return res.status(400).json({ success: false, message: 'Body must include "sql" field (string or array of strings)' });
  }

  const statements = Array.isArray(sql) ? sql : [sql];
  const report = [];

  try {
    if (target === 'tenants' || target === 'all') {
      const tenants = await getAllTenantDbs();
      for (const t of tenants) {
        const result = await runSqlOnDb(t.tenant_db, statements);
        report.push({ company: t.name, ...result });
      }
    }

    if (target === 'system' || target === 'all') {
      const base = parseDbUrl(process.env.SYSTEM_DATABASE_URL || process.env.DATABASE_URL);
      const result = await runSqlOnDb(base.database, statements);
      report.push({ company: 'SYSTEM_DB', ...result });
    }

    const allOk = report.every(r => r.success);
    res.json({
      success: allOk,
      target,
      databases_processed: report.length,
      report,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message, report });
  }
});

module.exports = router;
