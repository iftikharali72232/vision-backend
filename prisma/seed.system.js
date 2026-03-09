/**
 * System Database Seed
 * Seeds the system database with default menus, settings, and templates
 * Run with: node prisma/seed.system.js
 */

const { PrismaClient } = require('.prisma/system-client');

// Load .env file
require('dotenv').config();

const prisma = new PrismaClient();

// ================== SYSTEM MENUS ==================
// Modules → Menus → Submenus hierarchy

const systemMenus = [
  // ============ POS MODULE ============
  {
    code: 'pos',
    name: 'POS',
    nameAr: 'نقطة البيع',
    nameUr: 'پوائنٹ آف سیل',
    description: 'Point of Sale terminal',
    type: 'module',
    icon: 'HiShoppingCart',
    route: '/pos',
    displayOrder: 1,
    isSystem: true,
    children: [
      { code: 'pos.orders', name: 'New Order', nameAr: 'طلب جديد', nameUr: 'نیا آرڈر', icon: 'HiPlus', route: '/pos', displayOrder: 1 },
      { code: 'pos.held', name: 'Held Orders', nameAr: 'الطلبات المعلقة', nameUr: 'روکے گئے آرڈرز', icon: 'HiPause', route: '/pos/held', displayOrder: 2 },
      { code: 'pos.tables', name: 'Tables', nameAr: 'الطاولات', nameUr: 'ٹیبلز', icon: 'HiViewGrid', route: '/pos/tables', displayOrder: 3 }
    ]
  },

  // ============ SALES MODULE ============
  {
    code: 'sales',
    name: 'Sales',
    nameAr: 'المبيعات',
    nameUr: 'سیلز',
    description: 'Sales management',
    type: 'module',
    icon: 'HiCurrencyDollar',
    route: '/sales',
    displayOrder: 2,
    isSystem: true,
    children: [
      { code: 'sales.orders', name: 'Orders', nameAr: 'الطلبات', nameUr: 'آرڈرز', icon: 'HiClipboardList', route: '/orders', displayOrder: 1 },
      { code: 'sales.invoices', name: 'Invoices', nameAr: 'الفواتير', nameUr: 'انوائسز', icon: 'HiDocumentText', route: '/invoices', displayOrder: 2 },
      { code: 'sales.returns', name: 'Returns', nameAr: 'المرتجعات', nameUr: 'ریٹرنز', icon: 'HiReply', route: '/returns', displayOrder: 3 },
      { code: 'sales.customers', name: 'Customers', nameAr: 'العملاء', nameUr: 'صارفین', icon: 'HiUsers', route: '/customers', displayOrder: 4 }
    ]
  },

  // ============ INVENTORY MODULE ============
  {
    code: 'inventory',
    name: 'Inventory',
    nameAr: 'المخزون',
    nameUr: 'انوینٹری',
    description: 'Inventory management',
    type: 'module',
    icon: 'HiCube',
    route: '/inventory',
    displayOrder: 3,
    isSystem: true,
    children: [
      { code: 'inventory.products', name: 'Products', nameAr: 'المنتجات', nameUr: 'مصنوعات', icon: 'HiShoppingBag', route: '/products', displayOrder: 1 },
      { code: 'inventory.categories', name: 'Categories', nameAr: 'الفئات', nameUr: 'زمرے', icon: 'HiFolder', route: '/categories', displayOrder: 2 },
      { code: 'inventory.stock', name: 'Stock Management', nameAr: 'إدارة المخزون', nameUr: 'اسٹاک مینجمنٹ', icon: 'HiArchive', route: '/inventory/stock', displayOrder: 3 },
      { code: 'inventory.movements', name: 'Stock Movements', nameAr: 'حركات المخزون', nameUr: 'اسٹاک کی نقل و حرکت', icon: 'HiSwitchHorizontal', route: '/inventory/movements', displayOrder: 4 },
      { code: 'inventory.alerts', name: 'Low Stock Alerts', nameAr: 'تنبيهات المخزون', nameUr: 'کم اسٹاک الرٹس', icon: 'HiExclamation', route: '/inventory/alerts', displayOrder: 5 },
      { code: 'inventory.suppliers', name: 'Suppliers', nameAr: 'الموردون', nameUr: 'سپلائرز', icon: 'HiTruck', route: '/inventory/suppliers', displayOrder: 6 }
    ]
  },

  // ============ ACCOUNTS MODULE ============
  {
    code: 'accounts',
    name: 'Accounts',
    nameAr: 'الحسابات',
    nameUr: 'اکاؤنٹس',
    description: 'Accounting and finance',
    type: 'module',
    icon: 'HiCalculator',
    route: '/accounting',
    displayOrder: 4,
    isSystem: true,
    children: [
      { code: 'accounts.dashboard', name: 'Financial Dashboard', nameAr: 'لوحة المالية', nameUr: 'مالیاتی ڈیش بورڈ', icon: 'HiChartPie', route: '/accounting', displayOrder: 1 },
      { code: 'accounts.chart', name: 'Chart of Accounts', nameAr: 'دليل الحسابات', nameUr: 'چارٹ آف اکاؤنٹس', icon: 'HiCollection', route: '/accounting/chart', displayOrder: 2 },
      { code: 'accounts.journal', name: 'Journal Entries', nameAr: 'القيود اليومية', nameUr: 'جرنل انٹریز', icon: 'HiBookOpen', route: '/accounting/journal', displayOrder: 3 },
      { code: 'accounts.ledger', name: 'General Ledger', nameAr: 'الدفتر العام', nameUr: 'جنرل لیجر', icon: 'HiDatabase', route: '/accounting/ledger', displayOrder: 4 },
      { code: 'accounts.transactions', name: 'Transactions', nameAr: 'المعاملات', nameUr: 'ٹرانزیکشنز', icon: 'HiCreditCard', route: '/accounting/transactions', displayOrder: 5 },
      { code: 'accounts.expenses', name: 'Expenses', nameAr: 'المصروفات', nameUr: 'اخراجات', icon: 'HiCash', route: '/accounting/expenses', displayOrder: 6 }
    ]
  },

  // ============ REPORTS MODULE ============
  {
    code: 'reports',
    name: 'Reports',
    nameAr: 'التقارير',
    nameUr: 'رپورٹس',
    description: 'Business reports and analytics',
    type: 'module',
    icon: 'HiChartBar',
    route: '/reports',
    displayOrder: 5,
    isSystem: true,
    children: [
      { code: 'reports.sales', name: 'Sales Report', nameAr: 'تقرير المبيعات', nameUr: 'سیلز رپورٹ', icon: 'HiTrendingUp', route: '/reports/sales', displayOrder: 1 },
      { code: 'reports.products', name: 'Product Report', nameAr: 'تقرير المنتجات', nameUr: 'پروڈکٹ رپورٹ', icon: 'HiShoppingBag', route: '/reports/products', displayOrder: 2 },
      { code: 'reports.inventory', name: 'Inventory Report', nameAr: 'تقرير المخزون', nameUr: 'انوینٹری رپورٹ', icon: 'HiCube', route: '/reports/inventory', displayOrder: 3 },
      { code: 'reports.customers', name: 'Customer Report', nameAr: 'تقرير العملاء', nameUr: 'کسٹمر رپورٹ', icon: 'HiUsers', route: '/reports/customers', displayOrder: 4 },
      { code: 'reports.financial', name: 'Financial Report', nameAr: 'التقرير المالي', nameUr: 'مالیاتی رپورٹ', icon: 'HiCurrencyDollar', route: '/reports/financial', displayOrder: 5 },
      { code: 'reports.staff', name: 'Staff Report', nameAr: 'تقرير الموظفين', nameUr: 'اسٹاف رپورٹ', icon: 'HiUserGroup', route: '/reports/staff', displayOrder: 6 }
    ]
  },

  // ============ DASHBOARD MODULE ============
  {
    code: 'dashboard',
    name: 'Dashboard',
    nameAr: 'لوحة التحكم',
    nameUr: 'ڈیش بورڈ',
    description: 'Main dashboard',
    type: 'module',
    icon: 'HiHome',
    route: '/dashboard',
    displayOrder: 0,
    isSystem: true,
    children: []
  },

  // ============ TABLES MODULE ============
  {
    code: 'tables',
    name: 'Tables',
    nameAr: 'الطاولات',
    nameUr: 'ٹیبلز',
    description: 'Table and hall management',
    type: 'module',
    icon: 'HiViewGrid',
    route: '/tables',
    displayOrder: 6,
    isSystem: true,
    children: [
      { code: 'tables.list', name: 'All Tables', nameAr: 'جميع الطاولات', nameUr: 'تمام ٹیبلز', icon: 'HiViewGrid', route: '/tables', displayOrder: 1 },
      { code: 'tables.halls', name: 'Halls', nameAr: 'القاعات', nameUr: 'ہالز', icon: 'HiOfficeBuilding', route: '/tables/halls', displayOrder: 2 },
      { code: 'tables.reservations', name: 'Reservations', nameAr: 'الحجوزات', nameUr: 'ریزرویشنز', icon: 'HiCalendar', route: '/tables/reservations', displayOrder: 3 }
    ]
  },

  // ============ SETTINGS MODULE ============
  {
    code: 'settings',
    name: 'Settings',
    nameAr: 'الإعدادات',
    nameUr: 'ترتیبات',
    description: 'System settings',
    type: 'module',
    icon: 'HiCog',
    route: '/settings',
    displayOrder: 10,
    isSystem: true,
    children: [
      { code: 'settings.general', name: 'General Settings', nameAr: 'الإعدادات العامة', nameUr: 'عمومی ترتیبات', icon: 'HiAdjustments', route: '/settings', displayOrder: 1 },
      { code: 'settings.branch', name: 'Branch Settings', nameAr: 'إعدادات الفرع', nameUr: 'برانچ ترتیبات', icon: 'HiOfficeBuilding', route: '/settings/branch', displayOrder: 2 },
      { code: 'settings.taxes', name: 'Taxes', nameAr: 'الضرائب', nameUr: 'ٹیکس', icon: 'HiReceiptTax', route: '/settings/taxes', displayOrder: 3, type: 'list' },
      { code: 'settings.discounts', name: 'Discounts', nameAr: 'الخصومات', nameUr: 'ڈسکاؤنٹ', icon: 'HiTag', route: '/settings/discounts', displayOrder: 4, type: 'list' },
      { code: 'settings.payment', name: 'Payment Methods', nameAr: 'طرق الدفع', nameUr: 'ادائیگی کے طریقے', icon: 'HiCreditCard', route: '/settings/payment', displayOrder: 5, type: 'list' },
      { code: 'settings.printers', name: 'Printers', nameAr: 'الطابعات', nameUr: 'پرنٹرز', icon: 'HiPrinter', route: '/settings/printers', displayOrder: 6, type: 'list' },
      { code: 'settings.receipt', name: 'Receipt Template', nameAr: 'قالب الإيصال', nameUr: 'رسید ٹیمپلیٹ', icon: 'HiDocumentText', route: '/settings/receipt', displayOrder: 7 }
    ]
  },

  // ============ USERS & ACCESS MODULE ============
  {
    code: 'users',
    name: 'Users & Access',
    nameAr: 'المستخدمين',
    nameUr: 'صارفین',
    description: 'User and role management',
    type: 'module',
    icon: 'HiUserGroup',
    route: '/users',
    displayOrder: 9,
    isSystem: true,
    children: [
      { code: 'users.list', name: 'All Users', nameAr: 'جميع المستخدمين', nameUr: 'تمام صارفین', icon: 'HiUsers', route: '/users', displayOrder: 1 },
      { code: 'users.roles', name: 'Roles & Permissions', nameAr: 'الأدوار والصلاحيات', nameUr: 'رولز اور اجازتیں', icon: 'HiShieldCheck', route: '/users/roles', displayOrder: 2 },
      { code: 'users.branches', name: 'Branches', nameAr: 'الفروع', nameUr: 'برانچز', icon: 'HiOfficeBuilding', route: '/users/branches', displayOrder: 3 }
    ]
  },

  // ============ NOTIFICATIONS MODULE ============
  {
    code: 'notifications',
    name: 'Notifications',
    nameAr: 'الإشعارات',
    nameUr: 'اطلاعات',
    description: 'System notifications',
    type: 'module',
    icon: 'HiBell',
    route: '/notifications',
    displayOrder: 8,
    isSystem: true,
    children: []
  }
];

// ================== TAX TEMPLATES ==================

const taxTemplates = [
  { name: 'GST 16%', rate: 16.00, type: 'exclusive', isDefault: true },
  { name: 'GST 17%', rate: 17.00, type: 'exclusive', isDefault: false },
  { name: 'GST 18%', rate: 18.00, type: 'exclusive', isDefault: false },
  { name: 'VAT 5%', rate: 5.00, type: 'inclusive', isDefault: false },
  { name: 'No Tax', rate: 0.00, type: 'exclusive', isDefault: false }
];

// ================== PAYMENT METHOD TEMPLATES ==================

const paymentMethodTemplates = [
  { name: 'Cash', code: 'cash', icon: 'HiCash' },
  { name: 'Card', code: 'card', icon: 'HiCreditCard' },
  { name: 'Online', code: 'online', icon: 'HiGlobe' },
  { name: 'Wallet', code: 'wallet', icon: 'HiCurrencyDollar' },
  { name: 'Split Payment', code: 'split', icon: 'HiSwitchHorizontal' }
];

// ================== PRINTER TEMPLATES ==================

const printerTemplates = [
  {
    name: 'Thermal 80mm Receipt',
    type: 'thermal',
    width: 80,
    isDefault: true,
    template: `
<style>
  .receipt { font-family: monospace; font-size: 12px; width: 80mm; }
  .header { text-align: center; font-weight: bold; }
  .divider { border-top: 1px dashed #000; margin: 8px 0; }
  .row { display: flex; justify-content: space-between; }
  .total { font-weight: bold; font-size: 14px; }
</style>
<div class="receipt">
  <div class="header">{{branch_name}}</div>
  <div class="header">{{branch_address}}</div>
  <div class="divider"></div>
  <div>Order: {{order_number}}</div>
  <div>Date: {{order_date}}</div>
  <div>Cashier: {{cashier_name}}</div>
  <div class="divider"></div>
  {{#items}}
  <div class="row">
    <span>{{quantity}}x {{name}}</span>
    <span>{{total}}</span>
  </div>
  {{/items}}
  <div class="divider"></div>
  <div class="row"><span>Subtotal</span><span>{{subtotal}}</span></div>
  <div class="row"><span>Tax</span><span>{{tax_amount}}</span></div>
  <div class="row"><span>Discount</span><span>{{discount_amount}}</span></div>
  <div class="divider"></div>
  <div class="row total"><span>Total</span><span>{{total}}</span></div>
  <div class="row"><span>Paid</span><span>{{paid_amount}}</span></div>
  <div class="row"><span>Change</span><span>{{change_amount}}</span></div>
  <div class="divider"></div>
  <div class="header">{{receipt_footer}}</div>
</div>
    `.trim()
  },
  {
    name: 'A4 Invoice',
    type: 'a4',
    width: 210,
    isDefault: false,
    template: `
<style>
  .invoice { font-family: Arial; font-size: 12px; padding: 20px; }
  .header { text-align: center; margin-bottom: 20px; }
  .company-name { font-size: 24px; font-weight: bold; }
  table { width: 100%; border-collapse: collapse; margin: 20px 0; }
  th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
  th { background: #f5f5f5; }
  .total-row { font-weight: bold; }
</style>
<div class="invoice">
  <div class="header">
    <div class="company-name">{{company_name}}</div>
    <div>{{branch_address}}</div>
    <div>Phone: {{branch_phone}}</div>
  </div>
  <h2>INVOICE #{{invoice_number}}</h2>
  <div>Date: {{invoice_date}}</div>
  <div>Customer: {{customer_name}}</div>
  <table>
    <thead>
      <tr><th>#</th><th>Item</th><th>Qty</th><th>Price</th><th>Total</th></tr>
    </thead>
    <tbody>
      {{#items}}
      <tr>
        <td>{{index}}</td>
        <td>{{name}}</td>
        <td>{{quantity}}</td>
        <td>{{unit_price}}</td>
        <td>{{total}}</td>
      </tr>
      {{/items}}
    </tbody>
    <tfoot>
      <tr><td colspan="4">Subtotal</td><td>{{subtotal}}</td></tr>
      <tr><td colspan="4">Tax ({{tax_rate}}%)</td><td>{{tax_amount}}</td></tr>
      <tr><td colspan="4">Discount</td><td>{{discount_amount}}</td></tr>
      <tr class="total-row"><td colspan="4">TOTAL</td><td>{{total}}</td></tr>
    </tfoot>
  </table>
  <div>{{receipt_footer}}</div>
</div>
    `.trim()
  }
];

// ================== SYSTEM SETTINGS ==================

const systemSettings = [
  { key: 'app_name', value: { en: 'POS System', ar: 'نظام نقاط البيع', ur: 'پوائنٹ آف سیل سسٹم' }, group: 'general' },
  { key: 'app_version', value: '1.0.0', group: 'general' },
  { key: 'default_currency', value: 'PKR', group: 'general' },
  { key: 'default_language', value: 'en', group: 'general' },
  { key: 'supported_languages', value: ['en', 'ar', 'ur'], group: 'general' },
  { key: 'trial_days', value: 14, group: 'subscription' },
  { key: 'max_branches_free', value: 1, group: 'subscription' },
  { key: 'max_users_free', value: 3, group: 'subscription' }
];

// ================== SEED FUNCTIONS ==================

async function seedMenus() {
  console.log('📋 Seeding system menus...');
  
  for (const module of systemMenus) {
    // Create module
    const createdModule = await prisma.systemMenu.upsert({
      where: { code: module.code },
      update: {
        name: module.name,
        nameAr: module.nameAr,
        nameUr: module.nameUr,
        description: module.description,
        icon: module.icon,
        route: module.route,
        displayOrder: module.displayOrder
      },
      create: {
        code: module.code,
        name: module.name,
        nameAr: module.nameAr,
        nameUr: module.nameUr,
        description: module.description,
        type: module.type,
        icon: module.icon,
        route: module.route,
        displayOrder: module.displayOrder,
        isActive: true,
        isSystem: module.isSystem
      }
    });

    // Create children
    if (module.children && module.children.length > 0) {
      for (const child of module.children) {
        await prisma.systemMenu.upsert({
          where: { code: child.code },
          update: {
            name: child.name,
            nameAr: child.nameAr || null,
            nameUr: child.nameUr || null,
            icon: child.icon,
            route: child.route,
            displayOrder: child.displayOrder
          },
          create: {
            parentId: createdModule.id,
            code: child.code,
            name: child.name,
            nameAr: child.nameAr || null,
            nameUr: child.nameUr || null,
            type: child.type || 'menu',
            icon: child.icon,
            route: child.route,
            displayOrder: child.displayOrder,
            isActive: true,
            isSystem: true
          }
        });
      }
    }
  }

  const count = await prisma.systemMenu.count();
  console.log(`✅ Created ${count} system menus`);
}

async function seedTaxTemplates() {
  console.log('💰 Seeding tax templates...');

  for (const tax of taxTemplates) {
    await prisma.taxTemplate.upsert({
      where: { id: taxTemplates.indexOf(tax) + 1 },
      update: tax,
      create: tax
    });
  }

  console.log(`✅ Created ${taxTemplates.length} tax templates`);
}

async function seedPaymentMethodTemplates() {
  console.log('💳 Seeding payment method templates...');

  for (const pm of paymentMethodTemplates) {
    await prisma.paymentMethodTemplate.upsert({
      where: { code: pm.code },
      update: { name: pm.name, icon: pm.icon },
      create: pm
    });
  }

  console.log(`✅ Created ${paymentMethodTemplates.length} payment method templates`);
}

async function seedPrinterTemplates() {
  console.log('🖨️ Seeding printer templates...');

  for (const printer of printerTemplates) {
    // Find existing by name (no unique constraint other than id)
    const existing = await prisma.printerTemplate.findFirst({
      where: { name: printer.name }
    });

    if (existing) {
      await prisma.printerTemplate.update({
        where: { id: existing.id },
        data: printer
      });
    } else {
      await prisma.printerTemplate.create({ data: printer });
    }
  }

  console.log(`✅ Created ${printerTemplates.length} printer templates`);
}

async function seedSystemSettings() {
  console.log('⚙️ Seeding system settings...');

  for (const setting of systemSettings) {
    await prisma.systemSetting.upsert({
      where: { key: setting.key },
      update: { value: setting.value, group: setting.group },
      create: setting
    });
  }

  console.log(`✅ Created ${systemSettings.length} system settings`);
}

// ================== SUBSCRIPTION PLANS ==================

async function seedSubscriptionPlans() {
  console.log('📋 Seeding subscription plans...');

  const plans = [
    {
      name: 'Basic',
      code: 'basic',
      description: 'POS only - No accounting features',
      features: ['pos', 'inventory', 'sales', 'customers', 'reports'],
      monthlyPrice: 5000.00,
      yearlyPrice: 50000.00
    },
    {
      name: 'Pro',
      code: 'pro',
      description: 'Full system with accounting',
      features: ['pos', 'inventory', 'sales', 'customers', 'reports', 'accounting', 'journals', 'financial-reports'],
      monthlyPrice: 10000.00,
      yearlyPrice: 100000.00
    }
  ];

  for (const plan of plans) {
    await prisma.subscriptionPlan.upsert({
      where: { code: plan.code },
      update: plan,
      create: plan
    });
  }

  console.log('✅ Subscription plans seeded');
}

// ================== MAIN ==================

async function main() {
  console.log('\n🚀 Starting system database seed...\n');

  try {
    await seedMenus();
    await seedTaxTemplates();
    await seedPaymentMethodTemplates();
    await seedPrinterTemplates();
    await seedSystemSettings();
    await seedSubscriptionPlans();

    console.log('\n✅ System database seeded successfully!\n');
  } catch (error) {
    console.error('\n❌ Error seeding database:', error);
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
