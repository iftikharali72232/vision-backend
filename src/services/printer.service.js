/**
 * Printer Service
 * Handles printer management and printing operations
 */

const { getTenantPrisma } = require('../config/database');
const { NotFoundError, BadRequestError } = require('../middlewares/errorHandler');

class PrinterService {
  /**
   * Get all printers for a branch
   */
  async getPrinters(tenantDb, branchId) {
    const tenantPrisma = getTenantPrisma(tenantDb);
    
    const where = {};
    if (branchId) {
      where.branchId = parseInt(branchId);
    }
    
    const printers = await tenantPrisma.printer.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });

    return printers.map(p => ({
      id: p.id,
      name: p.name,
      type: p.type,
      connection: p.connection,
      address: p.address,
      width: p.width,
      isDefault: p.isDefault,
      isActive: p.isActive,
      printReceipt: p.printReceipt,
      printKitchen: p.printKitchen,
      createdAt: p.createdAt
    }));
  }

  /**
   * Get printer by ID
   */
  async getPrinterById(tenantDb, branchId, printerId) {
    const tenantPrisma = getTenantPrisma(tenantDb);

    const printer = await tenantPrisma.printer.findFirst({
      where: {
        id: parseInt(printerId),
        branchId: parseInt(branchId)
      }
    });

    if (!printer) {
      throw new NotFoundError('Printer');
    }

    return {
      id: printer.id,
      name: printer.name,
      type: printer.type,
      connection: printer.connection,
      address: printer.address,
      width: printer.width,
      isDefault: printer.isDefault,
      isActive: printer.isActive,
      printReceipt: printer.printReceipt,
      printKitchen: printer.printKitchen,
      createdAt: printer.createdAt
    };
  }

  /**
   * Create new printer
   */
  async createPrinter(tenantDb, branchId, data) {
    const tenantPrisma = getTenantPrisma(tenantDb);
    
    if (!branchId) {
      throw new BadRequestError('Branch ID is required');
    }

    // If this is set as default, unset other defaults in the same branch
    if (data.isDefault) {
      const where = { isDefault: true };
      where.branchId = parseInt(branchId);
      await tenantPrisma.printer.updateMany({
        where,
        data: { isDefault: false }
      });
    }

    const printer = await tenantPrisma.printer.create({
      data: {
        branchId: parseInt(branchId),
        name: data.name,
        type: data.type || 'thermal',
        connection: data.connection || 'usb',
        address: data.address || null,
        width: data.width || 80,
        isDefault: data.isDefault || false,
        isActive: data.isActive !== false,
        printReceipt: data.printReceipt !== false,
        printKitchen: data.printKitchen || false
      }
    });

    return {
      id: printer.id,
      name: printer.name,
      type: printer.type,
      connection: printer.connection,
      address: printer.address,
      width: printer.width,
      isDefault: printer.isDefault,
      isActive: printer.isActive,
      printReceipt: printer.printReceipt,
      printKitchen: printer.printKitchen,
      createdAt: printer.createdAt
    };
  }

  /**
   * Update printer
   */
  async updatePrinter(tenantDb, branchId, printerId, data) {
    const tenantPrisma = getTenantPrisma(tenantDb);

    const existingPrinter = await tenantPrisma.printer.findFirst({
      where: {
        id: parseInt(printerId),
        branchId: parseInt(branchId)
      }
    });

    if (!existingPrinter) {
      throw new NotFoundError('Printer');
    }

    if (!branchId) {
      throw new BadRequestError('Branch ID is required');
    }

    // If this is set as default, unset other defaults in the same branch
    if (data.isDefault) {
      const where = { isDefault: true };
      where.branchId = parseInt(branchId);
      where.id = { not: parseInt(printerId) };
      await tenantPrisma.printer.updateMany({
        where,
        data: { isDefault: false }
      });
    }

    const updateData = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.type !== undefined) updateData.type = data.type;
    if (data.connection !== undefined) updateData.connection = data.connection;
    if (data.address !== undefined) updateData.address = data.address;
    if (data.width !== undefined) updateData.width = data.width;
    if (data.isDefault !== undefined) updateData.isDefault = data.isDefault;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;
    if (data.printReceipt !== undefined) updateData.printReceipt = data.printReceipt;
    if (data.printKitchen !== undefined) updateData.printKitchen = data.printKitchen;

    const printer = await tenantPrisma.printer.update({
      where: { id: parseInt(printerId) },
      data: updateData
    });

    return {
      id: printer.id,
      name: printer.name,
      type: printer.type,
      connection: printer.connection,
      address: printer.address,
      width: printer.width,
      isDefault: printer.isDefault,
      isActive: printer.isActive,
      printReceipt: printer.printReceipt,
      printKitchen: printer.printKitchen,
      createdAt: printer.createdAt
    };
  }

  /**
   * Delete printer
   */
  async deletePrinter(tenantDb, branchId, printerId) {
    const tenantPrisma = getTenantPrisma(tenantDb);

    const existingPrinter = await tenantPrisma.printer.findFirst({
      where: {
        id: parseInt(printerId),
        branchId: parseInt(branchId)
      }
    });

    if (!existingPrinter) {
      throw new NotFoundError('Printer');
    }

    await tenantPrisma.printer.delete({
      where: { id: parseInt(printerId) }
    });

    return true;
  }

  /**
   * Get default printer for branch
   */
  async getDefaultPrinter(tenantDb, branchId, type = 'receipt') {
    const tenantPrisma = getTenantPrisma(tenantDb);

    const where = {
      branchId: parseInt(branchId),
      isActive: true
    };

    // Filter by type
    if (type === 'receipt') {
      where.printReceipt = true;
    } else if (type === 'kitchen') {
      where.printKitchen = true;
    }

    // First try to get the default printer
    let printer = await tenantPrisma.printer.findFirst({
      where: { ...where, isDefault: true }
    });

    // If no default, get any active printer
    if (!printer) {
      printer = await tenantPrisma.printer.findFirst({
        where
      });
    }

    return printer;
  }

  /**
   * Test printer connection
   * This is a placeholder - actual implementation depends on the printing method
   */
  async testPrinter(tenantDb, branchId, printerId) {
    const printer = await this.getPrinterById(tenantDb, branchId, printerId);

    // In a real implementation, you would:
    // 1. For USB: Check if the device exists
    // 2. For Network: Ping the IP address
    // 3. For Bluetooth: Check pairing status

    return {
      success: true,
      printer: printer.name,
      message: 'Printer is available'
    };
  }

  /**
   * Discover system printers
   * This returns common printer paths for different connection types
   * In production, you'd use a native module to detect actual printers
   */
  async discoverPrinters() {
    // Common USB printer paths on Linux
    const usbPaths = [
      '/dev/usb/lp0',
      '/dev/usb/lp1',
      '/dev/usb/lp2',
      '/dev/usblp0',
      '/dev/usblp1'
    ];

    // Common network printer ports
    const networkPorts = [9100, 515, 631];

    // Return discovered printers
    return {
      usb: usbPaths.map(path => ({
        name: `USB Printer (${path})`,
        path,
        type: 'usb'
      })),
      network: [
        {
          name: 'Network Printer',
          host: '192.168.1.100',
          port: 9100,
          type: 'network'
        }
      ],
      instructions: {
        usb: 'Connect your USB thermal printer and it will appear at /dev/usb/lp0',
        network: 'Enter the IP address of your network printer',
        bluetooth: 'Pair your Bluetooth printer via system settings first'
      }
    };
  }
}

module.exports = new PrinterService();
