/**
 * Restore Demo Data for tenant_1
 * Run: cd vision-backend && node prisma/seed-restore.js
 */

const { PrismaClient } = require('.prisma/tenant-client');

const prisma = new PrismaClient({
  datasources: { db: { url: 'mysql://root:1223@localhost:3306/tenant_1' } }
});

const BRANCH_ID = 1;

async function main() {
  console.log('🌱 Restoring demo data for tenant_1...\n');

  // ============================================================
  // 1. BRANCH
  // ============================================================
  let branch = await prisma.branch.findFirst({ where: { code: 'MAIN' } });
  if (!branch) {
    branch = await prisma.branch.create({
      data: {
        code: 'MAIN',
        name: 'Main Branch',
        address: '123 Demo Street, F-7 Markaz, Islamabad',
        city: 'Islamabad',
        phone: '+923001234567',
        email: 'main@demo-restaurant.com',
        isMain: true,
        isActive: true,
        settings: { currency: 'PKR', timezone: 'Asia/Karachi', tax_rate: 16 }
      }
    });
    console.log('✅ Branch created, id:', branch.id);
  } else {
    console.log('ℹ️  Branch exists, id:', branch.id);
  }

  // ============================================================
  // 2. BRANCH USERS
  // ============================================================
  const systemUsers = [
    { systemUserId: 1, roleId: 1, name: 'Demo Admin', email: 'admin@demo.com', phone: '+1234567890' },
    { systemUserId: 2, roleId: 2, name: 'Manager User', email: 'manager@demo.com', phone: '+1234567891' },
    { systemUserId: 3, roleId: 3, name: 'Kitchen Staff', email: 'kitchen@demo.com', phone: '+1234567892' },
    { systemUserId: 4, roleId: 4, name: 'Cashier User', email: 'cashier@demo.com', phone: '+1234567893' },
    { systemUserId: 5, roleId: 5, name: 'Receptionist', email: 'reception@demo.com', phone: '+1234567894' },
  ];

  let adminBranchUserId = null;
  for (const u of systemUsers) {
    const existing = await prisma.branchUser.findFirst({
      where: { systemUserId: u.systemUserId, branchId: branch.id }
    });
    if (!existing) {
      const bu = await prisma.branchUser.create({
        data: { branchId: branch.id, ...u, isActive: true }
      });
      console.log('✅ Branch user created:', u.name, '(id:', bu.id + ')');
      if (u.systemUserId === 1) adminBranchUserId = bu.id;
    } else {
      console.log('ℹ️  Branch user exists:', u.name, '(id:', existing.id + ')');
      if (u.systemUserId === 1) adminBranchUserId = existing.id;
    }
  }

  const ADMIN_USER_ID = adminBranchUserId;
  console.log('📌 Admin branch_user ID:', ADMIN_USER_ID, '\n');

  // ============================================================
  // 3. SETTINGS
  // ============================================================
  const settingsData = [
    { key: 'general', value: { business_name: 'Vision POS Restaurant', currency: 'PKR', currency_symbol: '₨', date_format: 'DD/MM/YYYY', time_format: 'HH:mm', timezone: 'Asia/Karachi', language: 'en' } },
    { key: 'tax', value: { enabled: true, type: 'exclusive', default_rate: 16, tax_number: 'NTN-1234567', tax_label: 'GST' } },
    { key: 'receipt', value: { header: 'Vision POS Restaurant', subheader: 'Delicious Food, Great Service', footer: 'Thank you for dining with us!', show_logo: true, show_barcode: true, paper_width: 80, show_customer: true, show_tax_details: true } },
    { key: 'pos', value: { allow_negative_stock: false, low_stock_alert: true, require_customer: false, quick_cash_amounts: [100, 500, 1000, 2000, 5000], default_order_type: 'dine_in', auto_print: true, sound_enabled: true } },
    { key: 'kitchen', value: { auto_accept: false, preparation_time: 15, notify_on_ready: true, display_mode: 'queue' } },
    { key: 'notification', value: { order_created: true, order_ready: true, low_stock: true, new_customer: true, sound: 'default' } },
  ];
  for (const s of settingsData) {
    await prisma.setting.upsert({ where: { key: s.key }, update: { value: s.value }, create: s });
  }
  console.log('✅ Settings created');

  // ============================================================
  // 4. TAX SETTINGS
  // ============================================================
  try {
    const taxes = [
      { branchId: branch.id, name: 'GST 16%', rate: 16.00, type: 'exclusive', isDefault: true, isActive: true },
      { branchId: branch.id, name: 'Service Tax 5%', rate: 5.00, type: 'exclusive', isDefault: false, isActive: true },
      { branchId: branch.id, name: 'No Tax', rate: 0.00, type: 'exclusive', isDefault: false, isActive: true },
    ];
    for (const t of taxes) { await prisma.taxSetting.create({ data: t }); }
    console.log('✅ Tax settings created');
  } catch (e) { console.log('⚠️  Tax settings skipped:', e.message.substring(0, 80)); }

  // ============================================================
  // 5. DISCOUNT SETTINGS
  // ============================================================
  try {
    const discounts = [
      { branchId: branch.id, name: '10% Off', type: 'percentage', value: 10.00, minOrder: 500.00, isActive: true },
      { branchId: branch.id, name: '20% Off', type: 'percentage', value: 20.00, minOrder: 1000.00, isActive: true },
      { branchId: branch.id, name: 'Rs. 100 Off', type: 'fixed', value: 100.00, minOrder: 500.00, isActive: true },
    ];
    for (const d of discounts) { await prisma.discountSetting.create({ data: d }); }
    console.log('✅ Discount settings created');
  } catch (e) { console.log('⚠️  Discount settings skipped:', e.message.substring(0, 80)); }

  // ============================================================
  // 6. CATEGORIES
  // ============================================================
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
    const cat = await prisma.category.create({
      data: { branchId: branch.id, name: c.name, slug: c.slug, description: c.description, color: c.color, icon: c.icon, kitchen: c.kitchen, displayOrder: c.displayOrder, isActive: true }
    });
    categories.push(cat);
  }
  console.log(`✅ ${categories.length} categories created`);

  // ============================================================
  // 7. PRODUCTS
  // ============================================================
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
      const product = await prisma.product.create({
        data: {
          branchId: branch.id, categoryId: category.id,
          name: p.name, slug: p.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+$/, ''),
          sku: p.sku, description: `Delicious ${p.name} - freshly prepared`,
          unit: 'pieces',
          basePrice: p.basePrice, sellingPrice: p.sellingPrice, costPrice: p.costPrice,
          taxRate: 16.00, hasVariations: false, trackStock: true,
          stockQuantity: stockQty, lowStockThreshold: 10,
          image: p.image, images: [p.image],
          isActive: true, isFeatured: Math.random() > 0.7, displayOrder: 0,
        }
      });
      product._stockQty = stockQty;
      allProducts.push(product);
    }
  }
  console.log(`✅ ${allProducts.length} products created`);

  // ============================================================
  // 8. CUSTOMERS
  // ============================================================
  const customersData = [
    { name: 'Ali Ahmed', email: 'ali@example.com', phone: '+923001234567', address: 'House 15, Block C, DHA', city: 'Lahore' },
    { name: 'Sara Khan', email: 'sara@example.com', phone: '+923012345678', address: '45 Main Boulevard, Gulberg', city: 'Lahore' },
    { name: 'Hassan Raza', email: 'hassan@example.com', phone: '+923023456789', address: '78 Mall Road', city: 'Lahore' },
    { name: 'Fatima Noor', email: 'fatima@example.com', phone: '+923034567890', address: '12 Johar Town', city: 'Lahore' },
    { name: 'Usman Malik', email: 'usman@example.com', phone: '+923045678901', address: '90 Model Town', city: 'Lahore' },
    { name: 'Ayesha Siddique', email: 'ayesha@example.com', phone: '+923056789012', address: '34 Garden Town', city: 'Lahore' },
    { name: 'Walk-in Customer', email: null, phone: null, address: null, city: null },
  ];

  const customers = [];
  for (const c of customersData) {
    const customer = await prisma.customer.create({
      data: {
        branchId: branch.id, name: c.name, email: c.email, phone: c.phone,
        address: c.address, city: c.city,
        loyaltyPoints: Math.floor(Math.random() * 500),
        totalOrders: Math.floor(Math.random() * 20) + 1,
        totalSpent: Math.floor(Math.random() * 15000) + 500,
        isActive: true,
      }
    });
    customers.push(customer);
  }
  console.log(`✅ ${customers.length} customers created`);

  // ============================================================
  // 9. HALLS & TABLES
  // ============================================================
  const hallsData = [
    { name: 'Main Hall', description: 'Ground floor main dining area', displayOrder: 1 },
    { name: 'VIP Section', description: 'Private VIP dining area', displayOrder: 2 },
    { name: 'Outdoor Patio', description: 'Open-air outdoor seating', displayOrder: 3 },
  ];

  const halls = [];
  for (const h of hallsData) {
    const hall = await prisma.hall.create({
      data: { branchId: branch.id, name: h.name, description: h.description, isActive: true, displayOrder: h.displayOrder }
    });
    halls.push(hall);
  }

  const tablesData = [
    ...Array.from({ length: 8 }, (_, i) => ({
      hallId: halls[0].id, name: `T${i + 1}`, capacity: [2, 4, 4, 6, 4, 2, 4, 8][i],
      shape: ['square', 'square', 'rectangle', 'rectangle', 'round', 'square', 'square', 'rectangle'][i],
      positionX: (i % 4) * 120 + 50, positionY: Math.floor(i / 4) * 120 + 50, displayOrder: i + 1,
    })),
    ...Array.from({ length: 4 }, (_, i) => ({
      hallId: halls[1].id, name: `VIP-${i + 1}`, capacity: [4, 6, 8, 10][i],
      shape: ['round', 'rectangle', 'rectangle', 'rectangle'][i],
      positionX: (i % 2) * 150 + 80, positionY: Math.floor(i / 2) * 150 + 80, displayOrder: i + 1,
    })),
    ...Array.from({ length: 4 }, (_, i) => ({
      hallId: halls[2].id, name: `OUT-${i + 1}`, capacity: [2, 4, 4, 6][i],
      shape: ['round', 'round', 'square', 'rectangle'][i],
      positionX: (i % 2) * 130 + 60, positionY: Math.floor(i / 2) * 130 + 60, displayOrder: i + 1,
    })),
  ];

  const tables = [];
  for (const t of tablesData) {
    const table = await prisma.table.create({
      data: {
        branchId: branch.id, hallId: t.hallId, name: t.name, capacity: t.capacity,
        status: 'available', shape: t.shape, positionX: t.positionX, positionY: t.positionY,
        isActive: true, displayOrder: t.displayOrder,
      }
    });
    tables.push(table);
  }
  console.log(`✅ ${halls.length} halls, ${tables.length} tables created`);

  // ============================================================
  // 10. CHART OF ACCOUNTS
  // ============================================================
  const accountsData = [
    { code: '1000', name: 'Assets', type: 'asset', parentCode: null, level: 1, isSystem: true },
    { code: '1100', name: 'Cash & Bank', type: 'asset', parentCode: '1000', level: 2, isSystem: true },
    { code: '1101', name: 'Cash in Hand', type: 'asset', parentCode: '1100', level: 3, isSystem: true, balance: 50000 },
    { code: '1102', name: 'Bank Account - HBL', type: 'asset', parentCode: '1100', level: 3, isSystem: true, balance: 250000 },
    { code: '1200', name: 'Accounts Receivable', type: 'asset', parentCode: '1000', level: 2, isSystem: true },
    { code: '1300', name: 'Inventory', type: 'asset', parentCode: '1000', level: 2, isSystem: true },
    { code: '1301', name: 'Food Inventory', type: 'asset', parentCode: '1300', level: 3, isSystem: false, balance: 120000 },
    { code: '2000', name: 'Liabilities', type: 'liability', parentCode: null, level: 1, isSystem: true },
    { code: '2100', name: 'Accounts Payable', type: 'liability', parentCode: '2000', level: 2, isSystem: true },
    { code: '2101', name: 'Supplier Payables', type: 'liability', parentCode: '2100', level: 3, isSystem: false, balance: 85000 },
    { code: '2200', name: 'Tax Payable', type: 'liability', parentCode: '2000', level: 2, isSystem: true },
    { code: '2201', name: 'GST Payable', type: 'liability', parentCode: '2200', level: 3, isSystem: true, balance: 12000 },
    { code: '3000', name: 'Equity', type: 'equity', parentCode: null, level: 1, isSystem: true },
    { code: '3100', name: "Owner's Capital", type: 'equity', parentCode: '3000', level: 2, isSystem: true, balance: 500000 },
    { code: '3200', name: 'Retained Earnings', type: 'equity', parentCode: '3000', level: 2, isSystem: true, balance: 150000 },
    { code: '4000', name: 'Revenue', type: 'revenue', parentCode: null, level: 1, isSystem: true },
    { code: '4100', name: 'Sales Revenue', type: 'revenue', parentCode: '4000', level: 2, isSystem: true },
    { code: '4101', name: 'Food Sales', type: 'revenue', parentCode: '4100', level: 3, isSystem: false, balance: 320000 },
    { code: '4102', name: 'Beverage Sales', type: 'revenue', parentCode: '4100', level: 3, isSystem: false, balance: 80000 },
    { code: '5000', name: 'Expenses', type: 'expense', parentCode: null, level: 1, isSystem: true },
    { code: '5100', name: 'Cost of Goods Sold', type: 'expense', parentCode: '5000', level: 2, isSystem: true },
    { code: '5101', name: 'Food COGS', type: 'expense', parentCode: '5100', level: 3, isSystem: false, balance: 160000 },
    { code: '5200', name: 'Operating Expenses', type: 'expense', parentCode: '5000', level: 2, isSystem: true },
    { code: '5201', name: 'Rent', type: 'expense', parentCode: '5200', level: 3, isSystem: false, balance: 80000 },
    { code: '5301', name: 'Kitchen Staff Salaries', type: 'expense', parentCode: '5200', level: 3, isSystem: false, balance: 80000 },
    { code: '5302', name: 'Waiter Salaries', type: 'expense', parentCode: '5200', level: 3, isSystem: false, balance: 50000 },
    { code: '5303', name: 'Manager Salary', type: 'expense', parentCode: '5200', level: 3, isSystem: false, balance: 40000 },
  ];

  const accountMap = {};
  for (const a of accountsData) {
    const parentId = a.parentCode ? accountMap[a.parentCode] : null;
    const account = await prisma.account.create({
      data: {
        branchId: branch.id, code: a.code, name: a.name, type: a.type,
        parentId: parentId, level: a.level, balance: a.balance || 0,
        isSystem: a.isSystem, isActive: true,
      }
    });
    accountMap[a.code] = account.id;
  }
  console.log(`✅ ${Object.keys(accountMap).length} accounts created`);

  // ============================================================
  // 11. ORDERS (last 30 days)
  // ============================================================
  const paymentMethods = ['cash', 'cash', 'cash', 'card', 'card', 'online'];
  const orderTypes = ['dine_in', 'dine_in', 'dine_in', 'take_away', 'take_away', 'delivery'];

  let orderCount = 0;
  for (let day = 29; day >= 0; day--) {
    const ordersPerDay = Math.floor(Math.random() * 8) + 5;
    for (let o = 0; o < ordersPerDay; o++) {
      const isCancelled = Math.random() < 0.1;
      const status = isCancelled ? 'cancelled' : 'completed';
      const paymentMethod = paymentMethods[Math.floor(Math.random() * paymentMethods.length)];
      const orderType = orderTypes[Math.floor(Math.random() * orderTypes.length)];
      const customerId = Math.random() > 0.3 ? customers[Math.floor(Math.random() * (customers.length - 1))].id : null;
      const tableId = orderType === 'dine_in' ? tables[Math.floor(Math.random() * 8)].id : null;

      const itemCount = Math.floor(Math.random() * 4) + 1;
      const selectedProducts = [];
      for (let i = 0; i < itemCount; i++) {
        const p = allProducts[Math.floor(Math.random() * allProducts.length)];
        if (!selectedProducts.find(sp => sp.id === p.id)) selectedProducts.push(p);
      }

      let subtotal = 0;
      const orderItems = selectedProducts.map(p => {
        const qty = Math.floor(Math.random() * 3) + 1;
        const itemTotal = Number(p.sellingPrice) * qty;
        subtotal += itemTotal;
        return {
          productId: p.id, productName: p.name, sku: p.sku,
          quantity: qty, unitPrice: Number(p.sellingPrice), costPrice: Number(p.costPrice),
          discountAmount: 0, taxAmount: Math.round(itemTotal * 0.16 * 100) / 100,
          total: itemTotal, status: isCancelled ? 'cancelled' : 'served',
        };
      });

      const taxAmount = Math.round(subtotal * 0.16 * 100) / 100;
      const total = subtotal + taxAmount;

      const orderDate = new Date();
      orderDate.setDate(orderDate.getDate() - day);
      orderDate.setHours(Math.floor(Math.random() * 12) + 10, Math.floor(Math.random() * 60), 0, 0);

      orderCount++;
      const orderNumber = `ORD-${String(orderCount).padStart(6, '0')}`;

      try {
        await prisma.order.create({
          data: {
            branchId: branch.id, customerId, userId: ADMIN_USER_ID, tableId,
            orderNumber, orderType, orderSource: 'pos',
            subtotal, taxRate: 16.00, taxAmount, total,
            paymentStatus: isCancelled ? 'pending' : 'paid',
            paymentMethod, paidAmount: isCancelled ? 0 : total,
            changeAmount: isCancelled ? 0 : (paymentMethod === 'cash' ? Math.max(0, Math.ceil(total / 100) * 100 - total) : 0),
            status, completedAt: !isCancelled ? orderDate : null,
            cancelledAt: isCancelled ? orderDate : null,
            cancelledById: isCancelled ? ADMIN_USER_ID : null,
            createdAt: orderDate, updatedAt: orderDate,
            items: { create: orderItems },
          },
        });
      } catch (err) {
        orderCount--;
      }
    }
  }
  console.log(`✅ ${orderCount} orders created`);

  // ============================================================
  // 12. NOTIFICATIONS
  // ============================================================
  const notifs = [
    { type: 'system', title: 'Welcome to Vision POS!', message: 'Your POS system is ready.', daysAgo: 7 },
    { type: 'low_stock', title: 'Low Stock Alert', message: 'Classic Beef Burger stock is running low.', daysAgo: 2 },
    { type: 'order_created', title: 'New Order', message: 'A new dine-in order has been placed.', daysAgo: 1 },
    { type: 'system', title: 'Daily Report Ready', message: 'Your daily sales report is ready.', daysAgo: 0 },
  ];
  for (const n of notifs) {
    const createdAt = new Date(); createdAt.setDate(createdAt.getDate() - n.daysAgo);
    await prisma.notification.create({
      data: { branchId: branch.id, userId: ADMIN_USER_ID, type: n.type, title: n.title, message: n.message, channel: 'in_app', isRead: n.daysAgo > 3, sound: 'default', createdAt }
    });
  }
  console.log(`✅ ${notifs.length} notifications created`);

  // ============================================================
  // 13. MENUS
  // ============================================================
  const mainMenu = await prisma.menu.create({
    data: {
      branchId: branch.id, name: 'Main Menu', description: 'Full restaurant menu',
      activeTimeFrom: '10:00', activeTimeTo: '23:00',
      activeDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      isActive: true, displayOrder: 1,
    }
  });
  for (let i = 0; i < allProducts.length; i++) {
    await prisma.menuProduct.create({ data: { menuId: mainMenu.id, productId: allProducts[i].id, displayOrder: i + 1 } });
  }
  console.log('✅ Menu created');

  // ============================================================
  // 14. TRANSLATIONS
  // ============================================================
  const translations = [
    { locale: 'en', key: 'app.name', value: 'Vision POS' },
    { locale: 'en', key: 'dashboard.title', value: 'Dashboard' },
    { locale: 'ur', key: 'app.name', value: 'وژن پی او ایس' },
    { locale: 'ur', key: 'dashboard.title', value: 'ڈیش بورڈ' },
    { locale: 'ar', key: 'app.name', value: 'فيجن بي او اس' },
    { locale: 'ar', key: 'dashboard.title', value: 'لوحة القيادة' },
  ];
  for (const t of translations) {
    await prisma.translation.create({ data: t });
  }
  console.log('✅ Translations created');

  // ============================================================
  // 15. PRINTERS
  // ============================================================
  try {
    const printers = [
      { name: 'Receipt Printer', type: 'thermal', connection: 'usb', width: 80, isDefault: true, printReceipt: true, printKitchen: false },
      { name: 'Kitchen Printer', type: 'thermal', connection: 'network', address: '192.168.1.100', width: 80, isDefault: false, printReceipt: false, printKitchen: true },
    ];
    for (const p of printers) {
      await prisma.printer.create({ data: { branchId: branch.id, ...p, isActive: true } });
    }
    console.log('✅ Printers created');
  } catch (e) { console.log('⚠️  Printers skipped:', e.message.substring(0, 80)); }

  // ============================================================
  // DONE
  // ============================================================
  console.log('\n═══════════════════════════════════════════════════');
  console.log('  ✅  DEMO DATA RESTORED SUCCESSFULLY!');
  console.log('═══════════════════════════════════════════════════');
  console.log(`\n📋 Summary:`);
  console.log(`   • Branch:        ${branch.name}`);
  console.log(`   • Branch Users:  ${systemUsers.length}`);
  console.log(`   • Categories:    ${categories.length}`);
  console.log(`   • Products:      ${allProducts.length}`);
  console.log(`   • Customers:     ${customers.length}`);
  console.log(`   • Halls:         ${halls.length}`);
  console.log(`   • Tables:        ${tables.length}`);
  console.log(`   • Accounts:      ${Object.keys(accountMap).length}`);
  console.log(`   • Orders:        ~${orderCount}`);
  console.log(`   • Menu:          1`);
  console.log(`\n🔑 Login: admin@demo.com / admin123`);
}

main()
  .catch((e) => { console.error('❌ Seed failed:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
