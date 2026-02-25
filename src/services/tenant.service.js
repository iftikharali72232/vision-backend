const path = require('node:path');
const { spawn } = require('node:child_process');
const mysql = require('mysql2/promise');
const { buildTenantDbName, parseMysqlUrl, buildTenantDatabaseUrl } = require('../utils/mysqlUrl');
const { getTenantPrisma, systemPrisma } = require('../config/database');

function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: 'pipe', ...options });
    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (d) => { stdout += d.toString(); });
    child.stderr.on('data', (d) => { stderr += d.toString(); });

    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) return resolve({ stdout, stderr });
      reject(new Error(`Command failed: ${command} ${args.join(' ')}\n${stderr || stdout}`));
    });
  });
}

class TenantService {
  async createTenantDatabase(masterDatabaseUrl, dbName) {
    const parts = parseMysqlUrl(masterDatabaseUrl);

    // Connect without selecting a database
    const conn = await mysql.createConnection({
      host: parts.host,
      port: parts.port,
      user: parts.username,
      password: parts.password,
      multipleStatements: false
    });

    try {
      await conn.execute(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    } finally {
      await conn.end();
    }

    return buildTenantDatabaseUrl(masterDatabaseUrl, dbName);
  }

  async applySchemaToTenant(tenantDatabaseUrl) {
    const prismaBin = path.resolve(__dirname, '../../node_modules/.bin/prisma');
    const schemaPath = path.resolve(__dirname, '../../prisma/schema.tenant.prisma');

    await runCommand(prismaBin, ['db', 'push', '--schema', schemaPath], {
      env: { ...process.env, DATABASE_URL: tenantDatabaseUrl }
    });
  }

  async ensureCompanyOwnerRole(companyId) {
    if (!companyId) {
      throw new Error('companyId is required to ensure owner role');
    }

    return systemPrisma.role.upsert({
      where: {
        companyId_code: {
          companyId: Number(companyId),
          code: 'owner'
        }
      },
      update: {
        isActive: true
      },
      create: {
        companyId: Number(companyId),
        name: 'Owner',
        code: 'owner',
        description: 'Company owner (default role)',
        isSystem: true,
        isActive: true
      }
    });
  }

  async seedNewTenant({ dbName, companyId, ownerUser }) {
    const tenantPrisma = getTenantPrisma(dbName);

    // Tenant schema uses Branch + BranchUser (not User)
    if (!tenantPrisma?.branch || !tenantPrisma?.branchUser) {
      throw new Error('Tenant Prisma client does not expose Branch/BranchUser models. Check schema.tenant.prisma client generation/output.');
    }

    const role = await this.ensureCompanyOwnerRole(companyId);

    const code = `MB${String(companyId).padStart(4, '0')}`;

    const branch = await tenantPrisma.branch.upsert({
      where: { code },
      update: {
        name: 'Main Branch',
        address: null,
        city: null,
        phone: ownerUser.phone || null,
        email: ownerUser.email,
        isActive: true,
        isMain: true,
        settings: {
          tax_rate: 16,
          tax_type: 'exclusive',
          receipt_header: 'Main Branch',
          receipt_footer: 'Thank you!'
        }
      },
      create: {
        name: 'Main Branch',
        code,
        address: null,
        city: null,
        phone: ownerUser.phone || null,
        email: ownerUser.email,
        isActive: true,
        isMain: true,
        settings: {
          tax_rate: 16,
          tax_type: 'exclusive',
          receipt_header: 'Main Branch',
          receipt_footer: 'Thank you!'
        }
      }
    });

    await tenantPrisma.branchUser.upsert({
      where: {
        branchId_systemUserId: {
          branchId: branch.id,
          systemUserId: ownerUser.id
        }
      },
      update: {
        roleId: role.id,
        name: ownerUser.name || 'Owner',
        email: ownerUser.email,
        phone: ownerUser.phone || null,
        avatar: ownerUser.avatar || null,
        isActive: true
      },
      create: {
        branchId: branch.id,
        systemUserId: ownerUser.id,
        roleId: role.id,
        name: ownerUser.name || 'Owner',
        email: ownerUser.email,
        phone: ownerUser.phone || null,
        avatar: ownerUser.avatar || null,
        pin: null,
        isActive: true
      }
    });

    return { branch };
  }

  async provisionTenantForUser(masterUser) {
    const masterDatabaseUrl = process.env.DATABASE_URL;
    if (!masterDatabaseUrl) {
      throw new Error('DATABASE_URL is required');
    }

    const dbName = buildTenantDbName(masterUser.id);
    const tenantUrl = await this.createTenantDatabase(masterDatabaseUrl, dbName);
    await this.applySchemaToTenant(tenantUrl);
    await this.seedNewTenant({ dbName, companyId: masterUser.companyId || masterUser.id, ownerUser: masterUser });

    return { dbName, dbUrl: tenantUrl };
  }

  async provisionTenantForCompany(companyId, dbName, ownerUser) {
    const masterDatabaseUrl = process.env.DATABASE_URL;
    if (!masterDatabaseUrl) {
      throw new Error('DATABASE_URL is required');
    }

    const tenantUrl = await this.createTenantDatabase(masterDatabaseUrl, dbName);
    await this.applySchemaToTenant(tenantUrl);
    await this.seedNewTenant({ dbName, companyId, ownerUser });

    return { dbName, dbUrl: tenantUrl };
  }
}

module.exports = new TenantService();
