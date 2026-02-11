const prisma = require('../config/database');
const { languages, rtlLanguages } = require('../config/constants');

class TranslationService {
  /**
   * Get translations for a specific locale
   */
  async getTranslations(locale, group = null) {
    const where = { locale };
    if (group) where.group = group;

    const translations = await prisma.translation.findMany({
      where,
      orderBy: { key: 'asc' }
    });

    // Convert to key-value object
    const result = {};
    translations.forEach(t => {
      result[t.key] = t.value;
    });

    return {
      locale,
      is_rtl: rtlLanguages.includes(locale),
      translations: result
    };
  }

  /**
   * Get translations grouped by category
   */
  async getGroupedTranslations(locale) {
    const translations = await prisma.translation.findMany({
      where: { locale },
      orderBy: [{ group: 'asc' }, { key: 'asc' }]
    });

    // Group by category
    const grouped = {};
    translations.forEach(t => {
      const group = t.group || 'general';
      if (!grouped[group]) grouped[group] = {};
      grouped[group][t.key] = t.value;
    });

    return {
      locale,
      is_rtl: rtlLanguages.includes(locale),
      groups: grouped
    };
  }

  /**
   * Get all available locales
   */
  async getAvailableLocales() {
    const locales = await prisma.translation.findMany({
      distinct: ['locale'],
      select: { locale: true }
    });

    return locales.map(l => ({
      code: l.locale,
      name: this.getLocaleName(l.locale),
      is_rtl: rtlLanguages.includes(l.locale)
    }));
  }

  /**
   * Get locale name
   */
  getLocaleName(locale) {
    const names = {
      en: 'English',
      ur: 'اردو',
      ar: 'العربية'
    };
    return names[locale] || locale;
  }

  /**
   * Create or update a translation
   */
  async upsertTranslation(locale, key, value, group = null) {
    const translation = await prisma.translation.upsert({
      where: {
        locale_key: { locale, key }
      },
      update: { value, group },
      create: { locale, key, value, group }
    });

    return {
      id: translation.id,
      locale: translation.locale,
      key: translation.key,
      value: translation.value,
      group: translation.group
    };
  }

  /**
   * Bulk import translations
   */
  async bulkImport(locale, translations, group = null) {
    const operations = Object.entries(translations).map(([key, value]) => 
      prisma.translation.upsert({
        where: { locale_key: { locale, key } },
        update: { value, group },
        create: { locale, key, value, group }
      })
    );

    await prisma.$transaction(operations);

    return {
      locale,
      count: Object.keys(translations).length,
      message: 'Translations imported successfully'
    };
  }

  /**
   * Delete a translation
   */
  async deleteTranslation(locale, key) {
    await prisma.translation.delete({
      where: { locale_key: { locale, key } }
    });

    return { message: 'Translation deleted' };
  }

  /**
   * Get supported languages info
   */
  getSupportedLanguages() {
    return [
      { code: 'en', name: 'English', direction: 'ltr' },
      { code: 'ur', name: 'اردو (Urdu)', direction: 'rtl' },
      { code: 'ar', name: 'العربية (Arabic)', direction: 'rtl' }
    ];
  }

  /**
   * Initialize default translations
   */
  async initializeDefaultTranslations() {
    const defaultTranslations = {
      en: {
        // General
        'dashboard': 'Dashboard',
        'products': 'Products',
        'orders': 'Orders',
        'customers': 'Customers',
        'reports': 'Reports',
        'settings': 'Settings',
        'pos': 'POS',
        'logout': 'Logout',
        'login': 'Login',
        'welcome': 'Welcome',
        
        // Actions
        'save': 'Save',
        'cancel': 'Cancel',
        'delete': 'Delete',
        'edit': 'Edit',
        'add': 'Add',
        'search': 'Search',
        'filter': 'Filter',
        'export': 'Export',
        'print': 'Print',
        
        // Messages
        'success': 'Success',
        'error': 'Error',
        'warning': 'Warning',
        'confirm_delete': 'Are you sure you want to delete?',
        'no_data': 'No data found',
        'loading': 'Loading...',
        
        // POS
        'add_to_cart': 'Add to Cart',
        'checkout': 'Checkout',
        'subtotal': 'Subtotal',
        'discount': 'Discount',
        'tax': 'Tax',
        'total': 'Total',
        'pay': 'Pay',
        'cash': 'Cash',
        'card': 'Card',
        'change': 'Change',
        'hold_order': 'Hold Order',
        'held_orders': 'Held Orders',
        
        // Orders
        'order_number': 'Order #',
        'order_date': 'Order Date',
        'order_status': 'Status',
        'order_total': 'Total',
        'dine_in': 'Dine In',
        'takeaway': 'Takeaway',
        'delivery': 'Delivery',
        
        // Currency
        'currency': 'PKR',
        'currency_symbol': 'Rs.'
      },
      ur: {
        // General
        'dashboard': 'ڈیش بورڈ',
        'products': 'مصنوعات',
        'orders': 'آرڈرز',
        'customers': 'گاہک',
        'reports': 'رپورٹس',
        'settings': 'ترتیبات',
        'pos': 'پوائنٹ آف سیل',
        'logout': 'لاگ آؤٹ',
        'login': 'لاگ ان',
        'welcome': 'خوش آمدید',
        
        // Actions
        'save': 'محفوظ کریں',
        'cancel': 'منسوخ کریں',
        'delete': 'حذف کریں',
        'edit': 'ترمیم کریں',
        'add': 'شامل کریں',
        'search': 'تلاش کریں',
        'filter': 'فلٹر',
        'export': 'ایکسپورٹ',
        'print': 'پرنٹ',
        
        // Messages
        'success': 'کامیابی',
        'error': 'خرابی',
        'warning': 'انتباہ',
        'confirm_delete': 'کیا آپ واقعی حذف کرنا چاہتے ہیں؟',
        'no_data': 'کوئی ڈیٹا نہیں ملا',
        'loading': 'لوڈ ہو رہا ہے...',
        
        // POS
        'add_to_cart': 'کارٹ میں شامل کریں',
        'checkout': 'چیک آؤٹ',
        'subtotal': 'ذیلی کل',
        'discount': 'رعایت',
        'tax': 'ٹیکس',
        'total': 'کل',
        'pay': 'ادائیگی',
        'cash': 'نقد',
        'card': 'کارڈ',
        'change': 'واپسی',
        'hold_order': 'آرڈر روکیں',
        'held_orders': 'روکے گئے آرڈرز',
        
        // Orders
        'order_number': 'آرڈر نمبر',
        'order_date': 'آرڈر کی تاریخ',
        'order_status': 'حیثیت',
        'order_total': 'کل',
        'dine_in': 'اندر کھانا',
        'takeaway': 'ٹیک اوے',
        'delivery': 'ڈیلیوری',
        
        // Currency
        'currency': 'PKR',
        'currency_symbol': 'روپے'
      },
      ar: {
        // General
        'dashboard': 'لوحة القيادة',
        'products': 'المنتجات',
        'orders': 'الطلبات',
        'customers': 'العملاء',
        'reports': 'التقارير',
        'settings': 'الإعدادات',
        'pos': 'نقطة البيع',
        'logout': 'تسجيل خروج',
        'login': 'تسجيل دخول',
        'welcome': 'أهلاً وسهلاً',
        
        // Actions
        'save': 'حفظ',
        'cancel': 'إلغاء',
        'delete': 'حذف',
        'edit': 'تعديل',
        'add': 'إضافة',
        'search': 'بحث',
        'filter': 'تصفية',
        'export': 'تصدير',
        'print': 'طباعة',
        
        // Messages
        'success': 'نجاح',
        'error': 'خطأ',
        'warning': 'تحذير',
        'confirm_delete': 'هل أنت متأكد من الحذف؟',
        'no_data': 'لا توجد بيانات',
        'loading': 'جاري التحميل...',
        
        // POS
        'add_to_cart': 'أضف إلى السلة',
        'checkout': 'الدفع',
        'subtotal': 'المجموع الفرعي',
        'discount': 'خصم',
        'tax': 'ضريبة',
        'total': 'المجموع',
        'pay': 'ادفع',
        'cash': 'نقد',
        'card': 'بطاقة',
        'change': 'الباقي',
        'hold_order': 'تعليق الطلب',
        'held_orders': 'الطلبات المعلقة',
        
        // Orders
        'order_number': 'رقم الطلب',
        'order_date': 'تاريخ الطلب',
        'order_status': 'الحالة',
        'order_total': 'المجموع',
        'dine_in': 'تناول الطعام',
        'takeaway': 'سفري',
        'delivery': 'توصيل',
        
        // Currency
        'currency': 'PKR',
        'currency_symbol': 'ر.س'
      }
    };

    let totalCount = 0;
    for (const [locale, translations] of Object.entries(defaultTranslations)) {
      const result = await this.bulkImport(locale, translations, 'default');
      totalCount += result.count;
    }

    return { message: 'Default translations initialized', count: totalCount };
  }
}

module.exports = new TranslationService();
