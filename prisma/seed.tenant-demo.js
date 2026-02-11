/**
 * Tenant Demo Seed
 * Creates a default branch for the demo tenant
 * Run with: DATABASE_URL=mysql://root:1223@localhost:3306/restaurant_tenant node prisma/seed.tenant-demo.js
 */

const { PrismaClient } = require('.prisma/tenant-client');

const prisma = new PrismaClient();

async function main() {
  console.log('\n🚀 Seeding demo tenant database...\n');

  try {
    // Create default branch
    let branch = await prisma.branch.findFirst({
      where: { code: 'MAIN' }
    });

    if (!branch) {
      branch = await prisma.branch.create({
        data: {
          code: 'MAIN',
          name: 'Main Branch',
          address: '123 Demo Street',
          city: 'Demo City',
          phone: '+1234567890',
          email: 'main@demo-restaurant.com',
          isMain: true,
          isActive: true,
          settings: {
            currency: 'USD',
            timezone: 'America/New_York'
          }
        }
      });
      console.log('✅ Created main branch:', branch.name);
    } else {
      console.log('ℹ️ Main branch already exists:', branch.name);
    }

    // Create branch user link for the master user (systemUserId = 1)
    let branchUser = await prisma.branchUser.findFirst({
      where: { 
        systemUserId: 1,
        branchId: branch.id
      }
    });

    if (!branchUser) {
      branchUser = await prisma.branchUser.create({
        data: {
          systemUserId: 1, // Links to system_users.id
          branchId: branch.id,
          roleId: 1, // Admin role from system_db.roles
          name: 'Demo Admin',
          email: 'admin@demo.com',
          phone: '+1234567890',
          isActive: true
        }
      });
      console.log('✅ Created branch user link');
    } else {
      console.log('ℹ️ Branch user link already exists');
    }

    console.log('\n✅ Demo tenant seeded successfully!\n');

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
