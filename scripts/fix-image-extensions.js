/**
 * Fix image extensions in database
 * Change .png extensions to .svg for products that have SVG files
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixImageExtensions() {
  console.log('🔧 Fixing image extensions in database...');

  try {
    // Get all products with image paths
    const products = await prisma.product.findMany({
      select: {
        id: true,
        name: true,
        image: true
      }
    });

    const productsWithImages = products.filter(p => p.image);
    console.log(`Found ${productsWithImages.length} products with images out of ${products.length} total products`);

    // Show current image paths
    console.log('\n📋 Current image paths:');
    products.forEach(product => {
      console.log(`  ${product.name}: ${product.image}`);
    });
    // Check for local vs external URLs
    const localImages = productsWithImages.filter(p => p.image && p.image.startsWith('/uploads/'));
    const externalImages = productsWithImages.filter(p => p.image && (p.image.startsWith('http://') || p.image.startsWith('https://')));

    console.log(`\n📊 Image source breakdown:`);
    console.log(`  Local files (/uploads/): ${localImages.length}`);
    console.log(`  External URLs: ${externalImages.length}`);

    if (localImages.length > 0) {
      console.log('\n🏠 Local image products:');
      localImages.forEach(product => {
        console.log(`  ${product.name}: ${product.image}`);
      });
    }
    let updatedCount = 0;

    for (const product of products) {
      if (product.image && product.image.includes('.png')) {
        // Check if there's a corresponding .svg file
        const svgPath = product.image.replace('.png', '.svg');

        // For now, just update all .png to .svg since the user said the files are .svg
        console.log(`Updating ${product.name}: ${product.image} -> ${svgPath}`);

        await prisma.product.update({
          where: { id: product.id },
          data: { image: svgPath }
        });

        updatedCount++;
      }
    }

    console.log(`✅ Updated ${updatedCount} products`);
    console.log('🎉 Image extension fix completed!');

  } catch (error) {
    console.error('❌ Error fixing image extensions:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the fix
fixImageExtensions();