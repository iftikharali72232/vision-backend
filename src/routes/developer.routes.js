/**
 * Developer Panel API Routes
 * ─────────────────────────────────────────────────────────────────────────────
 * All routes require a valid JWT issued to a developer user (is_developer = 1).
 * Login via the normal POST /api/auth/login with dev@vision.pos credentials.
 *
 * Base path: /dev-api
 *
 * Routes:
 *   GET  /dev-api/stats              — system overview stats
 *   GET  /dev-api/companies          — list all companies
 *   POST /dev-api/companies/:id/status — update company status
 *   POST /dev-api/companies/:id/subscription — update subscription / trial
 *   GET  /dev-api/users              — list all system users
 *   POST /dev-api/users/:id/status   — activate / deactivate user
 *   POST /dev-api/users/:id/password — reset user password
 *   DELETE /dev-api/users/:id        — delete system user
 *   GET  /dev-api/maintenance/migrations — list available migrations
 *   POST /dev-api/maintenance/run    — run named migration
 *   POST /dev-api/maintenance/run-sql — run custom SQL
 *   GET  /dev-api/maintenance/tenants — list all tenant dbs
 */

const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');

// ── DB helpers ───────────────────────────────────────────────────────────────
function parseDbUrl(url) {
  const m = (url || '').match(/mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/([^?]+)/);
  if (!m) throw new Error('Cannot parse DB URL');
  return { user: m[1], password: decodeURIComponent(m[2]), host: m[3], port: +m[4], database: m[5] };
}

async function sysConn() {
  const c = parseDbUrl(process.env.SYSTEM_DATABASE_URL || process.env.DATABASE_URL);
  return mysql.createConnection({ ...c, database: 'system_db' });
}

async function tenantConn(dbName) {
  const c = parseDbUrl(process.env.DATABASE_URL || process.env.SYSTEM_DATABASE_URL);
  return mysql.createConnection({ ...c, database: dbName });
}

// ── Maintenance migrations (shared with maintenance.routes.js) ───────────────
const MIGRATIONS = {
  make_user_id_nullable: async (conn, dbName) => {
    const steps = [];
    async function exec(label, sql) {
      try {
        await conn.execute(sql);
        steps.push({ label, ok: true });
      } catch (err) {
        const ignorable = ['ER_DUP_KEYNAME','ER_FK_DUP_NAME','ER_CANT_DROP_FIELD_OR_KEY','ER_ERROR_ON_DROP','ER_DROP_INDEX_FK'];
        if (ignorable.includes(err.code) || /duplicate key name|can't drop|doesn't exist/i.test(err.message||'')) {
          steps.push({ label, ok: true, note: 'already done' });
        } else { steps.push({ label, ok: false, error: err.message }); throw err; }
      }
    }
    for (const tbl of ['orders','held_orders','inventory_movements']) {
      const [rows] = await conn.execute(
        `SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA=? AND TABLE_NAME=? AND COLUMN_NAME='user_id' AND REFERENCED_TABLE_NAME IS NOT NULL LIMIT 1`,
        [dbName, tbl]
      );
      if (rows.length) await exec(`drop FK on ${tbl}`, `ALTER TABLE \`${tbl}\` DROP FOREIGN KEY \`${rows[0].CONSTRAINT_NAME}\``);
      else steps.push({ label: `drop FK on ${tbl}`, ok: true, note: 'no FK' });
    }
    for (const tbl of ['orders','held_orders','inventory_movements'])
      await exec(`nullable user_id on ${tbl}`, `ALTER TABLE \`${tbl}\` MODIFY \`user_id\` INTEGER NULL`);
    const [bu] = await conn.execute(`SELECT COUNT(*) AS cnt FROM information_schema.TABLES WHERE TABLE_SCHEMA=? AND TABLE_NAME='branch_users'`,[dbName]);
    if (bu[0].cnt > 0) {
      const fks = { orders:'orders_user_id_fkey', held_orders:'held_orders_user_id_fkey', inventory_movements:'inventory_movements_user_id_fkey' };
      for (const [tbl,fkName] of Object.entries(fks))
        await exec(`add FK ${fkName}`, `ALTER TABLE \`${tbl}\` ADD CONSTRAINT \`${fkName}\` FOREIGN KEY (\`user_id\`) REFERENCES \`branch_users\`(\`id\`) ON DELETE SET NULL ON UPDATE CASCADE`);
    }
    return steps;
  },
};

// ── Auth middleware ───────────────────────────────────────────────────────────
async function requireDeveloper(req, res, next) {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) return res.status(401).json({ success: false, message: 'No token provided' });

    const secret = process.env.JWT_SECRET || 'secret';
    const payload = jwt.verify(token, secret);
    if (!payload.isDeveloper) return res.status(403).json({ success: false, message: 'Developer access required' });

    req.devUser = payload;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
}

router.use(requireDeveloper);

// ── GET /dev-api/stats ────────────────────────────────────────────────────────
router.get('/stats', async (req, res) => {
  let conn;
  try {
    conn = await sysConn();
    const [[{ totalCompanies }]] = await conn.execute('SELECT COUNT(*) AS totalCompanies FROM companies');
    const [[{ activeCompanies }]] = await conn.execute("SELECT COUNT(*) AS activeCompanies FROM companies WHERE status='active'");
    const [[{ trialCompanies }]] = await conn.execute("SELECT COUNT(*) AS trialCompanies FROM companies WHERE status='trial'");
    const [[{ suspendedCompanies }]] = await conn.execute("SELECT COUNT(*) AS suspendedCompanies FROM companies WHERE status='suspended'");
    const [[{ totalUsers }]] = await conn.execute('SELECT COUNT(*) AS totalUsers FROM system_users WHERE is_developer=0');
    const [[{ activeUsers }]] = await conn.execute("SELECT COUNT(*) AS activeUsers FROM system_users WHERE status='active' AND is_developer=0");
    const [[{ masterUsers }]] = await conn.execute('SELECT COUNT(*) AS masterUsers FROM system_users WHERE is_master=1 AND is_developer=0');
    await conn.end();
    res.json({ success: true, data: {
      companies: { total: totalCompanies, active: activeCompanies, trial: trialCompanies, suspended: suspendedCompanies },
      users: { total: totalUsers, active: activeUsers, masters: masterUsers },
    }});
  } catch (err) {
    if (conn) await conn.end().catch(()=>{});
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── GET /dev-api/companies ────────────────────────────────────────────────────
router.get('/companies', async (req, res) => {
  let conn;
  try {
    conn = await sysConn();
    const [rows] = await conn.execute(`
      SELECT c.id, c.name, c.slug, c.email, c.phone, c.tenant_db, c.status,
             c.subscription_ends_at, c.subscription_id, c.created_at,
             COUNT(u.id) AS user_count
      FROM companies c
      LEFT JOIN system_users u ON u.company_id = c.id AND u.is_developer=0
      GROUP BY c.id
      ORDER BY c.created_at DESC
    `);
    await conn.end();
    res.json({ success: true, data: rows });
  } catch (err) {
    if (conn) await conn.end().catch(()=>{});
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── POST /dev-api/companies/:id/status ───────────────────────────────────────
router.post('/companies/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body; // active | inactive | suspended | trial
  const allowed = ['active','inactive','suspended','trial'];
  if (!allowed.includes(status)) return res.status(400).json({ success: false, message: `Status must be one of: ${allowed.join(', ')}` });
  let conn;
  try {
    conn = await sysConn();
    await conn.execute('UPDATE companies SET status=?, updated_at=NOW() WHERE id=?', [status, id]);
    const [[company]] = await conn.execute('SELECT id,name,status FROM companies WHERE id=?', [id]);
    await conn.end();
    res.json({ success: true, message: `Company status updated to ${status}`, data: company });
  } catch (err) {
    if (conn) await conn.end().catch(()=>{});
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── POST /dev-api/companies/:id/subscription ─────────────────────────────────
router.post('/companies/:id/subscription', async (req, res) => {
  const { id } = req.params;
  const { subscription_id, subscription_ends_at, status } = req.body;
  let conn;
  try {
    conn = await sysConn();
    const updates = [];
    const vals = [];
    if (subscription_id !== undefined) { updates.push('subscription_id=?'); vals.push(subscription_id); }
    if (subscription_ends_at !== undefined) { updates.push('subscription_ends_at=?'); vals.push(subscription_ends_at || null); }
    if (status !== undefined) { updates.push('status=?'); vals.push(status); }
    if (!updates.length) return res.status(400).json({ success: false, message: 'Nothing to update' });
    updates.push('updated_at=NOW()');
    vals.push(id);
    await conn.execute(`UPDATE companies SET ${updates.join(',')} WHERE id=?`, vals);
    const [[company]] = await conn.execute('SELECT id,name,status,subscription_id,subscription_ends_at FROM companies WHERE id=?', [id]);
    await conn.end();
    res.json({ success: true, message: 'Subscription updated', data: company });
  } catch (err) {
    if (conn) await conn.end().catch(()=>{});
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── GET /dev-api/subscription-history ─────────────────────────────────────────
router.get('/subscription-history', async (req, res) => {
  let conn;
  try {
    conn = await sysConn();
    const [rows] = await conn.execute(`
      SELECT 
        h.id, h.company_id, h.plan_id, h.amount, h.currency, h.period, 
        h.payment_method, h.status, h.renewed_at, h.expires_at, h.notes,
        c.name AS company_name,
        p.name AS plan_name, p.code AS plan_code
      FROM subscription_history h
      LEFT JOIN companies c ON c.id = h.company_id
      LEFT JOIN subscription_plans p ON p.id = h.plan_id
      ORDER BY h.renewed_at DESC
    `);
    await conn.end();
    res.json({ success: true, data: rows });
  } catch (err) {
    if (conn) await conn.end().catch(()=>{});
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── GET /dev-api/users ────────────────────────────────────────────────────────
router.get('/users', async (req, res) => {
  let conn;
  try {
    conn = await sysConn();
    const [rows] = await conn.execute(`
      SELECT u.id, u.email, u.name, u.phone, u.status, u.is_master,
             u.is_developer, u.last_login_at, u.created_at,
             c.name AS company_name, c.id AS company_id, c.tenant_db
      FROM system_users u
      LEFT JOIN companies c ON c.id = u.company_id
      ORDER BY u.created_at DESC
    `);
    await conn.end();
    res.json({ success: true, data: rows });
  } catch (err) {
    if (conn) await conn.end().catch(()=>{});
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── POST /dev-api/users/:id/status ───────────────────────────────────────────
router.post('/users/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body; // active | inactive | suspended
  const allowed = ['active','inactive','suspended'];
  if (!allowed.includes(status)) return res.status(400).json({ success: false, message: `Status must be one of: ${allowed.join(', ')}` });
  let conn;
  try {
    conn = await sysConn();
    await conn.execute('UPDATE system_users SET status=?, updated_at=NOW() WHERE id=?', [status, id]);
    const [[user]] = await conn.execute('SELECT id,email,name,status FROM system_users WHERE id=?', [id]);
    await conn.end();
    res.json({ success: true, message: `User status updated to ${status}`, data: user });
  } catch (err) {
    if (conn) await conn.end().catch(()=>{});
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── POST /dev-api/users/:id/password ─────────────────────────────────────────
router.post('/users/:id/password', async (req, res) => {
  const { id } = req.params;
  const { password } = req.body;
  if (!password || password.length < 6) return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
  let conn;
  try {
    const hashed = await bcrypt.hash(password, 12);
    conn = await sysConn();
    await conn.execute('UPDATE system_users SET password=?, updated_at=NOW() WHERE id=?', [hashed, id]);
    await conn.end();
    res.json({ success: true, message: 'Password updated successfully' });
  } catch (err) {
    if (conn) await conn.end().catch(()=>{});
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── DELETE /dev-api/users/:id ─────────────────────────────────────────────────
router.delete('/users/:id', async (req, res) => {
  const { id } = req.params;
  if (+id === req.devUser.userId) return res.status(400).json({ success: false, message: 'Cannot delete yourself' });
  let conn;
  try {
    conn = await sysConn();
    const [[user]] = await conn.execute('SELECT id,email,name,is_developer FROM system_users WHERE id=?', [id]);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (user.is_developer) return res.status(400).json({ success: false, message: 'Cannot delete developer accounts' });
    await conn.execute('DELETE FROM system_users WHERE id=?', [id]);
    await conn.end();
    res.json({ success: true, message: `User ${user.email} deleted` });
  } catch (err) {
    if (conn) await conn.end().catch(()=>{});
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── GET /dev-api/maintenance/migrations ──────────────────────────────────────
router.get('/maintenance/migrations', (req, res) => {
  res.json({ success: true, migrations: Object.keys(MIGRATIONS) });
});

// ── GET /dev-api/maintenance/tenants ─────────────────────────────────────────
router.get('/maintenance/tenants', async (req, res) => {
  let conn;
  try {
    conn = await sysConn();
    const [rows] = await conn.execute("SELECT id,name,tenant_db,status FROM companies WHERE tenant_db IS NOT NULL AND status!='deleted'");
    await conn.end();
    res.json({ success: true, data: rows });
  } catch (err) {
    if (conn) await conn.end().catch(()=>{});
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── POST /dev-api/maintenance/run ─────────────────────────────────────────────
router.post('/maintenance/run', async (req, res) => {
  const { migration, target = 'tenants', db } = req.body;
  if (!migration || !MIGRATIONS[migration])
    return res.status(400).json({ success: false, message: `Unknown migration. Available: ${Object.keys(MIGRATIONS).join(', ')}` });

  const report = [];
  let sysCon;
  try {
    sysCon = await sysConn();
    let tenants = [];
    if (target === 'tenants' || target === 'all') {
      const [rows] = await sysCon.execute("SELECT id,name,tenant_db FROM companies WHERE tenant_db IS NOT NULL AND status!='deleted'");
      tenants = rows;
    }
    if (db) tenants = [{ name: db, tenant_db: db }];
    await sysCon.end();

    for (const t of tenants) {
      let tc;
      try {
        tc = await tenantConn(t.tenant_db);
        const steps = await MIGRATIONS[migration](tc, t.tenant_db);
        await tc.end();
        const failed = steps.filter(s => !s.ok);
        report.push({ company: t.name, db: t.tenant_db, success: !failed.length, steps, failCount: failed.length });
      } catch (err) {
        if (tc) await tc.end().catch(()=>{});
        report.push({ company: t.name, db: t.tenant_db, success: false, error: err.message });
      }
    }
    const allOk = report.every(r => r.success);
    res.json({ success: allOk, migration, databases_processed: report.length, report });
  } catch (err) {
    if (sysCon) await sysCon.end().catch(()=>{});
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── POST /dev-api/maintenance/run-sql ────────────────────────────────────────
router.post('/maintenance/run-sql', async (req, res) => {
  const { sql, target = 'tenants', db } = req.body;
  if (!sql) return res.status(400).json({ success: false, message: 'sql is required' });

  const statements = Array.isArray(sql) ? sql : [sql];
  const report = [];
  let sysCon;
  try {
    sysCon = await sysConn();
    let tenants = [];
    if (target === 'tenants' || target === 'all') {
      const [rows] = await sysCon.execute("SELECT id,name,tenant_db FROM companies WHERE tenant_db IS NOT NULL AND status!='deleted'");
      tenants = rows;
    }
    if (db) tenants = [{ name: db, tenant_db: db }];
    await sysCon.end();

    for (const t of tenants) {
      let tc;
      const steps = [];
      try {
        tc = await tenantConn(t.tenant_db);
        for (const stmt of statements) {
          try {
            await tc.execute(stmt);
            steps.push({ sql: stmt.slice(0,80), ok: true });
          } catch (err) {
            steps.push({ sql: stmt.slice(0,80), ok: false, error: err.message });
          }
        }
        await tc.end();
        report.push({ company: t.name, db: t.tenant_db, success: steps.every(s=>s.ok), steps });
      } catch (err) {
        if (tc) await tc.end().catch(()=>{});
        report.push({ company: t.name, db: t.tenant_db, success: false, error: err.message });
      }
    }
    res.json({ success: report.every(r=>r.success), databases_processed: report.length, report });
  } catch (err) {
    if (sysCon) await sysCon.end().catch(()=>{});
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
