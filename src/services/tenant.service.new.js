/**
 * Tenant Service
 * Handles tenant database provisioning, schema migration, and seeding
 */

const path = require('node:path');
const { spawn } = require('node:child_process');
const mysql = require('mysql2/promise');
const { 
  parseMysqlUrl, 
  buildTenantDatabaseUrl,
  getTenantPrisma 
} = require('../config/database');
const { systemPrisma } = require('../config/database');

/**
 * Run shell command as promise
 */
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
  /**
   * Create a new tenant database
   * @param {string} dbName - Database name
   * @returns {string} Tenant database URL
   */
  async createTenantDatabase(dbName) {
    const masterUrl = process.env.DATABASE_URL || process.env.SYSTEM_DATABASE_URL;
    const parts = parseMysqlUrl(masterUrl);

    // Connect to MySQL server without selecting database
    const conn = await mysql.createConnection({
      host: parts.host,
      port: parts.port,
      user: parts.username,
      password: parts.password,
      multipleStatements: false
    });

    try {
      await conn.execute(
        `CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
      );
      console.log(`✅ Created tenant database: ${dbName}`);
    } finally {
      await conn.end();
    }

    return buildTenantDatabaseUrl(masterUrl, dbName);
  }

  /**
   * Apply schema to tenant database using Prisma
   * @param {string} tenantUrl - Tenant database URL
   */
  async applySchemaToTenant(tenantUrl) {
    const prismaBin = path.resolve(__dirname, '../../node_modules/.bin/prisma');
    const schemaPath = path.resolve(__dirname, '../../prisma/schema.tenant.prisma');

    console.log(`📦 Applying schema to tenant database...`);
    
    await runCommand(prismaBin, ['db', 'push', '--schema', schemaPath, '--skip-generate'], {
      env: { ...process.env, DATABASE_URL: tenantUrl }
    });

    console.log(`✅ Schema applied successfully`);
  }

  /**
   * Seed initial data for new tenant
   * @param {string} dbName - Tenant database name
   * @param {object} ownerData - Owner user data
   */
  async seedNewTenant(dbName, ownerData) {
    const tenantPrisma = getTenantPrisma(dbName);

    console.log(`🌱 Seeding tenant database...`);

    // Create main branch
    const branch = await tenantPrisma.branch.create({
      data: {
        name: 'Main Branch',
        code: `MB-${String(ownerData.id).padStart(4, '0')}`,
        email: ownerData.email,
        phone: ownerData.phone,
        isActive: true,
        isMain: true,
        settings: {
          currency: 'PKR',
          currency_symbol: 'Rs.',
          tax_rate: 16,
          tax_type: 'exclusive',
          receipt_header: 'Welcome!',
          receipt_footer: 'Thank you for your visit!',
          order_prefix: 'ORD',
          invoice_prefix: 'INV'
        }
      }
    });

    // Create owner as branch user
    await tenantPrisma.branchUser.create({
      data: {
        branchId: branch.id,
        systemUserId: ownerData.id,
        roleId: 1, // Will be set to owner role ID from system DB
        name: ownerData.name,
        email: ownerData.email,
        phone: ownerData.phone,
        isActive: true
      }
    });

    // Create default chart of accounts
    await this.createDefaultAccounts(tenantPrisma, branch.id);

    // Create default tax settings
    await tenantPrisma.taxSetting.createMany({
      data: [
        { branchId: branch.id, name: 'GST 16%', rate: 16.00, type: 'exclusive', isDefault: true },
        { branchId: branch.id, name: 'GST 17%', rate: 17.00, type: 'exclusive', isDefault: false },
        { branchId: branch.id, name: 'No Tax', rate: 0.00, type: 'exclusive', isDefault: false }
      ]
    });

    // Create default discount settings
    await tenantPrisma.discountSetting.createMany({
      data: [
        { branchId: branch.id, name: '5% Discount', type: 'percentage', value: 5 },
        { branchId: branch.id, name: '10% Discount', type: 'percentage', value: 10 },
        { branchId: branch.id, name: 'Rs. 100 Off', type: 'fixed', value: 100 }
      ]
    });

    console.log(`✅ Tenant seeded with branch: ${branch.name}`);

    return { branch };
  }

  /**
   * Create default chart of accounts
   */
  async createDefaultAccounts(tenantPrisma, branchId) {
    const accounts = [
      // Assets
      { code: '1000', name: 'Assets', type: 'asset', level: 1, isSystem: true },
      { code: '1100', name: 'Cash', type: 'asset', level: 2, parentCode: '1000', isSystem: true },
      { code: '1101', name: 'Cash in Hand', type: 'asset', level: 3, parentCode: '1100' },
      { code: '1102', name: 'Cash at Bank', type: 'asset', level: 3, parentCode: '1100' },
      { code: '1200', name: 'Accounts Receivable', type: 'asset', level: 2, parentCode: '1000' },
      { code: '1300', name: 'Inventory', type: 'asset', level: 2, parentCode: '1000', isSystem: true },

      // Liabilities
      { code: '2000', name: 'Liabilities', type: 'liability', level: 1, isSystem: true },
      { code: '2100', name: 'Accounts Payable', type: 'liability', level: 2, parentCode: '2000' },
      { code: '2200', name: 'Tax Payable', type: 'liability', level: 2, parentCode: '2000', isSystem: true },

      // Equity
      { code: '3000', name: 'Equity', type: 'equity', level: 1, isSystem: true },
      { code: '3100', name: 'Owner\'s Capital', type: 'equity', level: 2, parentCode: '3000' },
      { code: '3200', name: 'Retained Earnings', type: 'equity', level: 2, parentCode: '3000' },

      // Revenue
      { code: '4000', name: 'Revenue', type: 'revenue', level: 1, isSystem: true },
      { code: '4100', name: 'Sales Revenue', type: 'revenue', level: 2, parentCode: '4000', isSystem: true },
      { code: '4200', name: 'Service Revenue', type: 'revenue', level: 2, parentCode: '4000' },

      // Expenses
      { code: '5000', name: 'Expenses', type: 'expense', level: 1, isSystem: true },
      { code: '5100', name: 'Cost of Goods Sold', type: 'expense', level: 2, parentCode: '5000', isSystem: true },
      { code: '5200', name: 'Operating Expenses', type: 'expense', level: 2, parentCode: '5000' },
      { code: '5201', name: 'Rent Expense', type: 'expense', level: 3, parentCode: '5200' },
      { code: '5202', name: 'Utilities Expense', type: 'expense', level: 3, parentCode: '5200' },
      { code: '5203', name: 'Salary Expense', type: 'expense', level: 3, parentCode: '5200' }
    ];

    // Create accounts without parent first, then update parent relationships
    const createdAccounts = {};
    
    for (const acc of accounts.filter(a => !a.parentCode)) {
      const created = await tenantPrisma.account.create({
        data: {
          branchId,
          code: acc.code,
          name: acc.name,
          type: acc.type,
          level: acc.level,
          isSystem: acc.isSystem || false,
          isActive: true
        }
      });
      createdAccounts[acc.code] = created.id;
    }

    // Create accounts with parents
    for (const acc of accounts.filter(a => a.parentCode)) {
      const created = await tenantPrisma.account.create({
        data: {
          branchId,
          code: acc.code,
          name: acc.name,
          type: acc.type,
          level: acc.level,
          parentId: createdAccounts[acc.parentCode],
          isSystem: acc.isSystem || false,
          isActive: true
        }
      });
      createdAccounts[acc.code] = created.id;
    }
  }

  /**
   * Full tenant provisioning
   * @param {number} companyId - Company ID
   * @param {string} dbName - Database name
   * @param {object} ownerData - Owner user data
   */
  async provisionTenantForCompany(companyId, dbName, ownerData) {
    console.log(`\n🏗️ Provisioning tenant for company ${companyId}...`);

    // 1. Create database
    const tenantUrl = await this.createTenantDatabase(dbName);

    // 2. Apply schema
    await this.applySchemaToTenant(tenantUrl);

    // 3. Create default roles for this company in system DB
    await this.createDefaultRolesForCompany(companyId);

    // 4. Seed initial data
    const { branch } = await this.seedNewTenant(dbName, ownerData);

    console.log(`✅ Tenant provisioning complete for company ${companyId}\n`);

    return { dbName, branch };
  }

  /**
   * Create default roles for a company
   * @param {number} companyId - Company ID
   */
  async createDefaultRolesForCompany(companyId) {
    // Get all menus
    const menus = await systemPrisma.systemMenu.findMany({
      where: { isActive: true }
    });

    const menuIds = menus.map(m => m.id);

    // Define default roles
    const defaultRoles = [
      {
        name: 'Owner',
        code: 'owner',
        description: 'Full access to all features',
        isSystem: true,
        permissions: { view: true, create: true, update: true, delete: true, export: true, print: true }
      },
      {
        name: 'Manager',
        code: 'manager',
        description: 'Manage daily operations',
        isSystem: true,
        permissions: { view: true, create: true, update: true, delete: false, export: true, print: true }
      },
      {
        name: 'Cashier',
        code: 'cashier',
        description: 'POS and order management',
        isSystem: true,
        permissions: { view: true, create: true, update: false, delete: false, export: false, print: true },
        allowedMenus: ['pos', 'orders', 'customers', 'products']
      },
      {
        name: 'Kitchen',
        code: 'kitchen',
        description: 'View and manage kitchen orders',
        isSystem: true,
        permissions: { view: true, create: false, update: true, delete: false, export: false, print: true },
        allowedMenus: ['orders', 'products']
      },
      {
        name: 'Receptionist',
        code: 'receptionist',
        description: 'Customer and table management',
        isSystem: true,
        permissions: { view: true, create: true, update: true, delete: false, export: false, print: false },
        allowedMenus: ['customers', 'tables', 'reservations']
      }
    ];

    for (const roleDef of defaultRoles) {
      // Create role
      const role = await systemPrisma.role.create({
        data: {
          companyId,
          name: roleDef.name,
          code: roleDef.code,
          description: roleDef.description,
          isSystem: roleDef.isSystem
        }
      });

      // Create permissions for this role
      const permissionsData = [];
      
      for (const menu of menus) {
        // Check if this menu is allowed for this role
        const isAllowed = !roleDef.allowedMenus || 
          roleDef.allowedMenus.some(code => menu.code.startsWith(code));

        if (isAllowed || roleDef.code === 'owner' || roleDef.code === 'manager') {
          permissionsData.push({
            roleId: role.id,
            menuId: menu.id,
            canView: roleDef.permissions.view,
            canCreate: roleDef.permissions.create,
            canUpdate: roleDef.permissions.update,
            canDelete: roleDef.permissions.delete,
            canExport: roleDef.permissions.export,
            canPrint: roleDef.permissions.print
          });
        }
      }

      if (permissionsData.length > 0) {
        await systemPrisma.rolePermission.createMany({
          data: permissionsData
        });
      }
    }

    console.log(`✅ Created default roles for company ${companyId}`);
  }

  /**
   * Delete tenant database (for cleanup/testing)
   * @param {string} dbName - Database name
   */
  async deleteTenantDatabase(dbName) {
    const masterUrl = process.env.DATABASE_URL || process.env.SYSTEM_DATABASE_URL;
    const parts = parseMysqlUrl(masterUrl);

    const conn = await mysql.createConnection({
      host: parts.host,
      port: parts.port,
      user: parts.username,
      password: parts.password,
      multipleStatements: false
    });

    try {
      await conn.execute(`DROP DATABASE IF EXISTS \`${dbName}\``);
      console.log(`🗑️ Deleted tenant database: ${dbName}`);
    } finally {
      await conn.end();
    }
  }
}

module.exports = new TenantService();
