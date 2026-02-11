/**
 * Comprehensive Demo Data Seed Script
 * Populates the restaurant_tenant database with realistic test data
 * for branch_id=1 (Main Branch)
 * 
 * Usage: cd pos-backend && node prisma/seed.demo-data.js
 */

const { PrismaClient: TenantPrismaClient } = require('.prisma/tenant-client');

const tenantPrisma = new TenantPrismaClient({
  datasources: {
    db: { url: 'mysql://root:1223@localhost:3306/restaurant_tenant' }
  }
});

const BRANCH_ID = 1;

async function main() {
  console.log('🌱 Starting comprehensive demo data seed...\n');

  // Look up the admin branch_user for branch 1
  const adminBranchUser = await tenantPrisma.branchUser.findFirst({
    where: { branchId: BRANCH_ID, systemUserId: 1 }
  });

  if (!adminBranchUser) {
    console.error('❌ Admin branch user not found for branch 1! Ensure branch_users are set up.');
    process.exit(1);
  }

  const ADMIN_USER_ID = adminBranchUser.id;
  console.log(`📌 Admin branch_user ID: ${ADMIN_USER_ID}\n`);

  // ============================================================
  // 1. SETTINGS
  // ============================================================
  console.log('⚙️  Seeding settings...');
  const settingsData = [
    { key: 'general', value: { business_name: 'Vision POS Restaurant', currency: 'PKR', currency_symbol: '₨', date_format: 'DD/MM/YYYY', time_format: 'HH:mm', timezone: 'Asia/Karachi', language: 'en' } },
    { key: 'tax', value: { enabled: true, type: 'exclusive', default_rate: 16, tax_number: 'NTN-1234567', tax_label: 'GST' } },
    { key: 'receipt', value: { header: 'Vision POS Restaurant', subheader: 'Delicious Food, Great Service', footer: 'Thank you for dining with us!', show_logo: true, show_barcode: true, paper_width: 80, show_customer: true, show_tax_details: true } },
    { key: 'pos', value: { allow_negative_stock: false, low_stock_alert: true, require_customer: false, quick_cash_amounts: [100, 500, 1000, 2000, 5000], default_order_type: 'dine_in', auto_print: true, sound_enabled: true } },
    { key: 'kitchen', value: { auto_accept: false, preparation_time: 15, notify_on_ready: true, display_mode: 'queue' } },
    { key: 'notification', value: { order_created: true, order_ready: true, low_stock: true, new_customer: true, sound: 'default' } },
  ];

  for (const s of settingsData) {
    await tenantPrisma.setting.upsert({
      where: { key: s.key },
      update: { value: s.value },
      create: { key: s.key, value: s.value }
    });
  }
  console.log('   ✅ Settings created\n');

  // ============================================================
  // 2. TAX SETTINGS
  // ============================================================
  console.log('💰 Seeding tax settings...');
  const taxes = [
    { branchId: BRANCH_ID, name: 'GST 16%', rate: 16.00, type: 'exclusive', isDefault: true, isActive: true },
    { branchId: BRANCH_ID, name: 'Service Tax 5%', rate: 5.00, type: 'exclusive', isDefault: false, isActive: true },
    { branchId: BRANCH_ID, name: 'No Tax', rate: 0.00, type: 'exclusive', isDefault: false, isActive: true },
  ];
  for (const t of taxes) {
    await tenantPrisma.taxSetting.create({ data: t });
  }
  console.log('   ✅ Tax settings created\n');

  // ============================================================
  // 3. DISCOUNT SETTINGS
  // ============================================================
  console.log('🏷️  Seeding discount settings...');
  const discounts = [
    { branchId: BRANCH_ID, name: '10% Off', type: 'percentage', value: 10.00, minOrder: 500.00, isActive: true },
    { branchId: BRANCH_ID, name: '20% Off', type: 'percentage', value: 20.00, minOrder: 1000.00, isActive: true },
    { branchId: BRANCH_ID, name: 'Rs. 100 Off', type: 'fixed', value: 100.00, minOrder: 500.00, isActive: true },
    { branchId: BRANCH_ID, name: 'Rs. 500 Off', type: 'fixed', value: 500.00, minOrder: 2000.00, isActive: true },
    { branchId: BRANCH_ID, name: 'Happy Hour 15%', type: 'percentage', value: 15.00, minOrder: 300.00, isActive: true },
  ];
  for (const d of discounts) {
    await tenantPrisma.discountSetting.create({ data: d });
  }
  console.log('   ✅ Discount settings created\n');

  // ============================================================
  // 4. CATEGORIES
  // ============================================================
  console.log('📂 Seeding categories...');
  const categoriesData = [
    { name: 'Burgers', slug: 'burgers', color: '#e74c3c', icon: '🍔', kitchen: 'Main Kitchen', displayOrder: 1, description: 'Juicy burgers made with premium ingredients' },
    { name: 'Pizza', slug: 'pizza', color: '#f39c12', icon: '🍕', kitchen: 'Main Kitchen', displayOrder: 2, description: 'Hand-tossed artisan pizzas' },
    { name: 'Beverages', slug: 'beverages', color: '#3498db', icon: '🥤', kitchen: 'Bar', displayOrder: 3, description: 'Fresh juices, shakes & cold drinks' },
    { name: 'Desserts', slug: 'desserts', color: '#e91e63', icon: '🍰', kitchen: 'Dessert Station', displayOrder: 4, description: 'Sweet treats and desserts' },
    { name: 'BBQ & Grills', slug: 'bbq-grills', color: '#ff5722', icon: '🥩', kitchen: 'BBQ Station', displayOrder: 5, description: 'Smoky BBQ and grilled items' },
    { name: 'Pasta', slug: 'pasta', color: '#9c27b0', icon: '🍝', kitchen: 'Main Kitchen', displayOrder: 6, description: 'Italian-style pasta dishes' },
    { name: 'Salads', slug: 'salads', color: '#4caf50', icon: '🥗', kitchen: 'Cold Station', displayOrder: 7, description: 'Fresh and healthy salads' },
    { name: 'Sandwiches', slug: 'sandwiches', color: '#ff9800', icon: '🥪', kitchen: 'Main Kitchen', displayOrder: 8, description: 'Gourmet sandwiches and wraps' },
    { name: 'Sides', slug: 'sides', color: '#795548', icon: '🍟', kitchen: 'Fry Station', displayOrder: 9, description: 'Crispy sides and appetizers' },
    { name: 'Rice & Biryani', slug: 'rice-biryani', color: '#607d8b', icon: '🍚', kitchen: 'Main Kitchen', displayOrder: 10, description: 'Aromatic rice and biryani dishes' },
  ];

  const categories = [];
  for (const c of categoriesData) {
    const cat = await tenantPrisma.category.create({
      data: {
        branchId: BRANCH_ID,
        name: c.name,
        slug: c.slug,
        description: c.description,
        color: c.color,
        icon: c.icon,
        kitchen: c.kitchen,
        displayOrder: c.displayOrder,
        isActive: true,
      }
    });
    categories.push(cat);
  }
  console.log(`   ✅ ${categories.length} categories created\n`);

  // ============================================================
  // 5. PRODUCTS
  // ============================================================
  console.log('🍽️  Seeding products...');

  const productsByCategory = {
    'Burgers': [
      { name: 'Classic Beef Burger', sku: 'BRG-001', basePrice: 450, sellingPrice: 550, costPrice: 250, image: '/uploads/products/burger-classic.svg' },
      { name: 'Chicken Zinger Burger', sku: 'BRG-002', basePrice: 400, sellingPrice: 500, costPrice: 220, image: '/uploads/products/burger-zinger.svg' },
      { name: 'Double Cheese Burger', sku: 'BRG-003', basePrice: 550, sellingPrice: 650, costPrice: 300, image: '/uploads/products/burger-cheese.svg' },
      { name: 'Mushroom Swiss Burger', sku: 'BRG-004', basePrice: 500, sellingPrice: 600, costPrice: 280, image: '/uploads/products/burger-mushroom.svg' },
      { name: 'Spicy Chicken Burger', sku: 'BRG-005', basePrice: 380, sellingPrice: 480, costPrice: 200, image: '/uploads/products/burger-spicy.svg' },
    ],
    'Pizza': [
      { name: 'Margherita Pizza (Medium)', sku: 'PZA-001', basePrice: 700, sellingPrice: 850, costPrice: 350, image: '/uploads/products/pizza-margherita.svg' },
      { name: 'Pepperoni Pizza (Medium)', sku: 'PZA-002', basePrice: 800, sellingPrice: 950, costPrice: 400, image: '/uploads/products/pizza-pepperoni.svg' },
      { name: 'BBQ Chicken Pizza (Large)', sku: 'PZA-003', basePrice: 1000, sellingPrice: 1200, costPrice: 500, image: '/uploads/products/pizza-bbq.svg' },
      { name: 'Veggie Supreme Pizza (Large)', sku: 'PZA-004', basePrice: 900, sellingPrice: 1100, costPrice: 450, image: '/uploads/products/pizza-veggie.svg' },
      { name: 'Fajita Pizza (Medium)', sku: 'PZA-005', basePrice: 750, sellingPrice: 900, costPrice: 380, image: '/uploads/products/pizza-fajita.svg' },
    ],
    'Beverages': [
      { name: 'Fresh Orange Juice', sku: 'BEV-001', basePrice: 180, sellingPrice: 250, costPrice: 80, image: '/uploads/products/juice-orange.svg' },
      { name: 'Mango Shake', sku: 'BEV-002', basePrice: 200, sellingPrice: 300, costPrice: 90, image: '/uploads/products/shake-mango.svg' },
      { name: 'Coca Cola (Can)', sku: 'BEV-003', basePrice: 80, sellingPrice: 120, costPrice: 50, image: '/uploads/products/coke-can.svg' },
      { name: 'Mineral Water', sku: 'BEV-004', basePrice: 50, sellingPrice: 80, costPrice: 30, image: '/uploads/products/water.svg' },
      { name: 'Hot Coffee', sku: 'BEV-005', basePrice: 150, sellingPrice: 200, costPrice: 50, image: '/uploads/products/coffee.svg' },
      { name: 'Green Tea', sku: 'BEV-006', basePrice: 120, sellingPrice: 180, costPrice: 40, image: '/uploads/products/green-tea.svg' },
    ],
    'Desserts': [
      { name: 'Chocolate Brownie', sku: 'DST-001', basePrice: 250, sellingPrice: 350, costPrice: 120, image: '/uploads/products/brownie.svg' },
      { name: 'Cheesecake Slice', sku: 'DST-002', basePrice: 300, sellingPrice: 400, costPrice: 150, image: '/uploads/products/cheesecake.svg' },
      { name: 'Ice Cream (2 Scoop)', sku: 'DST-003', basePrice: 200, sellingPrice: 280, costPrice: 80, image: '/uploads/products/icecream.svg' },
      { name: 'Gulab Jamun (4pcs)', sku: 'DST-004', basePrice: 180, sellingPrice: 250, costPrice: 70, image: '/uploads/products/gulab-jamun.svg' },
    ],
    'BBQ & Grills': [
      { name: 'Chicken Tikka (Full)', sku: 'BBQ-001', basePrice: 600, sellingPrice: 750, costPrice: 320, image: '/uploads/products/tikka.svg' },
      { name: 'Seekh Kabab (6pcs)', sku: 'BBQ-002', basePrice: 500, sellingPrice: 650, costPrice: 280, image: '/uploads/products/seekh-kabab.svg' },
      { name: 'Grilled Fish', sku: 'BBQ-003', basePrice: 700, sellingPrice: 900, costPrice: 380, image: '/uploads/products/grilled-fish.svg' },
      { name: 'Lamb Chops (4pcs)', sku: 'BBQ-004', basePrice: 900, sellingPrice: 1200, costPrice: 500, image: '/uploads/products/lamb-chops.svg' },
      { name: 'Mixed Grill Platter', sku: 'BBQ-005', basePrice: 1200, sellingPrice: 1500, costPrice: 650, image: '/uploads/products/mixed-grill.svg' },
    ],
    'Pasta': [
      { name: 'Spaghetti Bolognese', sku: 'PST-001', basePrice: 450, sellingPrice: 580, costPrice: 220, image: '/uploads/products/spaghetti.svg' },
      { name: 'Chicken Alfredo', sku: 'PST-002', basePrice: 500, sellingPrice: 650, costPrice: 250, image: '/uploads/products/alfredo.svg' },
      { name: 'Penne Arrabiata', sku: 'PST-003', basePrice: 400, sellingPrice: 520, costPrice: 200, image: '/uploads/products/penne.svg' },
    ],
    'Salads': [
      { name: 'Caesar Salad', sku: 'SLD-001', basePrice: 300, sellingPrice: 400, costPrice: 130, image: '/uploads/products/caesar-salad.svg' },
      { name: 'Greek Salad', sku: 'SLD-002', basePrice: 280, sellingPrice: 380, costPrice: 120, image: '/uploads/products/greek-salad.svg' },
      { name: 'Garden Fresh Salad', sku: 'SLD-003', basePrice: 200, sellingPrice: 280, costPrice: 80, image: '/uploads/products/garden-salad.svg' },
    ],
    'Sandwiches': [
      { name: 'Club Sandwich', sku: 'SND-001', basePrice: 350, sellingPrice: 450, costPrice: 170, image: '/uploads/products/club-sandwich.svg' },
      { name: 'Grilled Chicken Wrap', sku: 'SND-002', basePrice: 300, sellingPrice: 400, costPrice: 150, image: '/uploads/products/chicken-wrap.svg' },
      { name: 'Panini Italiano', sku: 'SND-003', basePrice: 380, sellingPrice: 480, costPrice: 180, image: '/uploads/products/panini.svg' },
    ],
    'Sides': [
      { name: 'French Fries', sku: 'SDE-001', basePrice: 150, sellingPrice: 200, costPrice: 60, image: '/uploads/products/fries.svg' },
      { name: 'Onion Rings', sku: 'SDE-002', basePrice: 180, sellingPrice: 250, costPrice: 70, image: '/uploads/products/onion-rings.svg' },
      { name: 'Garlic Bread', sku: 'SDE-003', basePrice: 200, sellingPrice: 280, costPrice: 80, image: '/uploads/products/garlic-bread.svg' },
      { name: 'Chicken Wings (6pcs)', sku: 'SDE-004', basePrice: 350, sellingPrice: 450, costPrice: 180, image: '/uploads/products/wings.svg' },
      { name: 'Mozzarella Sticks', sku: 'SDE-005', basePrice: 250, sellingPrice: 350, costPrice: 100, image: '/uploads/products/mozz-sticks.svg' },
    ],
    'Rice & Biryani': [
      { name: 'Chicken Biryani', sku: 'RCE-001', basePrice: 350, sellingPrice: 450, costPrice: 180, image: '/uploads/products/chicken-biryani.svg' },
      { name: 'Mutton Biryani', sku: 'RCE-002', basePrice: 500, sellingPrice: 650, costPrice: 280, image: '/uploads/products/mutton-biryani.svg' },
      { name: 'Pulao Rice', sku: 'RCE-003', basePrice: 200, sellingPrice: 280, costPrice: 100, image: '/uploads/products/pulao.svg' },
      { name: 'Egg Fried Rice', sku: 'RCE-004', basePrice: 250, sellingPrice: 350, costPrice: 120, image: '/uploads/products/fried-rice.svg' },
    ],
  };

  const allProducts = [];
  for (const [catName, products] of Object.entries(productsByCategory)) {
    const category = categories.find(c => c.name === catName);
    if (!category) continue;

    for (const p of products) {
      const stockQty = Math.floor(Math.random() * 80) + 20;
      const product = await tenantPrisma.product.create({
        data: {
          branchId: BRANCH_ID,
          categoryId: category.id,
          name: p.name,
          slug: p.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+$/, ''),
          sku: p.sku,
          description: `Delicious ${p.name} - freshly prepared`,
          basePrice: p.basePrice,
          sellingPrice: p.sellingPrice,
          costPrice: p.costPrice,
          taxRate: 16.00,
          hasVariations: false,
          trackStock: true,
          stockQuantity: stockQty,
          lowStockThreshold: 10,
          image: p.image,
          images: [p.image],
          isActive: true,
          isFeatured: Math.random() > 0.7,
          displayOrder: 0,
        }
      });
      product._stockQty = stockQty;
      allProducts.push(product);
    }
  }
  console.log(`   ✅ ${allProducts.length} products created\n`);

  // ============================================================
  // 6. CUSTOMERS
  // ============================================================
  console.log('👥 Seeding customers...');
  const customersData = [
    { name: 'Ali Ahmed', email: 'ali@example.com', phone: '+923001234567', address: 'House 15, Block C, DHA', city: 'Lahore' },
    { name: 'Sara Khan', email: 'sara@example.com', phone: '+923012345678', address: '45 Main Boulevard, Gulberg', city: 'Lahore' },
    { name: 'Hassan Raza', email: 'hassan@example.com', phone: '+923023456789', address: '78 Mall Road', city: 'Lahore' },
    { name: 'Fatima Noor', email: 'fatima@example.com', phone: '+923034567890', address: '12 Johar Town', city: 'Lahore' },
    { name: 'Usman Malik', email: 'usman@example.com', phone: '+923045678901', address: '90 Model Town', city: 'Lahore' },
    { name: 'Ayesha Siddique', email: 'ayesha@example.com', phone: '+923056789012', address: '34 Garden Town', city: 'Lahore' },
    { name: 'Bilal Shah', email: 'bilal@example.com', phone: '+923067890123', address: '56 Cavalry Ground', city: 'Lahore' },
    { name: 'Mehreen Iqbal', email: 'mehreen@example.com', phone: '+923078901234', address: '23 Bahria Town', city: 'Lahore' },
    { name: 'Zain Abbas', email: 'zain@example.com', phone: '+923089012345', address: '67 Wapda Town', city: 'Lahore' },
    { name: 'Nadia Aslam', email: 'nadia@example.com', phone: '+923090123456', address: '89 Township', city: 'Lahore' },
    { name: 'Tariq Mehmood', email: 'tariq@example.com', phone: '+923101234567', address: '112 Iqbal Town', city: 'Lahore' },
    { name: 'Sana Javed', email: 'sana@example.com', phone: '+923112345678', address: '56 Valencia Town', city: 'Lahore' },
    { name: 'Walk-in Customer', email: null, phone: null, address: null, city: null },
  ];

  const customers = [];
  for (const c of customersData) {
    const totalOrders = Math.floor(Math.random() * 20) + 1;
    const totalSpent = totalOrders * (Math.floor(Math.random() * 1500) + 500);
    const customer = await tenantPrisma.customer.create({
      data: {
        branchId: BRANCH_ID,
        name: c.name,
        email: c.email,
        phone: c.phone,
        address: c.address,
        city: c.city,
        loyaltyPoints: Math.floor(Math.random() * 500),
        totalOrders: totalOrders,
        totalSpent: totalSpent,
        isActive: true,
      }
    });
    customers.push(customer);
  }
  console.log(`   ✅ ${customers.length} customers created\n`);

  // ============================================================
  // 7. HALLS & TABLES
  // ============================================================
  console.log('🪑 Seeding halls & tables...');
  const hallsData = [
    { name: 'Main Hall', description: 'Ground floor main dining area with 8 tables', displayOrder: 1 },
    { name: 'VIP Section', description: 'Private VIP dining area for special guests', displayOrder: 2 },
    { name: 'Outdoor Patio', description: 'Open-air outdoor seating area', displayOrder: 3 },
  ];

  const halls = [];
  for (const h of hallsData) {
    const hall = await tenantPrisma.hall.create({
      data: {
        branchId: BRANCH_ID,
        name: h.name,
        description: h.description,
        isActive: true,
        displayOrder: h.displayOrder,
      }
    });
    halls.push(hall);
  }

  const tablesData = [
    // Main Hall - 8 tables
    ...Array.from({ length: 8 }, (_, i) => ({
      hallId: halls[0].id, name: `T${i + 1}`, capacity: [2, 4, 4, 6, 4, 2, 4, 8][i],
      shape: ['square', 'square', 'rectangle', 'rectangle', 'round', 'square', 'square', 'rectangle'][i],
      positionX: (i % 4) * 120 + 50, positionY: Math.floor(i / 4) * 120 + 50, displayOrder: i + 1,
    })),
    // VIP Section - 4 tables
    ...Array.from({ length: 4 }, (_, i) => ({
      hallId: halls[1].id, name: `VIP-${i + 1}`, capacity: [4, 6, 8, 10][i],
      shape: ['round', 'rectangle', 'rectangle', 'rectangle'][i],
      positionX: (i % 2) * 150 + 80, positionY: Math.floor(i / 2) * 150 + 80, displayOrder: i + 1,
    })),
    // Outdoor - 4 tables
    ...Array.from({ length: 4 }, (_, i) => ({
      hallId: halls[2].id, name: `OUT-${i + 1}`, capacity: [2, 4, 4, 6][i],
      shape: ['round', 'round', 'square', 'rectangle'][i],
      positionX: (i % 2) * 130 + 60, positionY: Math.floor(i / 2) * 130 + 60, displayOrder: i + 1,
    })),
  ];

  const tables = [];
  for (const t of tablesData) {
    const table = await tenantPrisma.table.create({
      data: {
        branchId: BRANCH_ID,
        hallId: t.hallId,
        name: t.name,
        capacity: t.capacity,
        status: 'available',
        shape: t.shape,
        positionX: t.positionX,
        positionY: t.positionY,
        isActive: true,
        displayOrder: t.displayOrder,
      }
    });
    tables.push(table);
  }
  console.log(`   ✅ ${halls.length} halls, ${tables.length} tables created\n`);

  // ============================================================
  // 8. CHART OF ACCOUNTS
  // ============================================================
  console.log('📊 Seeding chart of accounts...');
  const accountsData = [
    // Assets
    { code: '1000', name: 'Assets', type: 'asset', parentCode: null, level: 1, isSystem: true },
    { code: '1100', name: 'Cash & Bank', type: 'asset', parentCode: '1000', level: 2, isSystem: true },
    { code: '1101', name: 'Cash in Hand', type: 'asset', parentCode: '1100', level: 3, isSystem: true, balance: 50000 },
    { code: '1102', name: 'Bank Account - HBL', type: 'asset', parentCode: '1100', level: 3, isSystem: true, balance: 250000 },
    { code: '1103', name: 'Bank Account - Meezan', type: 'asset', parentCode: '1100', level: 3, isSystem: false, balance: 100000 },
    { code: '1200', name: 'Accounts Receivable', type: 'asset', parentCode: '1000', level: 2, isSystem: true },
    { code: '1201', name: 'Customer Receivables', type: 'asset', parentCode: '1200', level: 3, isSystem: false, balance: 15000 },
    { code: '1300', name: 'Inventory', type: 'asset', parentCode: '1000', level: 2, isSystem: true },
    { code: '1301', name: 'Food Inventory', type: 'asset', parentCode: '1300', level: 3, isSystem: false, balance: 120000 },
    { code: '1302', name: 'Beverage Inventory', type: 'asset', parentCode: '1300', level: 3, isSystem: false, balance: 45000 },
    { code: '1303', name: 'Packaging Supplies', type: 'asset', parentCode: '1300', level: 3, isSystem: false, balance: 8000 },
    { code: '1400', name: 'Fixed Assets', type: 'asset', parentCode: '1000', level: 2, isSystem: true },
    { code: '1401', name: 'Kitchen Equipment', type: 'asset', parentCode: '1400', level: 3, isSystem: false, balance: 350000 },
    { code: '1402', name: 'Furniture & Fixtures', type: 'asset', parentCode: '1400', level: 3, isSystem: false, balance: 200000 },

    // Liabilities
    { code: '2000', name: 'Liabilities', type: 'liability', parentCode: null, level: 1, isSystem: true },
    { code: '2100', name: 'Accounts Payable', type: 'liability', parentCode: '2000', level: 2, isSystem: true },
    { code: '2101', name: 'Supplier Payables', type: 'liability', parentCode: '2100', level: 3, isSystem: false, balance: 85000 },
    { code: '2102', name: 'Vendor Payables', type: 'liability', parentCode: '2100', level: 3, isSystem: false, balance: 25000 },
    { code: '2200', name: 'Tax Payable', type: 'liability', parentCode: '2000', level: 2, isSystem: true },
    { code: '2201', name: 'GST Payable', type: 'liability', parentCode: '2200', level: 3, isSystem: true, balance: 12000 },
    { code: '2300', name: 'Other Payables', type: 'liability', parentCode: '2000', level: 2, isSystem: false },
    { code: '2301', name: 'Salary Payable', type: 'liability', parentCode: '2300', level: 3, isSystem: false, balance: 45000 },

    // Equity
    { code: '3000', name: 'Equity', type: 'equity', parentCode: null, level: 1, isSystem: true },
    { code: '3100', name: "Owner's Capital", type: 'equity', parentCode: '3000', level: 2, isSystem: true, balance: 500000 },
    { code: '3200', name: 'Retained Earnings', type: 'equity', parentCode: '3000', level: 2, isSystem: true, balance: 150000 },
    { code: '3300', name: 'Drawings', type: 'equity', parentCode: '3000', level: 2, isSystem: false, balance: 0 },

    // Revenue
    { code: '4000', name: 'Revenue', type: 'revenue', parentCode: null, level: 1, isSystem: true },
    { code: '4100', name: 'Sales Revenue', type: 'revenue', parentCode: '4000', level: 2, isSystem: true },
    { code: '4101', name: 'Food Sales', type: 'revenue', parentCode: '4100', level: 3, isSystem: false, balance: 320000 },
    { code: '4102', name: 'Beverage Sales', type: 'revenue', parentCode: '4100', level: 3, isSystem: false, balance: 80000 },
    { code: '4103', name: 'Delivery Revenue', type: 'revenue', parentCode: '4100', level: 3, isSystem: false, balance: 25000 },
    { code: '4200', name: 'Other Income', type: 'revenue', parentCode: '4000', level: 2, isSystem: false },
    { code: '4201', name: 'Service Charges', type: 'revenue', parentCode: '4200', level: 3, isSystem: false, balance: 5000 },
    { code: '4202', name: 'Catering Income', type: 'revenue', parentCode: '4200', level: 3, isSystem: false, balance: 15000 },

    // Expenses
    { code: '5000', name: 'Expenses', type: 'expense', parentCode: null, level: 1, isSystem: true },
    { code: '5100', name: 'Cost of Goods Sold', type: 'expense', parentCode: '5000', level: 2, isSystem: true },
    { code: '5101', name: 'Food COGS', type: 'expense', parentCode: '5100', level: 3, isSystem: false, balance: 160000 },
    { code: '5102', name: 'Beverage COGS', type: 'expense', parentCode: '5100', level: 3, isSystem: false, balance: 35000 },
    { code: '5200', name: 'Operating Expenses', type: 'expense', parentCode: '5000', level: 2, isSystem: true },
    { code: '5201', name: 'Rent', type: 'expense', parentCode: '5200', level: 3, isSystem: false, balance: 80000 },
    { code: '5202', name: 'Electricity', type: 'expense', parentCode: '5200', level: 3, isSystem: false, balance: 15000 },
    { code: '5203', name: 'Gas', type: 'expense', parentCode: '5200', level: 3, isSystem: false, balance: 8000 },
    { code: '5204', name: 'Water', type: 'expense', parentCode: '5200', level: 3, isSystem: false, balance: 2000 },
    { code: '5205', name: 'Internet & Phone', type: 'expense', parentCode: '5200', level: 3, isSystem: false, balance: 5000 },
    { code: '5300', name: 'Payroll', type: 'expense', parentCode: '5000', level: 2, isSystem: true },
    { code: '5301', name: 'Kitchen Staff Salaries', type: 'expense', parentCode: '5300', level: 3, isSystem: false, balance: 80000 },
    { code: '5302', name: 'Waiter Salaries', type: 'expense', parentCode: '5300', level: 3, isSystem: false, balance: 50000 },
    { code: '5303', name: 'Manager Salary', type: 'expense', parentCode: '5300', level: 3, isSystem: false, balance: 40000 },
    { code: '5400', name: 'Marketing & Advertising', type: 'expense', parentCode: '5000', level: 2, isSystem: false },
    { code: '5401', name: 'Social Media Ads', type: 'expense', parentCode: '5400', level: 3, isSystem: false, balance: 10000 },
    { code: '5402', name: 'Printed Materials', type: 'expense', parentCode: '5400', level: 3, isSystem: false, balance: 3000 },
    { code: '5500', name: 'Maintenance', type: 'expense', parentCode: '5000', level: 2, isSystem: false },
    { code: '5501', name: 'Equipment Repairs', type: 'expense', parentCode: '5500', level: 3, isSystem: false, balance: 12000 },
    { code: '5502', name: 'Cleaning Supplies', type: 'expense', parentCode: '5500', level: 3, isSystem: false, balance: 5000 },
  ];

  const accountMap = {};
  for (const a of accountsData) {
    const parentId = a.parentCode ? accountMap[a.parentCode] : null;
    const account = await tenantPrisma.account.create({
      data: {
        branchId: BRANCH_ID,
        code: a.code,
        name: a.name,
        type: a.type,
        parentId: parentId,
        level: a.level,
        balance: a.balance || 0,
        isSystem: a.isSystem,
        isActive: true,
      }
    });
    accountMap[a.code] = account.id;
  }
  console.log(`   ✅ ${Object.keys(accountMap).length} accounts created\n`);

  // ============================================================
  // 9. ORDERS (Historical - last 30 days)
  // ============================================================
  console.log('📦 Seeding orders...');

  const orderStatuses = ['completed', 'completed', 'completed', 'completed', 'completed', 'completed', 'completed', 'cancelled'];
  const paymentMethods = ['cash', 'cash', 'cash', 'card', 'card', 'cash', 'online'];
  const orderTypes = ['dine_in', 'dine_in', 'dine_in', 'take_away', 'take_away', 'delivery', 'dine_in'];

  let orderCount = 0;
  for (let day = 29; day >= 0; day--) {
    const ordersPerDay = Math.floor(Math.random() * 8) + 5;

    for (let o = 0; o < ordersPerDay; o++) {
      const status = orderStatuses[Math.floor(Math.random() * orderStatuses.length)];
      const paymentMethod = paymentMethods[Math.floor(Math.random() * paymentMethods.length)];
      const orderType = orderTypes[Math.floor(Math.random() * orderTypes.length)];
      const customerId = Math.random() > 0.3 ? customers[Math.floor(Math.random() * (customers.length - 1))].id : null;
      const tableId = orderType === 'dine_in' ? tables[Math.floor(Math.random() * 8)].id : null;

      const itemCount = Math.floor(Math.random() * 4) + 1;
      const selectedProducts = [];
      for (let i = 0; i < itemCount; i++) {
        const p = allProducts[Math.floor(Math.random() * allProducts.length)];
        if (!selectedProducts.find(sp => sp.id === p.id)) {
          selectedProducts.push(p);
        }
      }

      let subtotal = 0;
      const orderItems = selectedProducts.map(p => {
        const qty = Math.floor(Math.random() * 3) + 1;
        const itemTotal = Number(p.sellingPrice) * qty;
        subtotal += itemTotal;
        return {
          productId: p.id,
          productName: p.name,
          sku: p.sku,
          quantity: qty,
          unitPrice: Number(p.sellingPrice),
          costPrice: Number(p.costPrice),
          discountAmount: 0,
          taxAmount: Math.round(itemTotal * 0.16 * 100) / 100,
          total: itemTotal,
          status: status === 'cancelled' ? 'cancelled' : 'served',
        };
      });

      const taxAmount = Math.round(subtotal * 0.16 * 100) / 100;
      const total = subtotal + taxAmount;
      const isCancelled = status === 'cancelled';

      const orderDate = new Date();
      orderDate.setDate(orderDate.getDate() - day);
      orderDate.setHours(Math.floor(Math.random() * 12) + 10, Math.floor(Math.random() * 60), 0, 0);

      orderCount++;
      const orderNumber = `ORD-${String(orderCount).padStart(6, '0')}`;

      try {
        await tenantPrisma.order.create({
          data: {
            branchId: BRANCH_ID,
            customerId: customerId,
            userId: ADMIN_USER_ID,
            tableId: tableId,
            orderNumber: orderNumber,
            orderType: orderType,
            orderSource: 'pos',
            subtotal: subtotal,
            taxRate: 16.00,
            taxAmount: taxAmount,
            total: total,
            paymentStatus: isCancelled ? 'pending' : 'paid',
            paymentMethod: paymentMethod,
            paidAmount: isCancelled ? 0 : total,
            changeAmount: isCancelled ? 0 : (paymentMethod === 'cash' ? Math.max(0, Math.ceil(total / 100) * 100 - total) : 0),
            status: status,
            completedAt: !isCancelled ? orderDate : null,
            cancelledAt: isCancelled ? orderDate : null,
            cancelledById: isCancelled ? ADMIN_USER_ID : null,
            createdAt: orderDate,
            updatedAt: orderDate,
            items: {
              create: orderItems,
            },
          },
        });
      } catch (err) {
        console.log(`   ⚠️ Order ${orderNumber} skipped: ${err.message.substring(0, 100)}`);
        orderCount--;
      }
    }
  }
  console.log(`   ✅ ${orderCount} orders created\n`);

  // ============================================================
  // 10. NOTIFICATIONS
  // ============================================================
  console.log('🔔 Seeding notifications...');
  const notificationsData = [
    { type: 'system', title: 'Welcome to Vision POS!', message: 'Your POS system is ready to use. Start by exploring the dashboard and POS screen.', daysAgo: 7 },
    { type: 'system', title: 'System Update Available', message: 'A new update is available with performance improvements and bug fixes.', daysAgo: 5 },
    { type: 'order_created', title: 'New Order #ORD-000001', message: 'A new dine-in order has been placed at Table T1.', daysAgo: 3 },
    { type: 'order_ready', title: 'Order #ORD-000005 Ready', message: 'Order #ORD-000005 is ready to be served at Table T3.', daysAgo: 3 },
    { type: 'low_stock', title: 'Low Stock Alert', message: 'Classic Beef Burger stock is running low (5 remaining). Please reorder.', daysAgo: 2 },
    { type: 'low_stock', title: 'Low Stock Alert', message: 'French Fries stock is running low (3 remaining). Please reorder.', daysAgo: 2 },
    { type: 'payment_received', title: 'Payment Received', message: 'Payment of Rs. 1,550 received for Order #ORD-000010 via cash.', daysAgo: 1 },
    { type: 'new_customer', title: 'New Customer Registered', message: 'Ali Ahmed has been added as a new customer.', daysAgo: 1 },
    { type: 'order_cancelled', title: 'Order Cancelled', message: 'Order #ORD-000015 has been cancelled. Reason: Customer changed mind.', daysAgo: 0 },
    { type: 'system', title: 'Daily Report Ready', message: 'Your daily sales report for today is ready. Total sales: Rs. 45,500.', daysAgo: 0 },
  ];

  for (const n of notificationsData) {
    const createdAt = new Date();
    createdAt.setDate(createdAt.getDate() - n.daysAgo);
    await tenantPrisma.notification.create({
      data: {
        branchId: BRANCH_ID,
        userId: ADMIN_USER_ID,
        type: n.type,
        title: n.title,
        message: n.message,
        channel: 'in_app',
        isRead: n.daysAgo > 3,
        sound: 'default',
        createdAt: createdAt,
      }
    });
  }
  console.log(`   ✅ ${notificationsData.length} notifications created\n`);

  // ============================================================
  // 11. INVENTORY MOVEMENTS
  // ============================================================
  console.log('📦 Seeding inventory movements...');
  let movementCount = 0;
  for (const product of allProducts.slice(0, 20)) {
    const currentStock = product._stockQty || 50;
    await tenantPrisma.inventoryMovement.create({
      data: {
        branchId: BRANCH_ID,
        productId: product.id,
        userId: ADMIN_USER_ID,
        type: 'in',
        reason: 'opening',
        quantity: currentStock + 50,
        quantityBefore: 0,
        quantityAfter: currentStock + 50,
        notes: 'Opening stock',
        createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      }
    });
    movementCount++;

    await tenantPrisma.inventoryMovement.create({
      data: {
        branchId: BRANCH_ID,
        productId: product.id,
        userId: ADMIN_USER_ID,
        type: 'out',
        reason: 'sale',
        quantity: 50,
        quantityBefore: currentStock + 50,
        quantityAfter: currentStock,
        notes: 'Sales deduction for the month',
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      }
    });
    movementCount++;
  }

  // Make some products low stock + create alerts
  for (const product of allProducts.slice(0, 5)) {
    const lowQty = Math.floor(Math.random() * 8) + 2;
    await tenantPrisma.product.update({
      where: { id: product.id },
      data: { stockQuantity: lowQty }
    });

    await tenantPrisma.stockAlert.create({
      data: {
        branchId: BRANCH_ID,
        productId: product.id,
        productName: product.name,
        sku: product.sku,
        currentStock: lowQty,
        minStock: 10,
        status: 'active',
      }
    });
  }
  console.log(`   ✅ ${movementCount} inventory movements + 5 stock alerts created\n`);

  // ============================================================
  // 12. PRODUCT STOCK RECORDS
  // ============================================================
  console.log('📊 Seeding product stock records...');
  let stockCount = 0;
  for (const product of allProducts) {
    const currentProduct = await tenantPrisma.product.findUnique({ where: { id: product.id } });
    await tenantPrisma.productStock.create({
      data: {
        productId: product.id,
        branchId: BRANCH_ID,
        stockQuantity: currentProduct.stockQuantity,
      }
    });
    stockCount++;
  }
  console.log(`   ✅ ${stockCount} product stock records created\n`);

  // ============================================================
  // 13. TRANSACTIONS
  // ============================================================
  console.log('💳 Seeding transactions...');
  const transactionsData = [
    { type: 'sale', debit: 320000, credit: 0, desc: 'Food sales - monthly total', dayAgo: 1 },
    { type: 'sale', debit: 80000, credit: 0, desc: 'Beverage sales - monthly total', dayAgo: 1 },
    { type: 'expense', debit: 0, credit: 80000, desc: 'Monthly rent payment', dayAgo: 5 },
    { type: 'expense', debit: 0, credit: 25000, desc: 'Utility bills (electricity + gas)', dayAgo: 8 },
    { type: 'expense', debit: 0, credit: 150000, desc: 'Staff salaries payment', dayAgo: 2 },
    { type: 'expense', debit: 0, credit: 15000, desc: 'Kitchen supplies purchase', dayAgo: 10 },
    { type: 'sale', debit: 25000, credit: 0, desc: 'Delivery orders revenue', dayAgo: 3 },
    { type: 'expense', debit: 0, credit: 10000, desc: 'Social media advertising', dayAgo: 15 },
    { type: 'adjustment', debit: 5000, credit: 0, desc: 'Service charges collected', dayAgo: 1 },
    { type: 'expense', debit: 0, credit: 12000, desc: 'Equipment repair & maintenance', dayAgo: 12 },
  ];

  let txnBalance = 50000;
  for (let i = 0; i < transactionsData.length; i++) {
    const t = transactionsData[i];
    txnBalance += t.debit - t.credit;
    const createdAt = new Date();
    createdAt.setDate(createdAt.getDate() - t.dayAgo);

    await tenantPrisma.transaction.create({
      data: {
        branchId: BRANCH_ID,
        transactionId: `TXN-${String(i + 1).padStart(6, '0')}`,
        type: t.type,
        description: t.desc,
        debit: t.debit,
        credit: t.credit,
        balance: txnBalance,
        createdAt: createdAt,
      }
    });
  }
  console.log(`   ✅ ${transactionsData.length} transactions created\n`);

  // ============================================================
  // 14. JOURNAL ENTRIES
  // ============================================================
  console.log('📒 Seeding journal entries...');
  const journalEntries = [
    {
      entryNumber: 'JE-000001', entryDate: new Date(Date.now() - 25 * 86400000),
      description: 'Opening balances', reference: 'OB-001',
      totalDebit: 500000, totalCredit: 500000,
      lines: [
        { accountCode: '1101', debit: 50000, credit: 0, description: 'Cash in hand opening' },
        { accountCode: '1102', debit: 250000, credit: 0, description: 'HBL bank opening' },
        { accountCode: '1401', debit: 200000, credit: 0, description: 'Kitchen equipment' },
        { accountCode: '3100', debit: 0, credit: 500000, description: "Owner's capital" },
      ]
    },
    {
      entryNumber: 'JE-000002', entryDate: new Date(Date.now() - 20 * 86400000),
      description: 'Monthly rent payment', reference: 'RENT-001',
      totalDebit: 80000, totalCredit: 80000,
      lines: [
        { accountCode: '5201', debit: 80000, credit: 0, description: 'Rent expense' },
        { accountCode: '1102', debit: 0, credit: 80000, description: 'Bank payment' },
      ]
    },
    {
      entryNumber: 'JE-000003', entryDate: new Date(Date.now() - 10 * 86400000),
      description: 'Inventory purchase', reference: 'PO-001',
      totalDebit: 120000, totalCredit: 120000,
      lines: [
        { accountCode: '1301', debit: 120000, credit: 0, description: 'Food inventory' },
        { accountCode: '2101', debit: 0, credit: 120000, description: 'Supplier payable' },
      ]
    },
    {
      entryNumber: 'JE-000004', entryDate: new Date(Date.now() - 5 * 86400000),
      description: 'Staff salaries', reference: 'SAL-001',
      totalDebit: 170000, totalCredit: 170000,
      lines: [
        { accountCode: '5301', debit: 80000, credit: 0, description: 'Kitchen staff' },
        { accountCode: '5302', debit: 50000, credit: 0, description: 'Waiters' },
        { accountCode: '5303', debit: 40000, credit: 0, description: 'Manager' },
        { accountCode: '1102', debit: 0, credit: 170000, description: 'Bank payment' },
      ]
    },
  ];

  for (const je of journalEntries) {
    await tenantPrisma.journalEntry.create({
      data: {
        branchId: BRANCH_ID,
        entryNumber: je.entryNumber,
        entryDate: je.entryDate,
        description: je.description,
        reference: je.reference,
        totalDebit: je.totalDebit,
        totalCredit: je.totalCredit,
        status: 'posted',
        lines: {
          create: je.lines.map(l => ({
            accountId: accountMap[l.accountCode],
            description: l.description,
            debit: l.debit,
            credit: l.credit,
          })),
        },
      },
    });
  }
  console.log(`   ✅ ${journalEntries.length} journal entries created\n`);

  // ============================================================
  // 15. PRINTERS
  // ============================================================
  console.log('🖨️  Seeding printers...');
  const printers = [
    { name: 'Receipt Printer', type: 'thermal', connection: 'usb', width: 80, isDefault: true, printReceipt: true, printKitchen: false },
    { name: 'Kitchen Printer', type: 'thermal', connection: 'network', address: '192.168.1.100', width: 80, isDefault: false, printReceipt: false, printKitchen: true },
    { name: 'Bar Printer', type: 'thermal', connection: 'network', address: '192.168.1.101', width: 80, isDefault: false, printReceipt: false, printKitchen: true },
  ];

  for (const p of printers) {
    await tenantPrisma.printer.create({
      data: { branchId: BRANCH_ID, ...p, isActive: true }
    });
  }
  console.log(`   ✅ ${printers.length} printers created\n`);

  // ============================================================
  // 16. MENUS
  // ============================================================
  console.log('📋 Seeding menus...');
  const mainMenu = await tenantPrisma.menu.create({
    data: {
      branchId: BRANCH_ID,
      name: 'Main Menu',
      description: 'Full restaurant menu available all day',
      activeTimeFrom: '10:00',
      activeTimeTo: '23:00',
      activeDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      isActive: true,
      displayOrder: 1,
    }
  });

  for (let i = 0; i < allProducts.length; i++) {
    await tenantPrisma.menuProduct.create({
      data: { menuId: mainMenu.id, productId: allProducts[i].id, displayOrder: i + 1 }
    });
  }

  const lunchMenu = await tenantPrisma.menu.create({
    data: {
      branchId: BRANCH_ID,
      name: 'Lunch Special',
      description: 'Special lunch deals 12-3 PM',
      activeTimeFrom: '12:00',
      activeTimeTo: '15:00',
      activeDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
      isActive: true,
      displayOrder: 2,
    }
  });

  const lunchProducts = allProducts.filter(p =>
    ['RCE-001', 'RCE-002', 'BRG-001', 'BRG-002', 'BEV-003', 'SDE-001'].includes(p.sku)
  );
  for (let i = 0; i < lunchProducts.length; i++) {
    await tenantPrisma.menuProduct.create({
      data: {
        menuId: lunchMenu.id,
        productId: lunchProducts[i].id,
        customPrice: Math.round(Number(lunchProducts[i].sellingPrice) * 0.85),
        displayOrder: i + 1,
      }
    });
  }
  console.log(`   ✅ 2 menus created\n`);

  // ============================================================
  // DONE
  // ============================================================
  console.log('═══════════════════════════════════════════════════');
  console.log('  ✅  DEMO DATA SEEDING COMPLETED SUCCESSFULLY!  ');
  console.log('═══════════════════════════════════════════════════');
  console.log('\n📋 Summary:');
  console.log(`   • Settings:            6 groups`);
  console.log(`   • Tax Settings:        ${taxes.length}`);
  console.log(`   • Discount Settings:   ${discounts.length}`);
  console.log(`   • Categories:          ${categories.length}`);
  console.log(`   • Products:            ${allProducts.length}`);
  console.log(`   • Customers:           ${customers.length}`);
  console.log(`   • Halls:               ${halls.length}`);
  console.log(`   • Tables:              ${tables.length}`);
  console.log(`   • Chart of Accounts:   ${Object.keys(accountMap).length}`);
  console.log(`   • Orders:              ~${orderCount}`);
  console.log(`   • Notifications:       ${notificationsData.length}`);
  console.log(`   • Inventory Movements: ${movementCount}`);
  console.log(`   • Transactions:        ${transactionsData.length}`);
  console.log(`   • Journal Entries:     ${journalEntries.length}`);
  console.log(`   • Printers:            ${printers.length}`);
  console.log(`   • Menus:               2`);
  console.log(`\n🔑 Login: admin@demo.com / admin123`);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await tenantPrisma.$disconnect();
  });
