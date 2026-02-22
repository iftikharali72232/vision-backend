/**
 * Fix image paths in database
 * Update products to use local SVG files instead of external URLs
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixImageExtensions() {
  console.log('🔧 Fixing image paths in database...');

  try {
    // Mapping of product names to correct SVG paths
    const productImageMap = {
      'Classic Burger': '/uploads/products/burger-classic.svg',
      'Chicken Zinger': '/uploads/products/burger-zinger.svg',
      'Double Cheese Burger': '/uploads/products/burger-cheese.svg',
      'Mushroom Swiss Burger': '/uploads/products/burger-mushroom.svg',
      'Spicy Chicken Burger': '/uploads/products/burger-spicy.svg',
      'Margherita Pizza (Medium)': '/uploads/products/pizza-margherita.svg',
      'Pepperoni Pizza (Medium)': '/uploads/products/pizza-pepperoni.svg',
      'BBQ Chicken Pizza (Large)': '/uploads/products/pizza-bbq.svg',
      'Veggie Supreme Pizza (Large)': '/uploads/products/pizza-veggie.svg',
      'Fajita Pizza (Medium)': '/uploads/products/pizza-fajita.svg',
      'Fresh Orange Juice': '/uploads/products/juice-orange.svg',
      'Mango Shake': '/uploads/products/shake-mango.svg',
      'Coca Cola (Can)': '/uploads/products/coke-can.svg',
      'Mineral Water': '/uploads/products/water.svg',
      'Hot Coffee': '/uploads/products/coffee.svg',
      'Green Tea': '/uploads/products/green-tea.svg',
      'Chocolate Brownie': '/uploads/products/brownie.svg',
      'Cheesecake Slice': '/uploads/products/cheesecake.svg',
      'Ice Cream (2 Scoop)': '/uploads/products/icecream.svg',
      'Gulab Jamun (4pcs)': '/uploads/products/gulab-jamun.svg',
      'French Fries': '/uploads/products/fries.svg',
      'Onion Rings': '/uploads/products/onion-rings.svg',
      'Chicken Wings': '/uploads/products/wings.svg'
    };

    // Get all products
    const products = await prisma.product.findMany({
      select: {
        id: true,
        name: true,
        image: true
      }
    });

    console.log(`Found ${products.length} total products`);

    let updatedCount = 0;

    for (const product of products) {
      const correctImagePath = productImageMap[product.name];

      if (correctImagePath && product.image !== correctImagePath) {
        console.log(`Updating ${product.name}:`);
        console.log(`  From: ${product.image}`);
        console.log(`  To: ${correctImagePath}`);

        await prisma.product.update({
          where: { id: product.id },
          data: { image: correctImagePath }
        });

        updatedCount++;
      }
    }

    console.log(`✅ Updated ${updatedCount} products`);
    console.log('🎉 Image path fix completed!');

  } catch (error) {
    console.error('❌ Error fixing image paths:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the fix
fixImageExtensions();