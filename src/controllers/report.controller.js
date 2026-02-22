const reportService = require('../services/report.service');

class ReportController {
  /**
   * Sales report
   * GET /reports/sales
   */
  async sales(req, res, next) {
    try {
      const data = await reportService.getSalesReport(req.query, req.branchId);

      res.json({
        success: true,
        data
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Product sales report
   * GET /reports/products
   */
  async products(req, res, next) {
    try {
      const data = await reportService.getProductReport(req.query, req.branchId);

      res.json({
        success: true,
        data
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Cashier report
   * GET /reports/cashiers
   */
  async cashiers(req, res, next) {
    try {
      const data = await reportService.getCashierReport(req.query, req.branchId);

      res.json({
        success: true,
        data
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Inventory report
   * GET /reports/inventory
   */
  async inventory(req, res, next) {
    try {
      const data = await reportService.getInventoryReport(req.query, req.branchId);

      res.json({
        success: true,
        data
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Export report
   * GET /reports/export
   */
  async export(req, res, next) {
    try {
      const data = await reportService.exportReport(req.query, req.branchId);

      // For simplicity, return JSON - real implementation would generate actual files
      res.json({
        success: true,
        data
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Sales Summary report
   * GET /reports/sales/summary
   */
  async salesSummary(req, res, next) {
    try {
      const data = await reportService.getSalesSummary(req.query, req.branchId);
      res.json({
        success: true,
        data
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Daily Sales report
   * GET /reports/sales/daily
   */
  async salesDaily(req, res, next) {
    try {
      const data = await reportService.getDailySales(req.query, req.branchId);
      res.json({
        success: true,
        data
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Product Sales report
   * GET /reports/sales/products
   */
  async salesProducts(req, res, next) {
    try {
      const data = await reportService.getProductReport(req.query, req.branchId);
      res.json({
        success: true,
        data
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Category Sales report
   * GET /reports/sales/categories
   */
  async salesCategories(req, res, next) {
    try {
      const data = await reportService.getCategorySales(req.query, req.branchId);
      res.json({
        success: true,
        data
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Hourly Sales report
   * GET /reports/sales/hourly
   */
  async salesHourly(req, res, next) {
    try {
      const data = await reportService.getHourlySales(req.query, req.branchId);
      res.json({
        success: true,
        data
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Payment Methods report
   * GET /reports/sales/payments
   */
  async salesPayments(req, res, next) {
    try {
      const data = await reportService.getPaymentMethodsReport(req.query, req.branchId);
      res.json({
        success: true,
        data
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Tax report
   * GET /reports/tax
   */
  async taxReport(req, res, next) {
    try {
      const data = await reportService.getTaxReport(req.query, req.branchId);
      res.json({
        success: true,
        data
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Profit & Loss report
   * GET /reports/profit-loss
   */
  async profitLoss(req, res, next) {
    try {
      const data = await reportService.getProfitLossReport(req.query, req.branchId);
      res.json({
        success: true,
        data
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Customer report
   * GET /reports/customers
   */
  async customers(req, res, next) {
    try {
      const data = await reportService.getCustomerReport(req.query, req.branchId);
      res.json({
        success: true,
        data
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Balance Sheet report
   * GET /reports/balance-sheet
   */
  async balanceSheet(req, res, next) {
    try {
      const data = await reportService.getBalanceSheet(req.query, req.branchId);
      res.json({
        success: true,
        data
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Wastage report
   * GET /reports/wastage
   */
  async wastage(req, res, next) {
    try {
      const data = await reportService.getWastageReport(req.query, req.branchId);
      res.json({
        success: true,
        data
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ReportController();
