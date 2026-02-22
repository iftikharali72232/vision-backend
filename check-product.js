const { PrismaClient } = require('@prisma/client');

async function checkProduct() {
  const prisma = new PrismaClient();

  try {
    const products = await prisma.product.findMany({
      take: 5,
      select: { id: true, name: true, image: true, images: true }
    });

    console.log('Products:', JSON.stringify(products, null, 2));
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkProduct();