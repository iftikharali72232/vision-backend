/**
 * Print Controller
 * Handles printing operations: KOT, invoice, test, cash drawer, settings
 */

const printService = require('../services/print.service');

class PrintController {
  /**
   * Print KOT (Kitchen Order Ticket)
   * POST /print/kot
   */
  async printKOT(req, res, next) {
    try {
      const data = await printService.printKOT(
        req.tenantDb,
        req.user.branchId,
        req.body
      );

      res.json({
        success: true,
        message: 'KOT printed successfully',
        data
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Print invoice
   * POST /print/invoice
   */
  async printInvoice(req, res, next) {
    try {
      const data = await printService.printInvoice(
        req.tenantDb,
        req.user.branchId,
        req.body
      );

      res.json({
        success: true,
        message: 'Invoice printed successfully',
        data
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Test print
   * POST /print/test
   */
  async testPrint(req, res, next) {
    try {
      const data = await printService.testPrint(
        req.tenantDb,
        req.user.branchId,
        req.body
      );

      res.json({
        success: true,
        message: 'Test print sent',
        data
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Open cash drawer
   * POST /print/drawer
   */
  async openDrawer(req, res, next) {
    try {
      const data = await printService.openDrawer(
        req.tenantDb,
        req.user.branchId,
        req.body
      );

      res.json({
        success: true,
        message: 'Cash drawer opened',
        data
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get print settings
   * GET /print/settings
   */
  async getSettings(req, res, next) {
    try {
      const data = await printService.getSettings(req.user.branchId);

      res.json({
        success: true,
        data
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update print settings
   * PUT /print/settings
   */
  async updateSettings(req, res, next) {
    try {
      const data = await printService.updateSettings(
        req.user.branchId,
        req.body
      );

      res.json({
        success: true,
        message: 'Print settings updated',
        data
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new PrintController();
