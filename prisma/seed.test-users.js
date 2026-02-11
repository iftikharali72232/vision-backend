/**
 * Test Users Seed
 * Creates test users with different roles: Manager, Kitchen, Cashier, Receptionist
 * Run with: node prisma/seed.test-users.js
 */

const { PrismaClient: SystemPrismaClient } = require('.prisma/system-client');
const { getTenantPrisma } = require('../src/config/database');
const bcrypt = require('bcryptjs');

// Load .env file
require('dotenv').config();

const systemPrisma = new SystemPrismaClient();

// Test users configuration
const testUsers = [
  {
    email: 'manager@demo.com',
    password: 'manager123',
    name: 'Manager User',
    phone: '+1234567891',
    role: {
      name: 'Manager',
      code: 'manager',
      description: 'Branch manager with full operational access',
      permissions: {
        dashboard: { view: true },
        pos: { view: true, create: true, update: true },
        orders: { view: true, create: true, update: true, delete: true, export: true, print: true },
        products: { view: true, create: true, update: true },
        customers: { view: true, create: true, update: true },
        inventory: { view: true, create: true, update: true },
        reports: { view: true, export: true, print: true },
        settings: { view: true },
        users: { view: true },
        tables: { view: true, create: true, update: true }
      }
    }
  },
  {
    email: 'kitchen@demo.com',
    password: 'kitchen123',
    name: 'Kitchen Staff',
    phone: '+1234567892',
    role: {
      name: 'Kitchen',
      code: 'kitchen',
      description: 'Kitchen staff - can view orders and mark as ready',
      permissions: {
        dashboard: { view: true },
        orders: { view: true, update: true },
        products: { view: true }
      }
    }
  },
  {
    email: 'cashier@demo.com',
    password: 'cashier123',
    name: 'Cashier User',
    phone: '+1234567893',
    role: {
      name: 'Cashier',
      code: 'cashier',
      description: 'Cashier - POS and order management',
      permissions: {
        pos: { view: true, create: true, update: true },
        orders: { view: true, create: true, update: true, print: true },
        products: { view: true },
        customers: { view: true, create: true },
        tables: { view: true, update: true }
      }
    }
  },
  {
    email: 'reception@demo.com',
    password: 'reception123',
    name: 'Receptionist',
    phone: '+1234567894',
    role: {
      name: 'Receptionist',
      code: 'receptionist',
      description: 'Receptionist - table and customer management',
      permissions: {
        dashboard: { view: true },
        customers: { view: true, create: true, update: true },
        tables: { view: true, create: true, update: true },
        orders: { view: true }
      }
    }
  }
];

async function main() {
  console.log('\n🚀 Creating test users with roles...\n');

  try {
    // Get demo company
    const company = await systemPrisma.company.findUnique({
      where: { slug: 'demo-restaurant' }
    });

    if (!company) {
      console.error('❌ Demo company not found! Run seed.demo-user.js first.');
      process.exit(1);
    }

    console.log(`📍 Using company: ${company.name}`);
    console.log(`📍 Tenant DB: ${company.tenantDb}`);

    // Get tenant database connection
    const tenantPrisma = getTenantPrisma(company.tenantDb);

    // Get main branch from tenant database
    const mainBranch = await tenantPrisma.branch.findFirst({
      where: { isMain: true }
    });

    if (!mainBranch) {
      console.error('❌ Main branch not found! Run tenant seed first.');
      process.exit(1);
    }

    console.log(`📍 Using branch: ${mainBranch.name}\n`);

    // Get all menus for permission mapping
    const menus = await systemPrisma.systemMenu.findMany({
      where: { isSystem: true }
    });

    const menuMap = {};
    menus.forEach(menu => {
      menuMap[menu.code] = menu.id;
    });

    // Create each test user
    for (const userData of testUsers) {
      console.log(`\n👤 Processing: ${userData.name}`);

      // Check if user already exists
      let user = await systemPrisma.systemUser.findUnique({
        where: { email: userData.email }
      });

      if (!user) {
        // Hash password
        const hashedPassword = await bcrypt.hash(userData.password, 10);

        // Create user in system database
        user = await systemPrisma.systemUser.create({
          data: {
            email: userData.email,
            password: hashedPassword,
            name: userData.name,
            phone: userData.phone,
            status: 'active',
            isMaster: false,
            companyId: company.id
          }
        });
        console.log(`   ✅ Created user: ${user.email}`);
      } else {
        console.log(`   ℹ️ User exists: ${user.email}`);
      }

      // Check if role exists
      let role = await systemPrisma.role.findFirst({
        where: {
          companyId: company.id,
          code: userData.role.code
        }
      });

      if (!role) {
        // Create role
        role = await systemPrisma.role.create({
          data: {
            name: userData.role.name,
            code: userData.role.code,
            description: userData.role.description,
            companyId: company.id,
            isSystem: false,
            isActive: true
          }
        });
        console.log(`   ✅ Created role: ${role.name}`);

        // Create permissions for this role
        for (const [menuCode, perms] of Object.entries(userData.role.permissions)) {
          const menuId = menuMap[menuCode];
          if (menuId) {
            await systemPrisma.rolePermission.create({
              data: {
                roleId: role.id,
                menuId: menuId,
                canView: perms.view || false,
                canCreate: perms.create || false,
                canUpdate: perms.update || false,
                canDelete: perms.delete || false,
                canExport: perms.export || false,
                canPrint: perms.print || false
              }
            });
          }
        }
        console.log(`   ✅ Created ${Object.keys(userData.role.permissions).length} permissions`);
      } else {
        console.log(`   ℹ️ Role exists: ${role.name}`);
      }

      // Assign user to branch in tenant database
      const existingBranchUser = await tenantPrisma.branchUser.findFirst({
        where: {
          systemUserId: user.id,
          branchId: mainBranch.id
        }
      });

      if (!existingBranchUser) {
        await tenantPrisma.branchUser.create({
          data: {
            name: userData.name,
            email: userData.email,
            systemUserId: user.id,
            branchId: mainBranch.id,
            roleId: role.id,
            isActive: true
          }
        });
        console.log(`   ✅ Assigned to branch: ${mainBranch.name}`);
      } else {
        console.log(`   ℹ️ Already assigned to branch`);
      }
    }

    console.log('\n\n✅ Test users created successfully!\n');
    console.log('📋 Login credentials:');
    console.log('─'.repeat(50));
    testUsers.forEach(u => {
      console.log(`   ${u.role.name.padEnd(12)} : ${u.email} / ${u.password}`);
    });
    console.log('─'.repeat(50));
    console.log('\n');

  } catch (error) {
    console.error('\n❌ Error:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await systemPrisma.$disconnect();
  });
