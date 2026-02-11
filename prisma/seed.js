const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // Create default settings
  const defaultSettings = [
    {
      key: 'general',
      value: {
        business_name: 'POS System',
        currency: 'PKR',
        currency_symbol: 'Rs.',
        date_format: 'YYYY-MM-DD',
        time_format: 'HH:mm:ss',
        timezone: 'Asia/Karachi'
      }
    },
    {
      key: 'tax',
      value: {
        enabled: true,
        type: 'exclusive',
        default_rate: 16,
        tax_number: 'NTN-12345678'
      }
    },
    {
      key: 'receipt',
      value: {
        header: 'Welcome!',
        footer: 'Thank you for shopping!',
        show_logo: true,
        logo_url: '',
        show_barcode: true,
        paper_width: 80
      }
    },
    {
      key: 'pos',
      value: {
        allow_negative_stock: false,
        low_stock_alert: true,
        require_customer: false,
        quick_cash_amounts: [100, 500, 1000, 5000]
      }
    }
  ];

  for (const setting of defaultSettings) {
    await prisma.setting.upsert({
      where: { key: setting.key },
      update: { value: setting.value },
      create: setting
    });
  }
  console.log('✅ Settings created');

  // Create admin user (owner)
  const hashedPassword = await bcrypt.hash('123456', 10);
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@pos.test' },
    update: {},
    create: {
      name: 'Admin User',
      email: 'admin@pos.test',
      password: hashedPassword,
      phone: '+923001234567',
      isActive: true
    }
  });
  console.log('✅ Admin user created (admin@pos.test / 123456)');

  // Create Shop
  const shop = await prisma.shop.upsert({
    where: { slug: 'demo-restaurant' },
    update: {},
    create: {
      name: 'Demo Restaurant',
      slug: 'demo-restaurant',
      logo: null,
      ownerUserId: adminUser.id,
      isActive: true,
      isEcomEnabled: true
    }
  });
  console.log('✅ Shop created');

  // Create Shop Settings
  await prisma.shopSettings.upsert({
    where: { shopId: shop.id },
    update: {},
    create: {
      shopId: shop.id,
      bannerImage: null,
      aboutText: 'Welcome to Demo Restaurant - Serving delicious food since 2024!',
      deliveryAreas: ['Islamabad', 'Rawalpindi', 'Lahore'],
      deliveryFee: 200,
      minOrderAmount: 500,
      socialLinks: {
        facebook: 'https://facebook.com/demo-restaurant',
        instagram: 'https://instagram.com/demo-restaurant'
      }
    }
  });
  console.log('✅ Shop settings created');

  // Create Main Branch
  const mainBranch = await prisma.branch.upsert({
    where: { code: 'MB001' },
    update: {},
    create: {
      shopId: shop.id,
      name: 'Main Branch',
      code: 'MB001',
      address: '123 Main Street, F-7 Markaz, Islamabad',
      city: 'Islamabad',
      phone: '+923001234567',
      email: 'main@demo-restaurant.com',
      isActive: true,
      isMain: true,
      settings: {
        tax_rate: 16,
        tax_type: 'exclusive',
        receipt_header: 'Demo Restaurant - Main Branch',
        receipt_footer: 'Thank you for dining with us!',
        low_stock_threshold: 10,
        allow_negative_stock: false
      }
    }
  });
  console.log('✅ Main branch created');

  // Create Second Branch
  const secondBranch = await prisma.branch.upsert({
    where: { code: 'BR002' },
    update: {},
    create: {
      shopId: shop.id,
      name: 'Gulberg Branch',
      code: 'BR002',
      address: '456 Gulberg III, Lahore',
      city: 'Lahore',
      phone: '+923009876543',
      email: 'gulberg@demo-restaurant.com',
      isActive: true,
      isMain: false,
      settings: {
        tax_rate: 16,
        tax_type: 'exclusive',
        receipt_header: 'Demo Restaurant - Gulberg',
        receipt_footer: 'Thank you for dining with us!'
      }
    }
  });
  console.log('✅ Second branch created');

  // Assign admin as owner to both branches
  await prisma.userBranchAccess.upsert({
    where: {
      userId_branchId: {
        userId: adminUser.id,
        branchId: mainBranch.id
      }
    },
    update: {},
    create: {
      userId: adminUser.id,
      branchId: mainBranch.id,
      role: 'owner',
      isActive: true
    }
  });

  await prisma.userBranchAccess.upsert({
    where: {
      userId_branchId: {
        userId: adminUser.id,
        branchId: secondBranch.id
      }
    },
    update: {},
    create: {
      userId: adminUser.id,
      branchId: secondBranch.id,
      role: 'owner',
      isActive: true
    }
  });
  console.log('✅ Admin assigned to branches');

  // Create Cashier User
  const cashierPassword = await bcrypt.hash('cashier123', 10);
  const cashierUser = await prisma.user.upsert({
    where: { email: 'cashier@pos.test' },
    update: {},
    create: {
      name: 'John Cashier',
      email: 'cashier@pos.test',
      password: cashierPassword,
      phone: '+923005551234',
      isActive: true
    }
  });

  await prisma.userBranchAccess.upsert({
    where: {
      userId_branchId: {
        userId: cashierUser.id,
        branchId: mainBranch.id
      }
    },
    update: {},
    create: {
      userId: cashierUser.id,
      branchId: mainBranch.id,
      role: 'cashier',
      isActive: true
    }
  });
  console.log('✅ Cashier user created (cashier@pos.test / cashier123)');

  // Create Manager User
  const managerPassword = await bcrypt.hash('manager123', 10);
  const managerUser = await prisma.user.upsert({
    where: { email: 'manager@pos.test' },
    update: {},
    create: {
      name: 'Sarah Manager',
      email: 'manager@pos.test',
      password: managerPassword,
      phone: '+923005557890',
      isActive: true
    }
  });

  await prisma.userBranchAccess.upsert({
    where: {
      userId_branchId: {
        userId: managerUser.id,
        branchId: mainBranch.id
      }
    },
    update: {},
    create: {
      userId: managerUser.id,
      branchId: mainBranch.id,
      role: 'manager',
      isActive: true
    }
  });
  console.log('✅ Manager user created (manager@pos.test / manager123)');

  // Create Kitchen User
  const kitchenPassword = await bcrypt.hash('kitchen123', 10);
  const kitchenUser = await prisma.user.upsert({
    where: { email: 'kitchen@pos.test' },
    update: {},
    create: {
      name: 'Chef Kitchen',
      email: 'kitchen@pos.test',
      password: kitchenPassword,
      phone: '+923005554567',
      isActive: true
    }
  });

  await prisma.userBranchAccess.upsert({
    where: {
      userId_branchId: {
        userId: kitchenUser.id,
        branchId: mainBranch.id
      }
    },
    update: {},
    create: {
      userId: kitchenUser.id,
      branchId: mainBranch.id,
      role: 'kitchen',
      isActive: true
    }
  });
  console.log('✅ Kitchen user created (kitchen@pos.test / kitchen123)');

  // Create sample categories for Main Branch
  const categoryData = [
    { name: 'Burgers', slug: 'burgers', color: '#FF6B6B', icon: '🍔', kitchen: 'Main Kitchen' },
    { name: 'Pizza', slug: 'pizza', color: '#FFE66D', icon: '🍕', kitchen: 'Main Kitchen' },
    { name: 'Beverages', slug: 'beverages', color: '#4ECDC4', icon: '🥤', kitchen: 'Bar' },
    { name: 'Desserts', slug: 'desserts', color: '#95E1D3', icon: '🍰', kitchen: 'Pastry' },
    { name: 'Sides', slug: 'sides', color: '#F38181', icon: '🍟', kitchen: 'Main Kitchen' }
  ];

  const categories = {};
  for (let i = 0; i < categoryData.length; i++) {
    const cat = categoryData[i];
    const category = await prisma.category.create({
      data: {
        branchId: mainBranch.id,
        name: cat.name,
        slug: cat.slug,
        color: cat.color,
        icon: cat.icon,
        kitchen: cat.kitchen,
        displayOrder: i + 1,
        isActive: true
      }
    });
    categories[cat.slug] = category;
  }
  console.log('✅ Categories created');

  // Create Products with Variations and Modifiers
  const products = [
    {
      name: 'Classic Burger',
      sku: 'BRG001',
      categorySlug: 'burgers',
      basePrice: 350,
      sellingPrice: 450,
      costPrice: 200,
      image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&h=300&fit=crop',
      hasVariations: true,
      variations: [
        { name: 'Single Patty', price: 450 },
        { name: 'Double Patty', price: 650 }
      ],
      modifiers: [
        {
          name: 'Extra Toppings',
          isRequired: false,
          maxSelections: 3,
          options: [
            { name: 'Extra Cheese', price: 50 },
            { name: 'Bacon', price: 80 },
            { name: 'Jalapenos', price: 30 }
          ]
        }
      ]
    },
    {
      name: 'Chicken Zinger',
      sku: 'BRG002',
      categorySlug: 'burgers',
      basePrice: 400,
      sellingPrice: 520,
      costPrice: 220,
      image: 'https://images.unsplash.com/photo-1572802419224-296b0aeee0d9?w=400&h=300&fit=crop',
      hasVariations: false
    },
    {
      name: 'Pepperoni Pizza',
      sku: 'PIZ001',
      categorySlug: 'pizza',
      basePrice: 700,
      sellingPrice: 900,
      costPrice: 400,
      image: 'https://images.unsplash.com/photo-1628840042765-356cda07504e?w=400&h=300&fit=crop',
      hasVariations: true,
      variations: [
        { name: 'Small (8")', price: 700 },
        { name: 'Medium (10")', price: 900 },
        { name: 'Large (12")', price: 1200 }
      ],
      modifiers: [
        {
          name: 'Crust Type',
          isRequired: true,
          maxSelections: 1,
          options: [
            { name: 'Thin Crust', price: 0, isDefault: true },
            { name: 'Thick Crust', price: 50 },
            { name: 'Stuffed Crust', price: 150 }
          ]
        }
      ]
    },
    {
      name: 'Margherita Pizza',
      sku: 'PIZ002',
      categorySlug: 'pizza',
      basePrice: 600,
      sellingPrice: 800,
      costPrice: 350,
      image: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=400&h=300&fit=crop',
      hasVariations: true,
      variations: [
        { name: 'Small (8")', price: 600 },
        { name: 'Medium (10")', price: 800 },
        { name: 'Large (12")', price: 1100 }
      ]
    },
    {
      name: 'Coca Cola',
      sku: 'BEV001',
      categorySlug: 'beverages',
      basePrice: 100,
      sellingPrice: 150,
      costPrice: 60,
      image: 'https://images.unsplash.com/photo-1554866585-cd94860890b7?w=400&h=300&fit=crop',
      hasVariations: true,
      variations: [
        { name: 'Regular (330ml)', price: 100 },
        { name: 'Large (500ml)', price: 150 }
      ]
    },
    {
      name: 'Fresh Orange Juice',
      sku: 'BEV002',
      categorySlug: 'beverages',
      basePrice: 200,
      sellingPrice: 280,
      costPrice: 100,
      image: 'https://images.unsplash.com/photo-1613478223719-2ab802602423?w=400&h=300&fit=crop',
      hasVariations: false
    },
    {
      name: 'Chocolate Brownie',
      sku: 'DES001',
      categorySlug: 'desserts',
      basePrice: 180,
      sellingPrice: 250,
      costPrice: 80,
      image: 'https://images.unsplash.com/photo-1606312619070-d48b4c652a52?w=400&h=300&fit=crop',
      hasVariations: false,
      modifiers: [
        {
          name: 'Add-ons',
          isRequired: false,
          maxSelections: 2,
          options: [
            { name: 'Ice Cream Scoop', price: 100 },
            { name: 'Chocolate Sauce', price: 50 },
            { name: 'Whipped Cream', price: 50 }
          ]
        }
      ]
    },
    {
      name: 'French Fries',
      sku: 'SID001',
      categorySlug: 'sides',
      basePrice: 150,
      sellingPrice: 200,
      costPrice: 60,
      image: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=400&h=300&fit=crop',
      hasVariations: true,
      variations: [
        { name: 'Regular', price: 200 },
        { name: 'Large', price: 300 }
      ]
    },
    {
      name: 'Onion Rings',
      sku: 'SID002',
      categorySlug: 'sides',
      basePrice: 180,
      sellingPrice: 250,
      costPrice: 70,
      image: 'https://images.unsplash.com/photo-1639024471283-03518883512d?w=400&h=300&fit=crop',
      hasVariations: false
    },
    {
      name: 'Chicken Wings',
      sku: 'SID003',
      categorySlug: 'sides',
      basePrice: 350,
      sellingPrice: 450,
      costPrice: 180,
      image: 'https://images.unsplash.com/photo-1567620832903-9fc6debc209f?w=400&h=300&fit=crop',
      hasVariations: true,
      variations: [
        { name: '6 Pieces', price: 450 },
        { name: '12 Pieces', price: 800 }
      ],
      modifiers: [
        {
          name: 'Sauce',
          isRequired: true,
          maxSelections: 1,
          options: [
            { name: 'BBQ', price: 0, isDefault: true },
            { name: 'Buffalo Hot', price: 0 },
            { name: 'Honey Mustard', price: 0 },
            { name: 'Garlic Parmesan', price: 20 }
          ]
        }
      ]
    }
  ];

  for (let i = 0; i < products.length; i++) {
    const prod = products[i];
    const category = categories[prod.categorySlug];
    
    const product = await prisma.product.create({
      data: {
        branchId: mainBranch.id,
        categoryId: category.id,
        name: prod.name,
        slug: prod.name.toLowerCase().replace(/\s+/g, '-'),
        sku: prod.sku,
        basePrice: prod.basePrice,
        sellingPrice: prod.sellingPrice,
        costPrice: prod.costPrice,
        taxRate: 16,
        hasVariations: prod.hasVariations || false,
        trackStock: true,
        stockQuantity: Math.floor(Math.random() * 50) + 20,
        lowStockThreshold: 10,
        image: prod.image,
        isActive: true,
        isFeatured: i < 3, // First 3 products are featured
        displayOrder: i + 1
      }
    });

    // Create variations if any
    if (prod.variations) {
      for (let v = 0; v < prod.variations.length; v++) {
        const variation = prod.variations[v];
        await prisma.productVariation.create({
          data: {
            productId: product.id,
            name: variation.name,
            sku: `${prod.sku}-V${v + 1}`,
            price: variation.price,
            stockQuantity: Math.floor(Math.random() * 30) + 10,
            isActive: true,
            displayOrder: v + 1
          }
        });
      }
    }

    // Create modifiers if any
    if (prod.modifiers) {
      for (const mod of prod.modifiers) {
        const modifier = await prisma.productModifier.create({
          data: {
            productId: product.id,
            name: mod.name,
            isRequired: mod.isRequired,
            maxSelections: mod.maxSelections
          }
        });

        // Create modifier options
        for (const opt of mod.options) {
          await prisma.modifierOption.create({
            data: {
              modifierId: modifier.id,
              name: opt.name,
              price: opt.price,
              isDefault: opt.isDefault || false
            }
          });
        }
      }
    }
  }
  console.log('✅ Products with variations and modifiers created');

  // Create Halls
  const mainHall = await prisma.hall.create({
    data: {
      branchId: mainBranch.id,
      name: 'Main Hall',
      description: 'Ground floor main dining area',
      isActive: true,
      displayOrder: 1
    }
  });

  const terrace = await prisma.hall.create({
    data: {
      branchId: mainBranch.id,
      name: 'Rooftop Terrace',
      description: 'Open air rooftop seating',
      isActive: true,
      displayOrder: 2
    }
  });
  console.log('✅ Halls created');

  // Create Tables
  const tableData = [
    { name: 'T1', capacity: 2, hallId: mainHall.id, shape: 'square', positionX: 0, positionY: 0 },
    { name: 'T2', capacity: 2, hallId: mainHall.id, shape: 'square', positionX: 1, positionY: 0 },
    { name: 'T3', capacity: 4, hallId: mainHall.id, shape: 'rectangle', positionX: 2, positionY: 0 },
    { name: 'T4', capacity: 4, hallId: mainHall.id, shape: 'rectangle', positionX: 0, positionY: 1 },
    { name: 'T5', capacity: 6, hallId: mainHall.id, shape: 'round', positionX: 1, positionY: 1 },
    { name: 'T6', capacity: 8, hallId: mainHall.id, shape: 'rectangle', positionX: 2, positionY: 1 },
    { name: 'R1', capacity: 4, hallId: terrace.id, shape: 'round', positionX: 0, positionY: 0 },
    { name: 'R2', capacity: 4, hallId: terrace.id, shape: 'round', positionX: 1, positionY: 0 },
    { name: 'R3', capacity: 6, hallId: terrace.id, shape: 'round', positionX: 2, positionY: 0 }
  ];

  for (let i = 0; i < tableData.length; i++) {
    const t = tableData[i];
    await prisma.table.create({
      data: {
        branchId: mainBranch.id,
        hallId: t.hallId,
        name: t.name,
        capacity: t.capacity,
        status: 'available',
        shape: t.shape,
        positionX: t.positionX,
        positionY: t.positionY,
        isActive: true,
        displayOrder: i + 1
      }
    });
  }
  console.log('✅ Tables created');

  // Create sample customers
  const customers = [
    { name: 'Ali Khan', email: 'ali.khan@email.com', phone: '+923001112233', city: 'Islamabad' },
    { name: 'Sara Ahmed', email: 'sara.ahmed@email.com', phone: '+923004445566', city: 'Islamabad' },
    { name: 'Usman Raza', email: 'usman.raza@email.com', phone: '+923007778899', city: 'Lahore' }
  ];

  for (const cust of customers) {
    await prisma.customer.create({
      data: {
        branchId: mainBranch.id,
        name: cust.name,
        email: cust.email,
        phone: cust.phone,
        city: cust.city,
        isActive: true
      }
    });
  }
  console.log('✅ Customers created');

  // Create a Menu for Main Branch
  await prisma.menu.create({
    data: {
      branchId: mainBranch.id,
      name: 'Lunch Menu',
      description: 'Available from 12pm to 4pm',
      activeTimeFrom: '12:00',
      activeTimeTo: '16:00',
      activeDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
      isActive: true,
      displayOrder: 1
    }
  });

  await prisma.menu.create({
    data: {
      branchId: mainBranch.id,
      name: 'All Day Menu',
      description: 'Available all day',
      isActive: true,
      displayOrder: 2
    }
  });
  console.log('✅ Menus created');

  // Create Chart of Accounts with 6-level hierarchy
  const accountsData = [
    // Level 1 - Asset Accounts (1xxx)
    { code: '1', name: 'Assets', type: 'asset', level: 1, isSystem: true },
    { code: '11', name: 'Current Assets', type: 'asset', level: 2, parentCode: '1' },
    { code: '111', name: 'Cash & Bank', type: 'asset', level: 3, parentCode: '11' },
    { code: '1111', name: 'Cash on Hand', type: 'asset', level: 4, parentCode: '111' },
    { code: '11111', name: 'Main Cash Register', type: 'asset', level: 5, parentCode: '1111' },
    { code: '111111', name: 'Counter 1 Cash', type: 'asset', level: 6, parentCode: '11111' },
    { code: '111112', name: 'Counter 2 Cash', type: 'asset', level: 6, parentCode: '11111' },
    { code: '1112', name: 'Bank Accounts', type: 'asset', level: 4, parentCode: '111' },
    { code: '11121', name: 'HBL Current Account', type: 'asset', level: 5, parentCode: '1112' },
    { code: '11122', name: 'MCB Business Account', type: 'asset', level: 5, parentCode: '1112' },
    { code: '112', name: 'Receivables', type: 'asset', level: 3, parentCode: '11' },
    { code: '1121', name: 'Accounts Receivable', type: 'asset', level: 4, parentCode: '112' },
    { code: '113', name: 'Inventory', type: 'asset', level: 3, parentCode: '11' },
    { code: '1131', name: 'Food Inventory', type: 'asset', level: 4, parentCode: '113' },
    { code: '1132', name: 'Beverage Inventory', type: 'asset', level: 4, parentCode: '113' },
    { code: '12', name: 'Fixed Assets', type: 'asset', level: 2, parentCode: '1' },
    { code: '121', name: 'Equipment', type: 'asset', level: 3, parentCode: '12' },
    { code: '1211', name: 'Kitchen Equipment', type: 'asset', level: 4, parentCode: '121' },
    { code: '1212', name: 'POS Equipment', type: 'asset', level: 4, parentCode: '121' },

    // Level 1 - Liability Accounts (2xxx)
    { code: '2', name: 'Liabilities', type: 'liability', level: 1, isSystem: true },
    { code: '21', name: 'Current Liabilities', type: 'liability', level: 2, parentCode: '2' },
    { code: '211', name: 'Payables', type: 'liability', level: 3, parentCode: '21' },
    { code: '2111', name: 'Accounts Payable', type: 'liability', level: 4, parentCode: '211' },
    { code: '2112', name: 'Sales Tax Payable', type: 'liability', level: 4, parentCode: '211' },
    { code: '212', name: 'Accrued Expenses', type: 'liability', level: 3, parentCode: '21' },
    { code: '2121', name: 'Salaries Payable', type: 'liability', level: 4, parentCode: '212' },

    // Level 1 - Equity Accounts (3xxx)
    { code: '3', name: 'Equity', type: 'equity', level: 1, isSystem: true },
    { code: '31', name: 'Owner\'s Equity', type: 'equity', level: 2, parentCode: '3' },
    { code: '311', name: 'Capital', type: 'equity', level: 3, parentCode: '31' },
    { code: '312', name: 'Retained Earnings', type: 'equity', level: 3, parentCode: '31' },
    { code: '313', name: 'Drawings', type: 'equity', level: 3, parentCode: '31' },

    // Level 1 - Revenue Accounts (4xxx)
    { code: '4', name: 'Revenue', type: 'revenue', level: 1, isSystem: true },
    { code: '41', name: 'Sales Revenue', type: 'revenue', level: 2, parentCode: '4' },
    { code: '411', name: 'Food Sales', type: 'revenue', level: 3, parentCode: '41' },
    { code: '4111', name: 'Dine-In Sales', type: 'revenue', level: 4, parentCode: '411' },
    { code: '4112', name: 'Takeaway Sales', type: 'revenue', level: 4, parentCode: '411' },
    { code: '4113', name: 'Delivery Sales', type: 'revenue', level: 4, parentCode: '411' },
    { code: '412', name: 'Beverage Sales', type: 'revenue', level: 3, parentCode: '41' },
    { code: '42', name: 'Other Income', type: 'revenue', level: 2, parentCode: '4' },
    { code: '421', name: 'Delivery Fees', type: 'revenue', level: 3, parentCode: '42' },

    // Level 1 - Expense Accounts (5xxx)
    { code: '5', name: 'Expenses', type: 'expense', level: 1, isSystem: true },
    { code: '51', name: 'Cost of Goods Sold', type: 'expense', level: 2, parentCode: '5' },
    { code: '511', name: 'Food Costs', type: 'expense', level: 3, parentCode: '51' },
    { code: '512', name: 'Beverage Costs', type: 'expense', level: 3, parentCode: '51' },
    { code: '52', name: 'Operating Expenses', type: 'expense', level: 2, parentCode: '5' },
    { code: '521', name: 'Salaries & Wages', type: 'expense', level: 3, parentCode: '52' },
    { code: '5211', name: 'Kitchen Staff Salaries', type: 'expense', level: 4, parentCode: '521' },
    { code: '5212', name: 'Service Staff Salaries', type: 'expense', level: 4, parentCode: '521' },
    { code: '522', name: 'Rent & Utilities', type: 'expense', level: 3, parentCode: '52' },
    { code: '5221', name: 'Rent Expense', type: 'expense', level: 4, parentCode: '522' },
    { code: '5222', name: 'Electricity', type: 'expense', level: 4, parentCode: '522' },
    { code: '5223', name: 'Gas', type: 'expense', level: 4, parentCode: '522' },
    { code: '523', name: 'Marketing', type: 'expense', level: 3, parentCode: '52' }
  ];

  // Create account lookup
  const accountLookup = {};
  
  for (const acc of accountsData) {
    const parentId = acc.parentCode ? accountLookup[acc.parentCode]?.id : null;
    
    const account = await prisma.account.upsert({
      where: {
        branchId_code: { branchId: mainBranch.id, code: acc.code }
      },
      update: {
        name: acc.name,
        type: acc.type,
        level: acc.level,
        parentId: parentId,
        isSystem: acc.isSystem || false
      },
      create: {
        branchId: mainBranch.id,
        code: acc.code,
        name: acc.name,
        type: acc.type,
        level: acc.level,
        parentId: parentId,
        isActive: true,
        isSystem: acc.isSystem || false,
        balance: 0
      }
    });
    accountLookup[acc.code] = account;
  }
  console.log('✅ Chart of Accounts (6-level hierarchy) created');

  // Create Default Translations
  const defaultTranslations = {
    en: {
      'dashboard': 'Dashboard', 'products': 'Products', 'orders': 'Orders',
      'customers': 'Customers', 'reports': 'Reports', 'settings': 'Settings',
      'pos': 'POS', 'logout': 'Logout', 'login': 'Login', 'welcome': 'Welcome',
      'save': 'Save', 'cancel': 'Cancel', 'delete': 'Delete', 'edit': 'Edit',
      'add': 'Add', 'search': 'Search', 'filter': 'Filter', 'export': 'Export',
      'print': 'Print', 'success': 'Success', 'error': 'Error', 'warning': 'Warning',
      'confirm_delete': 'Are you sure you want to delete?', 'no_data': 'No data found',
      'loading': 'Loading...', 'add_to_cart': 'Add to Cart', 'checkout': 'Checkout',
      'subtotal': 'Subtotal', 'discount': 'Discount', 'tax': 'Tax', 'total': 'Total',
      'pay': 'Pay', 'cash': 'Cash', 'card': 'Card', 'change': 'Change',
      'hold_order': 'Hold Order', 'held_orders': 'Held Orders', 'order_number': 'Order #',
      'order_date': 'Order Date', 'order_status': 'Status', 'order_total': 'Total',
      'dine_in': 'Dine In', 'takeaway': 'Takeaway', 'delivery': 'Delivery',
      'currency': 'PKR', 'currency_symbol': 'Rs.'
    },
    ur: {
      'dashboard': 'ڈیش بورڈ', 'products': 'مصنوعات', 'orders': 'آرڈرز',
      'customers': 'گاہک', 'reports': 'رپورٹس', 'settings': 'ترتیبات',
      'pos': 'پوائنٹ آف سیل', 'logout': 'لاگ آؤٹ', 'login': 'لاگ ان', 'welcome': 'خوش آمدید',
      'save': 'محفوظ کریں', 'cancel': 'منسوخ کریں', 'delete': 'حذف کریں', 'edit': 'ترمیم کریں',
      'add': 'شامل کریں', 'search': 'تلاش کریں', 'filter': 'فلٹر', 'export': 'ایکسپورٹ',
      'print': 'پرنٹ', 'success': 'کامیابی', 'error': 'خرابی', 'warning': 'انتباہ',
      'confirm_delete': 'کیا آپ واقعی حذف کرنا چاہتے ہیں؟', 'no_data': 'کوئی ڈیٹا نہیں ملا',
      'loading': 'لوڈ ہو رہا ہے...', 'add_to_cart': 'کارٹ میں شامل کریں', 'checkout': 'چیک آؤٹ',
      'subtotal': 'ذیلی کل', 'discount': 'رعایت', 'tax': 'ٹیکس', 'total': 'کل',
      'pay': 'ادائیگی', 'cash': 'نقد', 'card': 'کارڈ', 'change': 'واپسی',
      'hold_order': 'آرڈر روکیں', 'held_orders': 'روکے گئے آرڈرز', 'order_number': 'آرڈر نمبر',
      'order_date': 'آرڈر کی تاریخ', 'order_status': 'حیثیت', 'order_total': 'کل',
      'dine_in': 'اندر کھانا', 'takeaway': 'ٹیک اوے', 'delivery': 'ڈیلیوری',
      'currency': 'PKR', 'currency_symbol': 'روپے'
    },
    ar: {
      'dashboard': 'لوحة القيادة', 'products': 'المنتجات', 'orders': 'الطلبات',
      'customers': 'العملاء', 'reports': 'التقارير', 'settings': 'الإعدادات',
      'pos': 'نقطة البيع', 'logout': 'تسجيل خروج', 'login': 'تسجيل دخول', 'welcome': 'أهلاً وسهلاً',
      'save': 'حفظ', 'cancel': 'إلغاء', 'delete': 'حذف', 'edit': 'تعديل',
      'add': 'إضافة', 'search': 'بحث', 'filter': 'تصفية', 'export': 'تصدير',
      'print': 'طباعة', 'success': 'نجاح', 'error': 'خطأ', 'warning': 'تحذير',
      'confirm_delete': 'هل أنت متأكد من الحذف؟', 'no_data': 'لا توجد بيانات',
      'loading': 'جاري التحميل...', 'add_to_cart': 'أضف إلى السلة', 'checkout': 'الدفع',
      'subtotal': 'المجموع الفرعي', 'discount': 'خصم', 'tax': 'ضريبة', 'total': 'المجموع',
      'pay': 'ادفع', 'cash': 'نقد', 'card': 'بطاقة', 'change': 'الباقي',
      'hold_order': 'تعليق الطلب', 'held_orders': 'الطلبات المعلقة', 'order_number': 'رقم الطلب',
      'order_date': 'تاريخ الطلب', 'order_status': 'الحالة', 'order_total': 'المجموع',
      'dine_in': 'تناول الطعام', 'takeaway': 'سفري', 'delivery': 'توصيل',
      'currency': 'PKR', 'currency_symbol': 'ر.س'
    }
  };

  for (const [locale, translations] of Object.entries(defaultTranslations)) {
    for (const [key, value] of Object.entries(translations)) {
      await prisma.translation.upsert({
        where: { locale_key: { locale, key } },
        update: { value },
        create: { locale, key, value, group: 'default' }
      });
    }
  }
  console.log('✅ Translations (en, ur, ar) created');

  // Create sample orders with invoices and journal entries
  const productList = await prisma.product.findMany({
    where: { branchId: mainBranch.id },
    include: { variations: true },
    take: 5
  });

  const customerList = await prisma.customer.findMany({
    where: { branchId: mainBranch.id }
  });

  const tableList = await prisma.table.findMany({
    where: { branchId: mainBranch.id },
    take: 3
  });

  // Create 5 sample orders
  for (let i = 0; i < 5; i++) {
    const orderType = ['dine_in', 'take_away', 'delivery'][i % 3];
    const paymentMethod = ['cash', 'card', 'online'][i % 3];
    const status = ['completed', 'completed', 'completed', 'kitchen', 'pending'][i];
    
    const orderItems = productList.slice(0, 3).map((prod, idx) => ({
      productId: prod.id,
      variationId: prod.variations[0]?.id || null,
      productName: prod.name,
      variationName: prod.variations[0]?.name || null,
      quantity: idx + 1,
      unitPrice: prod.sellingPrice,
      total: prod.sellingPrice * (idx + 1),
      notes: idx === 0 ? 'No onions please' : null
    }));

    const subtotal = orderItems.reduce((sum, item) => sum + item.total, 0);
    const taxAmount = Math.round(subtotal * 0.16);
    const discountAmount = i === 0 ? 50 : 0;
    const grandTotal = subtotal + taxAmount - discountAmount;

    const orderNumber = `ORD-${String(i + 1).padStart(6, '0')}`;
    
    const order = await prisma.order.create({
      data: {
        branchId: mainBranch.id,
        orderNumber: orderNumber,
        customerId: customerList[i % customerList.length]?.id || null,
        tableId: orderType === 'dine_in' ? tableList[i % tableList.length]?.id : null,
        userId: cashierUser.id,
        orderType: orderType,
        status: status,
        subtotal: subtotal,
        taxAmount: taxAmount,
        discountAmount: discountAmount,
        discountType: discountAmount > 0 ? 'fixed' : null,
        total: grandTotal,
        paidAmount: status === 'completed' ? grandTotal : 0,
        changeAmount: status === 'completed' ? 0 : 0,
        paymentMethod: status === 'completed' ? paymentMethod : 'cash',
        paymentStatus: status === 'completed' ? 'paid' : 'pending',
        notes: i === 0 ? 'Special request: extra napkins' : null,
        items: {
          create: orderItems
        }
      }
    });

    // Create invoice for completed orders
    if (status === 'completed') {
      await prisma.invoice.create({
        data: {
          branchId: mainBranch.id,
          orderId: order.id,
          customerId: order.customerId,
          invoiceNumber: `INV-${String(i + 1).padStart(6, '0')}`,
          orderNumber: orderNumber,
          subtotal: subtotal,
          taxAmount: taxAmount,
          discountAmount: discountAmount,
          total: grandTotal,
          paidAmount: grandTotal,
          dueAmount: 0,
          status: 'paid',
          paymentMethod: paymentMethod,
          notes: null
        }
      });

      // Create journal entry for the sale
      const cashAccount = accountLookup['111111'];
      const salesAccount = accountLookup['4111'];
      const taxAccount = accountLookup['2112'];

      if (cashAccount && salesAccount) {
        const journalEntry = await prisma.journalEntry.create({
          data: {
            branchId: mainBranch.id,
            entryNumber: `JE-${String(i + 1).padStart(6, '0')}`,
            entryDate: new Date(),
            description: `Sales - Order ${orderNumber}`,
            reference: orderNumber,
            totalDebit: grandTotal,
            totalCredit: grandTotal,
            status: 'posted',
            lines: {
              create: [
                {
                  accountId: cashAccount.id,
                  description: `Cash received - ${orderNumber}`,
                  debit: grandTotal,
                  credit: 0
                },
                {
                  accountId: salesAccount.id,
                  description: `Sales revenue - ${orderNumber}`,
                  debit: 0,
                  credit: subtotal
                },
                ...(taxAmount > 0 && taxAccount ? [{
                  accountId: taxAccount.id,
                  description: `Sales tax - ${orderNumber}`,
                  debit: 0,
                  credit: taxAmount
                }] : [])
              ]
            }
          }
        });

        // Update account balances
        await prisma.account.update({
          where: { id: cashAccount.id },
          data: { balance: { increment: grandTotal } }
        });
        await prisma.account.update({
          where: { id: salesAccount.id },
          data: { balance: { increment: subtotal } }
        });
        if (taxAccount && taxAmount > 0) {
          await prisma.account.update({
            where: { id: taxAccount.id },
            data: { balance: { increment: taxAmount } }
          });
        }
      }
    }
  }
  console.log('✅ Sample orders, invoices, and journal entries created');

  // Create a held order
  const heldOrderItems = productList.slice(0, 2).map((prod, idx) => ({
    productId: prod.id,
    variationId: prod.variations[0]?.id || null,
    productName: prod.name,
    variationName: prod.variations[0]?.name || null,
    quantity: 2,
    unitPrice: prod.sellingPrice,
    total: prod.sellingPrice * 2,
    notes: null
  }));

  const heldSubtotal = heldOrderItems.reduce((sum, item) => sum + item.total, 0);
  
  await prisma.order.create({
    data: {
      branchId: mainBranch.id,
      orderNumber: 'ORD-HELD-001',
      customerId: customerList[0]?.id || null,
      tableId: tableList[0]?.id || null,
      userId: cashierUser.id,
      orderType: 'dine_in',
      status: 'hold',
      isHeld: true,
      heldAt: new Date(),
      subtotal: heldSubtotal,
      taxAmount: Math.round(heldSubtotal * 0.16),
      discountAmount: 0,
      total: heldSubtotal + Math.round(heldSubtotal * 0.16),
      paidAmount: 0,
      changeAmount: 0,
      notes: 'Held order - waiting for customer',
      items: {
        create: heldOrderItems
      }
    }
  });
  console.log('✅ Held order created');

  // Create sample notifications
  const notifications = [
    { type: 'order_ready', title: 'Order Ready', message: 'Order ORD-000001 is ready for pickup', userId: cashierUser.id },
    { type: 'low_stock', title: 'Low Stock Alert', message: 'Classic Burger is running low on stock (5 remaining)', userId: managerUser.id },
    { type: 'system', title: 'System Update', message: 'New features have been added to the POS system', userId: adminUser.id }
  ];

  for (const notif of notifications) {
    await prisma.notification.create({
      data: {
        branchId: mainBranch.id,
        userId: notif.userId,
        type: notif.type,
        title: notif.title,
        message: notif.message,
        isRead: false
      }
    });
  }
  console.log('✅ Sample notifications created');

  console.log('\n🎉 Seed completed successfully!');
  console.log('\n📋 Login Credentials:');
  console.log('  Owner:   admin@pos.test / 123456');
  console.log('  Manager: manager@pos.test / manager123');
  console.log('  Cashier: cashier@pos.test / cashier123');
  console.log('  Kitchen: kitchen@pos.test / kitchen123');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
