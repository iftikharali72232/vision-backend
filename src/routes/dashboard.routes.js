const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboard.controller');
const { authenticate, requireBranch, hasPermission } = require('../middlewares/auth');

// All routes require authentication and branch
router.use(authenticate);
router.use(requireBranch);

/**
 * ========================================
 * DASHBOARD APIs
 * ========================================
 * 
 * CRITICAL: All sales/revenue data comes from INVOICES
 * Orders are operational data, Invoices are financial data
 * 
 * Data is:
 * - Branch-based (filtered by branchId)
 * - Role-aware (permissions checked)
 * - Date-filtered (supports today, week, month, year)
 */

/**
 * @route GET /api/v1/dashboard
 * @desc Get dashboard summary
 * @query period: today|yesterday|week|month|year
 * @access Private - All roles with branch
 */
router.get('/', dashboardController.index);

/**
 * @route GET /api/v1/dashboard/summary
 * @desc Get dashboard summary (alias)
 * @query period: today|yesterday|week|month|year
 * @access Private - All roles with branch
 */
router.get('/summary', dashboardController.summary);

/**
 * @route GET /api/v1/dashboard/stats
 * @desc Get dashboard stats (legacy alias)
 * @query period: today|yesterday|week|month|year
 * @access Private - All roles with branch
 */
router.get('/stats', dashboardController.stats);

/**
 * @route GET /api/v1/dashboard/sales
 * @desc Get sales statistics
 * @query date_from, date_to, group_by: day|week|month
 * @access Private - All roles with branch
 */
router.get('/sales', dashboardController.sales);

/**
 * @route GET /api/v1/dashboard/charts
 * @desc Get sales chart data
 * @query period: week|month|year
 * @query group_by: hour|day|week|month
 * @access Private - All roles with branch
 */
router.get('/charts', dashboardController.charts);

/**
 * @route GET /api/v1/dashboard/sales-chart
 * @desc Get sales chart data (alias)
 * @access Private - All roles with branch
 */
router.get('/sales-chart', dashboardController.salesChart);

/**
 * @route GET /api/v1/dashboard/top-products
 * @desc Get top selling products
 * @query period: week|month|year
 * @query limit: number (default 10)
 * @access Private - All roles with branch
 */
router.get('/top-products', dashboardController.topProducts);

/**
 * @route GET /api/v1/dashboard/recent-invoices
 * @desc Get recent invoices
 * @query limit: number (default 10)
 * @access Private - All roles with branch
 */
router.get('/recent-invoices', dashboardController.recentInvoices);

/**
 * @route GET /api/v1/dashboard/recent-orders
 * @desc Get recent orders
 * @query limit: number (default 10)
 * @access Private - All roles with branch
 */
router.get('/recent-orders', dashboardController.recentOrders);

/**
 * @route GET /api/v1/dashboard/payment-methods
 * @desc Get payment methods breakdown
 * @query period: today|week|month|year
 * @access Private - All roles with branch
 */
router.get('/payment-methods', dashboardController.paymentMethods);

/**
 * @route GET /api/v1/dashboard/hourly-sales
 * @desc Get hourly sales distribution
 * @query date: YYYY-MM-DD (optional, defaults to today)
 * @access Private - All roles with branch
 */
router.get('/hourly-sales', dashboardController.hourlySales);

/**
 * @route GET /api/v1/dashboard/low-stock
 * @desc Get low stock products
 * @query limit: number (default 10)
 * @access Private - All roles with branch
 */
router.get('/low-stock', dashboardController.lowStock);

module.exports = router;
