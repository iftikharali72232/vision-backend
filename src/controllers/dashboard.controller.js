const dashboardService = require('../services/dashboard.service');
const productService = require('../services/product.service');

/**
 * Get dashboard summary
 * GET /dashboard or GET /dashboard/summary
 * 
 * Returns sales data from INVOICES (not orders)
 */
const index = async (req, res, next) => {
  try {
    const { period = 'today' } = req.query;
    const data = await dashboardService.getSummary(req.branchId, period);

    res.json({
      success: true,
      data
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get dashboard summary (alias)
 * GET /dashboard/summary
 */
const summary = index;

/**
 * Get dashboard stats (legacy alias)
 * GET /dashboard/stats
 */
const stats = index;

/**
 * Get sales chart data
 * GET /dashboard/charts or GET /dashboard/sales-chart
 * 
 * Returns sales data from INVOICES grouped by period
 */
const charts = async (req, res, next) => {
  try {
    const { period = 'month', group_by = 'day' } = req.query;
    const data = await dashboardService.getSalesChart(req.branchId, period, group_by);

    res.json({
      success: true,
      data
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get sales chart (alias)
 * GET /dashboard/sales-chart
 */
const salesChart = charts;

/**
 * Get top selling products
 * GET /dashboard/top-products
 */
const topProducts = async (req, res, next) => {
  try {
    const { period = 'month', limit = 10 } = req.query;
    const data = await dashboardService.getTopProducts(req.branchId, period, parseInt(limit));

    res.json({
      success: true,
      data
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get recent invoices
 * GET /dashboard/recent-invoices
 */
const recentInvoices = async (req, res, next) => {
  try {
    const { limit = 10 } = req.query;
    const data = await dashboardService.getRecentInvoices(req.branchId, parseInt(limit));

    res.json({
      success: true,
      data
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get recent orders
 * GET /dashboard/recent-orders
 */
const recentOrders = async (req, res, next) => {
  try {
    const { limit = 10 } = req.query;
    const data = await dashboardService.getRecentOrders(req.branchId, parseInt(limit));

    res.json({
      success: true,
      data
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get payment methods breakdown
 * GET /dashboard/payment-methods
 */
const paymentMethods = async (req, res, next) => {
  try {
    const { period = 'today' } = req.query;
    const data = await dashboardService.getPaymentMethods(req.branchId, period);

    res.json({
      success: true,
      data
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get hourly sales distribution
 * GET /dashboard/hourly-sales
 */
const hourlySales = async (req, res, next) => {
  try {
    const { date } = req.query;
    const data = await dashboardService.getHourlySales(req.branchId, date);

    res.json({
      success: true,
      data
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get low stock products
 * GET /dashboard/low-stock
 */
const lowStock = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const data = await productService.getLowStockProducts(req.branchId, limit);

    res.json({
      success: true,
      data
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get sales statistics
 * GET /dashboard/sales
 */
const sales = async (req, res, next) => {
  try {
    const { date_from, date_to, group_by = 'day' } = req.query;
    const data = await dashboardService.getSalesStats(req.branchId, date_from, date_to, group_by);

    res.json({
      success: true,
      data
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  index,
  summary,
  stats,
  charts,
  salesChart,
  topProducts,
  recentInvoices,
  recentOrders,
  paymentMethods,
  hourlySales,
  lowStock,
  sales
};
