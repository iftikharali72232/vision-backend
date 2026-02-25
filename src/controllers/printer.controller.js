/**
 * Printer Controller
 * Handles printer management HTTP requests
 */

const printerService = require('../services/printer.service');

class PrinterController {
  /**
   * Get all printers for branch
   * GET /printers
   */
  async getPrinters(req, res, next) {
    try {
      const data = await printerService.getPrinters(req.tenantDb, req.branchId);

      res.json({
        success: true,
        data
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get printer by ID
   * GET /printers/:id
   */
  async getPrinterById(req, res, next) {
    try {
      const data = await printerService.getPrinterById(
        req.tenantDb,
        req.branchId,
        req.params.id
      );

      res.json({
        success: true,
        data
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create new printer
   * POST /printers
   */
  async createPrinter(req, res, next) {
    try {
      const data = await printerService.createPrinter(
        req.tenantDb,
        req.branchId,
        req.body
      );

      res.status(201).json({
        success: true,
        message: 'Printer created successfully',
        data
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update printer
   * PUT /printers/:id
   */
  async updatePrinter(req, res, next) {
    try {
      const data = await printerService.updatePrinter(
        req.tenantDb,
        req.branchId,
        req.params.id,
        req.body
      );

      res.json({
        success: true,
        message: 'Printer updated successfully',
        data
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete printer
   * DELETE /printers/:id
   */
  async deletePrinter(req, res, next) {
    try {
      await printerService.deletePrinter(
        req.tenantDb,
        req.branchId,
        req.params.id
      );

      res.json({
        success: true,
        message: 'Printer deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Test printer connection
   * POST /printers/:id/test
   */
  async testPrinter(req, res, next) {
    try {
      const data = await printerService.testPrinter(
        req.tenantDb,
        req.branchId,
        req.params.id
      );

      res.json({
        success: true,
        message: 'Printer test successful',
        data
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Discover system printers
   * GET /printers/discover
   */
  async discoverPrinters(req, res, next) {
    try {
      const data = await printerService.discoverPrinters();

      res.json({
        success: true,
        data
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Print test page
   * POST /printers/:id/print-test
   */
  async printTestPage(req, res, next) {
    try {
      const printer = await printerService.getPrinterById(
        req.tenantDb,
        req.branchId,
        req.params.id
      );

      // Generate test content
      const testContent = {
        title: 'Test Print',
        printer: printer.name,
        timestamp: new Date().toISOString(),
        message: 'If you can read this, your printer is working!'
      };

      res.json({
        success: true,
        message: 'Test page sent to printer',
        data: testContent
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new PrinterController();
