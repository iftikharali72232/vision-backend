module.exports = {
  jwt: {
    secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d'
  },
  bcrypt: {
    saltRounds: 10
  },
  pagination: {
    defaultPage: 1,
    defaultPerPage: 20,
    maxPerPage: 100
  },
  
  // Role definitions as per POS_SYSTEM_CONTRACT
  roles: {
    SUPER_ADMIN: 'super_admin',
    ADMIN: 'admin',
    OWNER: 'owner',
    MANAGER: 'manager',
    CASHIER: 'cashier',
    RECEPTIONIST: 'receptionist',
    KITCHEN: 'kitchen',
    WAITER: 'waiter'
  },

  // Permission matrix as per contract - Section 3.2
  permissions: {
    super_admin: [
      'dashboard', 'dashboard.view',
      'pos', 'pos.view', 'pos.create_order',
      'products', 'products.view', 'products.create', 'products.edit', 'products.delete', 'products.stock',
      'orders', 'orders.view', 'orders.create', 'orders.update', 'orders.refund', 'orders.cancel',
      'customers', 'customers.view', 'customers.create', 'customers.update', 'customers.delete',
      'reports', 'reports.view', 'reports.export',
      'settings', 'settings.view', 'settings.update',
      'accounting', 'accounting.view', 'accounting.create', 'accounting.update', 'accounting.delete',
      'inventory', 'inventory.view', 'inventory.create', 'inventory.update',
      'tables', 'tables.view', 'tables.create', 'tables.update', 'tables.delete',
      'users', 'users.view', 'users.create', 'users.update', 'users.delete',
      'roles', 'roles.view', 'roles.create', 'roles.update', 'roles.delete',
      'branches', 'branches.view', 'branches.create', 'branches.update', 'branches.delete',
      'categories', 'categories.view', 'categories.create', 'categories.update', 'categories.delete',
      'menus', 'menus.view', 'menus.create', 'menus.update', 'menus.delete',
      'notifications', 'notifications.view', 'notifications.manage'
    ],
    admin: [
      'dashboard', 'dashboard.view',
      'pos', 'pos.view', 'pos.create_order',
      'products', 'products.view', 'products.create', 'products.edit', 'products.delete', 'products.stock',
      'orders', 'orders.view', 'orders.create', 'orders.update', 'orders.refund', 'orders.cancel',
      'customers', 'customers.view', 'customers.create', 'customers.update', 'customers.delete',
      'reports', 'reports.view', 'reports.export',
      'settings', 'settings.view', 'settings.update',
      'accounting', 'accounting.view', 'accounting.create', 'accounting.update', 'accounting.delete',
      'inventory', 'inventory.view', 'inventory.create', 'inventory.update',
      'tables', 'tables.view', 'tables.create', 'tables.update', 'tables.delete',
      'users', 'users.view', 'users.create', 'users.update', 'users.delete',
      'roles', 'roles.view', 'roles.create', 'roles.update',
      'branches', 'branches.view', 'branches.create', 'branches.update', 'branches.delete',
      'categories', 'categories.view', 'categories.create', 'categories.update', 'categories.delete',
      'menus', 'menus.view', 'menus.create', 'menus.update', 'menus.delete',
      'notifications', 'notifications.view', 'notifications.manage'
    ],
    owner: [
      'dashboard', 'dashboard.view',
      'pos', 'pos.view', 'pos.create_order',
      'products', 'products.view', 'products.create', 'products.edit', 'products.stock',
      'orders', 'orders.view', 'orders.create', 'orders.update', 'orders.refund', 'orders.cancel',
      'customers', 'customers.view', 'customers.create', 'customers.update', 'customers.delete',
      'reports', 'reports.view', 'reports.export',
      'settings', 'settings.view', 'settings.update',
      'accounting', 'accounting.view', 'accounting.create', 'accounting.update',
      'inventory', 'inventory.view', 'inventory.create', 'inventory.update',
      'tables', 'tables.view', 'tables.create', 'tables.update', 'tables.delete',
      'users', 'users.view', 'users.create', 'users.update',
      'branches', 'branches.view', 'branches.create', 'branches.update',
      'categories', 'categories.view', 'categories.create', 'categories.update', 'categories.delete',
      'menus', 'menus.view', 'menus.create', 'menus.update', 'menus.delete',
      'notifications', 'notifications.view'
    ],
    manager: [
      'dashboard', 'dashboard.view',
      'pos', 'pos.view', 'pos.create_order',
      'products', 'products.view', 'products.create', 'products.edit', 'products.stock',
      'orders', 'orders.view', 'orders.create', 'orders.update', 'orders.refund', 'orders.cancel',
      'customers', 'customers.view', 'customers.create', 'customers.update',
      'reports', 'reports.view', 'reports.export',
      'inventory', 'inventory.view', 'inventory.create', 'inventory.update',
      'tables', 'tables.view', 'tables.create', 'tables.update',
      'users', 'users.view',
      'branches', 'branches.view',
      'categories', 'categories.view', 'categories.create', 'categories.update',
      'menus', 'menus.view', 'menus.create', 'menus.update',
      'notifications', 'notifications.view'
    ],
    cashier: [
      'pos', 'pos.view', 'pos.create_order',
      'products', 'products.view',
      'orders', 'orders.view', 'orders.create',
      'customers', 'customers.view', 'customers.create',
      'tables', 'tables.view',
      'categories', 'categories.view',
      'notifications', 'notifications.view'
    ],
    receptionist: [
      'dashboard', 'dashboard.view',
      'orders', 'orders.view',
      'customers', 'customers.view', 'customers.create', 'customers.update',
      'tables', 'tables.view', 'tables.create', 'tables.update',
      'notifications', 'notifications.view'
    ],
    kitchen: [
      'orders', 'orders.view', 'orders.update',
      'products', 'products.view',
      'notifications', 'notifications.view'
    ],
    waiter: [
      'pos', 'pos.view', 'pos.create_order',
      'products', 'products.view',
      'orders', 'orders.view', 'orders.create',
      'tables', 'tables.view',
      'categories', 'categories.view',
      'notifications', 'notifications.view'
    ]
  },

  // Order status definitions as per contract - Section 5.1
  orderStatus: {
    DRAFT: 'draft',
    HOLD: 'hold',
    PENDING: 'pending',
    CONFIRMED: 'confirmed',
    KITCHEN: 'kitchen',
    PREPARING: 'preparing',
    READY: 'ready',
    SERVED: 'served',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled',
    INVOICED: 'invoiced',
    REFUNDED: 'refunded'
  },

  // Order types as per contract - Section 5.2
  orderTypes: {
    DINE_IN: 'dine_in',
    TAKEAWAY: 'takeaway',
    TAKE_AWAY: 'take_away',
    DELIVERY: 'delivery',
    SELF_PICKUP: 'self_pickup'
  },

  // Payment methods
  paymentMethods: {
    CASH: 'cash',
    CARD: 'card',
    SPLIT: 'split',
    ONLINE: 'online',
    WALLET: 'wallet'
  },

  // Product types as per contract - Section 4.1
  productTypes: {
    SIMPLE: 'simple',
    VARIABLE: 'variable',
    COMBO: 'combo',
    SERVICE: 'service'
  },

  // Inventory movement types as per contract - Section 6.1
  inventoryMovementTypes: {
    PURCHASE: 'purchase',
    SALE: 'sale',
    ADJUSTMENT: 'adjustment',
    WASTAGE: 'wastage',
    TRANSFER: 'transfer',
    RETURN: 'return',
    OPENING: 'opening'
  },

  // Table status as per contract - Section 8.1
  tableStatus: {
    AVAILABLE: 'available',
    OCCUPIED: 'occupied',
    RESERVED: 'reserved',
    CLEANING: 'cleaning'
  },

  // Menu types as per contract - Section 9.1
  menuTypes: {
    BREAKFAST: 'breakfast',
    LUNCH: 'lunch',
    DINNER: 'dinner',
    ALL_DAY: 'all_day',
    SPECIAL: 'special'
  },

  // Account types for Chart of Accounts - Section 7.1
  accountTypes: {
    ASSET: 'asset',
    LIABILITY: 'liability',
    EQUITY: 'equity',
    REVENUE: 'revenue',
    EXPENSE: 'expense',
    CONTRA: 'contra'
  },

  // Default Chart of Accounts structure (6-level)
  defaultChartOfAccounts: [
    { code: '1', name: 'Assets', type: 'asset', level: 1 },
    { code: '11', name: 'Current Assets', type: 'asset', level: 2, parentCode: '1' },
    { code: '1101', name: 'Cash', type: 'asset', level: 3, parentCode: '11' },
    { code: '110101', name: 'Cash Counter', type: 'asset', level: 4, parentCode: '1101' },
    { code: '110102', name: 'Cash Bank', type: 'asset', level: 4, parentCode: '1101' },
    { code: '1102', name: 'Accounts Receivable', type: 'asset', level: 3, parentCode: '11' },
    { code: '1103', name: 'Inventory', type: 'asset', level: 3, parentCode: '11' },
    { code: '12', name: 'Fixed Assets', type: 'asset', level: 2, parentCode: '1' },
    { code: '1201', name: 'Equipment', type: 'asset', level: 3, parentCode: '12' },
    { code: '1202', name: 'Vehicles', type: 'asset', level: 3, parentCode: '12' },
    { code: '2', name: 'Liabilities', type: 'liability', level: 1 },
    { code: '21', name: 'Current Liabilities', type: 'liability', level: 2, parentCode: '2' },
    { code: '2101', name: 'Accounts Payable', type: 'liability', level: 3, parentCode: '21' },
    { code: '2102', name: 'Tax Payable', type: 'liability', level: 3, parentCode: '21' },
    { code: '3', name: 'Equity', type: 'equity', level: 1 },
    { code: '31', name: "Owner's Equity", type: 'equity', level: 2, parentCode: '3' },
    { code: '32', name: 'Retained Earnings', type: 'equity', level: 2, parentCode: '3' },
    { code: '4', name: 'Revenue', type: 'revenue', level: 1 },
    { code: '41', name: 'Sales Revenue', type: 'revenue', level: 2, parentCode: '4' },
    { code: '42', name: 'Service Revenue', type: 'revenue', level: 2, parentCode: '4' },
    { code: '5', name: 'Expenses', type: 'expense', level: 1 },
    { code: '51', name: 'Cost of Goods Sold', type: 'expense', level: 2, parentCode: '5' },
    { code: '52', name: 'Operating Expenses', type: 'expense', level: 2, parentCode: '5' },
    { code: '5201', name: 'Salaries Expense', type: 'expense', level: 3, parentCode: '52' },
    { code: '5202', name: 'Rent Expense', type: 'expense', level: 3, parentCode: '52' },
    { code: '5203', name: 'Utilities Expense', type: 'expense', level: 3, parentCode: '52' },
    { code: '5204', name: 'Marketing Expense', type: 'expense', level: 3, parentCode: '52' }
  ],

  // Supported languages as per contract - Section 11.1
  languages: {
    EN: 'en',
    UR: 'ur',
    AR: 'ar'
  },

  // RTL languages
  rtlLanguages: ['ur', 'ar'],

  // Notification types
  notificationTypes: {
    ORDER_CREATED: 'order_created',
    ORDER_READY: 'order_ready',
    ORDER_CANCELLED: 'order_cancelled',
    LOW_STOCK: 'low_stock',
    PAYMENT_RECEIVED: 'payment_received',
    NEW_CUSTOMER: 'new_customer',
    SYSTEM: 'system'
  },

  // Invoice status
  invoiceStatus: {
    DRAFT: 'draft',
    ISSUED: 'issued',
    PAID: 'paid',
    PARTIAL: 'partial',
    CANCELLED: 'cancelled'
  }
};
