/**
 * Demo User Seed
 * Creates a demo company and master user for testing
 * Run with: node prisma/seed.demo-user.js
 */

const { PrismaClient } = require('.prisma/system-client');
const bcrypt = require('bcryptjs');

// Load .env file
require('dotenv').config();

const prisma = new PrismaClient();

async function main() {
  console.log('\n🚀 Creating demo user and company...\n');

  try {
    // Check if demo company already exists
    let company = await prisma.company.findUnique({
      where: { slug: 'demo-restaurant' }
    });

    if (!company) {
      // Create demo company
      company = await prisma.company.create({
        data: {
          name: 'Demo Restaurant',
          slug: 'demo-restaurant',
          email: 'demo@restaurant.com',
          phone: '+1234567890',
          address: '123 Demo Street',
          tenantDb: 'restaurant_tenant', // This would be the tenant database name
          status: 'active'
        }
      });
      console.log('✅ Created demo company:', company.name);
    } else {
      console.log('ℹ️ Demo company already exists:', company.name);
    }

    // Check if demo user already exists
    let user = await prisma.systemUser.findUnique({
      where: { email: 'admin@demo.com' }
    });

    if (!user) {
      // Hash password
      const hashedPassword = await bcrypt.hash('admin123', 10);

      // Create demo master user
      user = await prisma.systemUser.create({
        data: {
          email: 'admin@demo.com',
          password: hashedPassword,
          name: 'Demo Admin',
          phone: '+1234567890',
          status: 'active',
          isMaster: true,
          companyId: company.id
        }
      });
      console.log('✅ Created demo user:', user.email);
    } else {
      console.log('ℹ️ Demo user already exists:', user.email);
    }

    // Create a role for the company if not exists
    let role = await prisma.role.findFirst({
      where: { 
        companyId: company.id,
        name: 'Admin'
      }
    });

    if (!role) {
      role = await prisma.role.create({
        data: {
          name: 'Admin',
          code: 'admin',
          description: 'Full administrative access',
          companyId: company.id,
          isSystem: false,
          isActive: true
        }
      });
      console.log('✅ Created admin role');
    }

    // Get all menus
    const menus = await prisma.systemMenu.findMany({
      where: { isSystem: true }
    });

    // Create full permissions for admin role
    const existingPermissions = await prisma.rolePermission.count({
      where: { roleId: role.id }
    });

    if (existingPermissions === 0) {
      for (const menu of menus) {
        await prisma.rolePermission.create({
          data: {
            roleId: role.id,
            menuId: menu.id,
            canView: true,
            canCreate: true,
            canUpdate: true,
            canDelete: true,
            canExport: true,
            canPrint: true
          }
        });
      }
      console.log(`✅ Created ${menus.length} permissions for admin role`);
    } else {
      console.log(`ℹ️ Permissions already exist for admin role`);
    }

    console.log('\n✅ Demo setup completed!\n');
    console.log('📋 Login credentials:');
    console.log('   Email: admin@demo.com');
    console.log('   Password: admin123\n');

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
    await prisma.$disconnect();
  });
