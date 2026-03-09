/**
 * Pending Queries File
 * ─────────────────────────────────────────────────────────────────────────────
 * Add your SQL queries here. Click "Run Pending Queries" button in Dev Panel
 * to execute them across ALL tenant databases + system DB.
 *
 * Each query object:
 *   - id:          Unique identifier (used to track which queries were already run)
 *   - description: Human-readable description
 *   - target:      'system' | 'tenants' | 'all' (default: 'all')
 *   - sql:         SQL string or array of SQL strings
 *   - runOnce:     If true, skips if already executed (tracked in system_db.executed_queries)
 *
 * HOW TO USE:
 * 1. Add new queries at the bottom of the QUERIES array
 * 2. Go to Dev Panel → Maintenance → Click "Run Pending Queries"
 * 3. All queries execute on target databases
 * 4. Results show per-database success/failure
 *
 * IMPORTANT: Never remove old queries - just add new ones at the bottom.
 * Queries with runOnce:true will be skipped if already executed.
 */

const QUERIES = [
  // ────────────────────────────────────────────────────────────────────
  // Query 001: Add multi-language names to system menu child items
  // ────────────────────────────────────────────────────────────────────
  {
    id: 'q001_menu_translations',
    description: 'Add Arabic and Urdu translations for all system menu child items',
    target: 'system',
    sql: [
      // ── POS children ──
      `UPDATE system_menus SET name_ar = 'طلب جديد', name_ur = 'نیا آرڈر' WHERE code = 'pos.orders'`,
      `UPDATE system_menus SET name_ar = 'الطلبات المعلقة', name_ur = 'روکے گئے آرڈرز' WHERE code = 'pos.held'`,
      `UPDATE system_menus SET name_ar = 'الطاولات', name_ur = 'ٹیبلز' WHERE code = 'pos.tables'`,

      // ── Sales children ──
      `UPDATE system_menus SET name_ar = 'الطلبات', name_ur = 'آرڈرز' WHERE code = 'sales.orders'`,
      `UPDATE system_menus SET name_ar = 'الفواتير', name_ur = 'انوائسز' WHERE code = 'sales.invoices'`,
      `UPDATE system_menus SET name_ar = 'المرتجعات', name_ur = 'ریٹرنز' WHERE code = 'sales.returns'`,
      `UPDATE system_menus SET name_ar = 'العملاء', name_ur = 'صارفین' WHERE code = 'sales.customers'`,

      // ── Inventory children ──
      `UPDATE system_menus SET name_ar = 'المنتجات', name_ur = 'مصنوعات' WHERE code = 'inventory.products'`,
      `UPDATE system_menus SET name_ar = 'الفئات', name_ur = 'زمرے' WHERE code = 'inventory.categories'`,
      `UPDATE system_menus SET name_ar = 'إدارة المخزون', name_ur = 'اسٹاک مینجمنٹ' WHERE code = 'inventory.stock'`,
      `UPDATE system_menus SET name_ar = 'حركات المخزون', name_ur = 'اسٹاک کی نقل و حرکت' WHERE code = 'inventory.movements'`,
      `UPDATE system_menus SET name_ar = 'تنبيهات المخزون', name_ur = 'کم اسٹاک الرٹس' WHERE code = 'inventory.alerts'`,
      `UPDATE system_menus SET name_ar = 'الموردون', name_ur = 'سپلائرز' WHERE code = 'inventory.suppliers'`,

      // ── Accounts children ──
      `UPDATE system_menus SET name_ar = 'لوحة المالية', name_ur = 'مالیاتی ڈیش بورڈ' WHERE code = 'accounts.dashboard'`,
      `UPDATE system_menus SET name_ar = 'دليل الحسابات', name_ur = 'چارٹ آف اکاؤنٹس' WHERE code = 'accounts.chart'`,
      `UPDATE system_menus SET name_ar = 'القيود اليومية', name_ur = 'جرنل انٹریز' WHERE code = 'accounts.journal'`,
      `UPDATE system_menus SET name_ar = 'الدفتر العام', name_ur = 'جنرل لیجر' WHERE code = 'accounts.ledger'`,
      `UPDATE system_menus SET name_ar = 'المعاملات', name_ur = 'ٹرانزیکشنز' WHERE code = 'accounts.transactions'`,
      `UPDATE system_menus SET name_ar = 'المصروفات', name_ur = 'اخراجات' WHERE code = 'accounts.expenses'`,

      // ── Reports children ──
      `UPDATE system_menus SET name_ar = 'تقرير المبيعات', name_ur = 'سیلز رپورٹ' WHERE code = 'reports.sales'`,
      `UPDATE system_menus SET name_ar = 'تقرير المنتجات', name_ur = 'پروڈکٹ رپورٹ' WHERE code = 'reports.products'`,
      `UPDATE system_menus SET name_ar = 'تقرير المخزون', name_ur = 'انوینٹری رپورٹ' WHERE code = 'reports.inventory'`,
      `UPDATE system_menus SET name_ar = 'تقرير العملاء', name_ur = 'کسٹمر رپورٹ' WHERE code = 'reports.customers'`,
      `UPDATE system_menus SET name_ar = 'التقرير المالي', name_ur = 'مالیاتی رپورٹ' WHERE code = 'reports.financial'`,
      `UPDATE system_menus SET name_ar = 'تقرير الموظفين', name_ur = 'اسٹاف رپورٹ' WHERE code = 'reports.staff'`,

      // ── Tables children ──
      `UPDATE system_menus SET name_ar = 'جميع الطاولات', name_ur = 'تمام ٹیبلز' WHERE code = 'tables.list'`,
      `UPDATE system_menus SET name_ar = 'القاعات', name_ur = 'ہالز' WHERE code = 'tables.halls'`,
      `UPDATE system_menus SET name_ar = 'الحجوزات', name_ur = 'ریزرویشنز' WHERE code = 'tables.reservations'`,

      // ── Settings children ──
      `UPDATE system_menus SET name_ar = 'الإعدادات العامة', name_ur = 'عمومی ترتیبات' WHERE code = 'settings.general'`,
      `UPDATE system_menus SET name_ar = 'إعدادات الفرع', name_ur = 'برانچ ترتیبات' WHERE code = 'settings.branch'`,
      `UPDATE system_menus SET name_ar = 'الضرائب', name_ur = 'ٹیکس' WHERE code = 'settings.taxes'`,
      `UPDATE system_menus SET name_ar = 'الخصومات', name_ur = 'ڈسکاؤنٹ' WHERE code = 'settings.discounts'`,
      `UPDATE system_menus SET name_ar = 'طرق الدفع', name_ur = 'ادائیگی کے طریقے' WHERE code = 'settings.payment'`,
      `UPDATE system_menus SET name_ar = 'الطابعات', name_ur = 'پرنٹرز' WHERE code = 'settings.printers'`,
      `UPDATE system_menus SET name_ar = 'قالب الإيصال', name_ur = 'رسید ٹیمپلیٹ' WHERE code = 'settings.receipt'`,

      // ── Users children ──
      `UPDATE system_menus SET name_ar = 'جميع المستخدمين', name_ur = 'تمام صارفین' WHERE code = 'users.list'`,
      `UPDATE system_menus SET name_ar = 'الأدوار والصلاحيات', name_ur = 'رولز اور اجازتیں' WHERE code = 'users.roles'`,
      `UPDATE system_menus SET name_ar = 'الفروع', name_ur = 'برانچز' WHERE code = 'users.branches'`,

      // ── Update parent modules (in case they're missing) ──
      `UPDATE system_menus SET name_ar = 'نقطة البيع', name_ur = 'پوائنٹ آف سیل' WHERE code = 'pos' AND (name_ar IS NULL OR name_ar = '')`,
      `UPDATE system_menus SET name_ar = 'المبيعات', name_ur = 'سیلز' WHERE code = 'sales' AND (name_ar IS NULL OR name_ar = '')`,
      `UPDATE system_menus SET name_ar = 'المخزون', name_ur = 'انوینٹری' WHERE code = 'inventory' AND (name_ar IS NULL OR name_ar = '')`,
      `UPDATE system_menus SET name_ar = 'الحسابات', name_ur = 'اکاؤنٹس' WHERE code = 'accounts' AND (name_ar IS NULL OR name_ar = '')`,
      `UPDATE system_menus SET name_ar = 'التقارير', name_ur = 'رپورٹس' WHERE code = 'reports' AND (name_ar IS NULL OR name_ar = '')`,
      `UPDATE system_menus SET name_ar = 'لوحة التحكم', name_ur = 'ڈیش بورڈ' WHERE code = 'dashboard' AND (name_ar IS NULL OR name_ar = '')`,
      `UPDATE system_menus SET name_ar = 'الطاولات', name_ur = 'ٹیبلز' WHERE code = 'tables' AND (name_ar IS NULL OR name_ar = '')`,
      `UPDATE system_menus SET name_ar = 'الإعدادات', name_ur = 'ترتیبات' WHERE code = 'settings' AND (name_ar IS NULL OR name_ar = '')`,
      `UPDATE system_menus SET name_ar = 'المستخدمين', name_ur = 'صارفین' WHERE code = 'users' AND (name_ar IS NULL OR name_ar = '')`,
      `UPDATE system_menus SET name_ar = 'الإشعارات', name_ur = 'اطلاعات' WHERE code = 'notifications' AND (name_ar IS NULL OR name_ar = '')`,
    ],
    runOnce: true,
  },

  // ────────────────────────────────────────────────────────────────────
  // Query 002: Create executed_queries tracking table in system DB
  // ────────────────────────────────────────────────────────────────────
  {
    id: 'q000_create_tracking_table',
    description: 'Create executed_queries table to track which queries have been run',
    target: 'system',
    sql: [
      `CREATE TABLE IF NOT EXISTS executed_queries (
        id INT AUTO_INCREMENT PRIMARY KEY,
        query_id VARCHAR(100) NOT NULL UNIQUE,
        description TEXT,
        executed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        executed_by VARCHAR(100) DEFAULT 'system',
        result TEXT
      )`,
    ],
    runOnce: false, // This one always runs (it's CREATE IF NOT EXISTS)
  },

  // ────────────────────────────────────────────────────────────────────
  // ADD NEW QUERIES BELOW THIS LINE
  // Use incrementing IDs: q003_xxx, q004_xxx, etc.
  // ────────────────────────────────────────────────────────────────────

];

module.exports = QUERIES;
