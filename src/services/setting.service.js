const { getCurrentPrisma } = require('../middlewares/requestContext');
const prisma = new Proxy({}, { get: (_, prop) => getCurrentPrisma()[prop] });
const { NotFoundError } = require('../middlewares/errorHandler');

class SettingService {
  /**
   * Get all settings
   */
  async getSettings() {
    const settings = await prisma.setting.findMany();

    const result = {
      general: {},
      tax: {},
      receipt: {},
      pos: {}
    };

    settings.forEach(setting => {
      result[setting.key] = setting.value;
    });

    // Return defaults if not set
    if (Object.keys(result.general).length === 0) {
      result.general = {
        business_name: 'My POS Store',
        currency: 'USD',
        currency_symbol: '$',
        date_format: 'YYYY-MM-DD',
        time_format: 'HH:mm:ss',
        timezone: 'America/New_York'
      };
    }

    if (Object.keys(result.tax).length === 0) {
      result.tax = {
        enabled: true,
        type: 'exclusive',
        default_rate: 10,
        tax_number: ''
      };
    }

    if (Object.keys(result.receipt).length === 0) {
      result.receipt = {
        header: 'Welcome!',
        footer: 'Thank you for shopping!',
        show_logo: true,
        logo_url: '',
        show_barcode: true,
        paper_width: 80
      };
    }

    if (Object.keys(result.pos).length === 0) {
      result.pos = {
        allow_negative_stock: false,
        low_stock_alert: true,
        require_customer: false,
        quick_cash_amounts: [5, 10, 20, 50, 100]
      };
    }

    if (!result.payment_methods || Object.keys(result.payment_methods).length === 0) {
      result.payment_methods = {
        enabled: ['cash', 'card', 'online', 'split', 'wallet']
      };
    }

    return result;
  }

  /**
   * Update settings
   */
  async updateSettings(data) {
    const { general, tax, receipt, pos } = data;

    // Get current settings
    const currentSettings = await this.getSettings();

    // Update each section if provided
    if (general) {
      await this.upsertSetting('general', {
        ...currentSettings.general,
        ...general
      });
    }

    if (tax) {
      await this.upsertSetting('tax', {
        ...currentSettings.tax,
        ...tax
      });
    }

    if (receipt) {
      await this.upsertSetting('receipt', {
        ...currentSettings.receipt,
        ...receipt
      });
    }

    if (pos) {
      await this.upsertSetting('pos', {
        ...currentSettings.pos,
        ...pos
      });
    }

    if (data.payment_methods) {
      await this.upsertSetting('payment_methods', {
        ...(currentSettings.payment_methods || {}),
        ...data.payment_methods
      });
    }

    // Return updated settings
    return this.getSettings();
  }

  /**
   * Upsert a single setting
   */
  async upsertSetting(key, value) {
    await prisma.setting.upsert({
      where: { key },
      update: { value },
      create: { key, value }
    });
  }

  /**
   * Get a specific setting
   */
  async getSetting(key) {
    // Return null if key is undefined or null
    if (!key || key === 'undefined' || key === 'null') {
      return null;
    }

    const setting = await prisma.setting.findUnique({
      where: { key }
    });

    if (!setting) {
      return null; // Return null instead of throwing error
    }

    return setting.value;
  }
}

module.exports = new SettingService();
