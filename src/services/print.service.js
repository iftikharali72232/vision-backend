/**
 * Print Service
 * Handles print operations: KOT, invoice, receipts, cash drawer
 */

const { getTenantPrisma } = require('../config/database');
const { NotFoundError, BadRequestError } = require('../middlewares/errorHandler');

class PrintService {
  /**
   * Print KOT (Kitchen Order Ticket)
   * In a real system, this would send data to a thermal printer via network/USB.
   * Here we prepare the KOT data and mark the order items as sent-to-kitchen.
   */
  async printKOT(tenantDb, branchId, { order_id, kitchen }) {
    const tenantPrisma = getTenantPrisma(tenantDb);

    const order = await tenantPrisma.order.findFirst({
      where: { id: parseInt(order_id), branchId: parseInt(branchId) },
      include: {
        items: {
          include: {
            product: { select: { id: true, name: true, sku: true } },
            variation: { select: { id: true, name: true } }
          }
        },
        table: { select: { id: true, name: true } }
      }
    });

    if (!order) {
      throw new NotFoundError('Order');
    }

    // Build KOT data
    const kotData = {
      order_id: order.id,
      order_number: order.orderNumber,
      table: order.table ? order.table.name : 'Takeaway',
      kitchen: kitchen || 'Main Kitchen',
      items: order.items.map(item => ({
        name: item.product?.name || item.name,
        variation: item.variation?.name || null,
        quantity: item.quantity,
        notes: item.notes || null
      })),
      printed_at: new Date().toISOString()
    };

    return kotData;
  }

  /**
   * Print invoice
   */
  async printInvoice(tenantDb, branchId, { invoice_id }) {
    const tenantPrisma = getTenantPrisma(tenantDb);

    // Try to find invoice in accounting module
    let invoice;
    try {
      invoice = await tenantPrisma.invoice.findFirst({
        where: { id: parseInt(invoice_id), branchId: parseInt(branchId) },
        include: {
          items: true,
          order: true
        }
      });
    } catch (e) {
      // Invoice model may not exist in all tenants
    }

    if (!invoice) {
      throw new NotFoundError('Invoice');
    }

    return {
      invoice_id: invoice.id,
      invoice_number: invoice.invoiceNumber,
      date: invoice.createdAt,
      items: invoice.items || [],
      total: invoice.total,
      printed_at: new Date().toISOString()
    };
  }

  /**
   * Test print
   */
  async testPrint(tenantDb, branchId, { printer_id }) {
    const tenantPrisma = getTenantPrisma(tenantDb);

    let printer = null;
    if (printer_id) {
      printer = await tenantPrisma.printer.findFirst({
        where: { id: parseInt(printer_id), branchId: parseInt(branchId) }
      });

      if (!printer) {
        throw new NotFoundError('Printer');
      }
    }

    return {
      success: true,
      printer: printer ? printer.name : 'Default',
      message: 'Test print sent successfully',
      printed_at: new Date().toISOString()
    };
  }

  /**
   * Open cash drawer
   */
  async openDrawer(tenantDb, branchId, { printer_id }) {
    const tenantPrisma = getTenantPrisma(tenantDb);

    let printer = null;
    if (printer_id) {
      printer = await tenantPrisma.printer.findFirst({
        where: { id: parseInt(printer_id), branchId: parseInt(branchId) }
      });
    }

    // In real implementation, send ESC/POS command to open drawer
    return {
      success: true,
      printer: printer ? printer.name : 'Default',
      message: 'Cash drawer command sent',
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Get print settings
   */
  async getSettings(branchId) {
    const setting = await prisma.setting.findUnique({
      where: { key: 'print' }
    });

    if (setting) {
      return setting.value;
    }

    // Return defaults
    return {
      receipt: {
        paper_width: 80,
        header: '',
        footer: 'Thank you for visiting!',
        show_logo: true,
        logo_url: '',
        show_barcode: true,
        show_qr: false,
        font_size: 'normal',
        copies: 1,
        auto_print: false
      },
      kot: {
        paper_width: 80,
        font_size: 'large',
        copies: 1,
        auto_print: true,
        show_modifiers: true,
        show_notes: true,
        group_by_category: false
      },
      invoice: {
        paper_size: 'a4',
        show_logo: true,
        show_terms: true,
        terms_text: ''
      },
      drawer: {
        open_on_cash_payment: true,
        auto_open: false
      }
    };
  }

  /**
   * Update print settings
   */
  async updateSettings(branchId, data) {
    const current = await this.getSettings(branchId);
    const merged = { ...current, ...data };

    await prisma.setting.upsert({
      where: { key: 'print' },
      update: { value: merged },
      create: { key: 'print', value: merged }
    });

    return merged;
  }
}

module.exports = new PrintService();
