const express = require('express');
const router = express.Router();
const reportController = require('../controllers/report.controller');
const { authenticate, hasPermission, requireBranch } = require('../middlewares/auth');
const validate = require('../middlewares/validate');
const reportValidation = require('../validations/report.validation');

// All routes require authentication and reports permission
router.use(authenticate);
router.use(hasPermission('reports', 'read'));
router.use(requireBranch);

/**
 * @route GET /api/v1/reports/sales
 * @desc Sales report
 * @access Private - Admin, Manager with branch
 */
router.get(
  '/sales',
  validate(reportValidation.salesReport),
  reportController.sales
);

/**
 * @route GET /api/v1/reports/products
 * @desc Product sales report
 * @access Private - Admin, Manager with branch
 */
router.get(
  '/products',
  validate(reportValidation.productReport),
  reportController.products
);

/**
 * @route GET /api/v1/reports/cashiers
 * @desc Cashier report
 * @access Private - Admin, Manager with branch
 */
router.get(
  '/cashiers',
  validate(reportValidation.cashierReport),
  reportController.cashiers
);

/**
 * @route GET /api/v1/reports/inventory
 * @desc Inventory report
 * @access Private - Admin, Manager with branch
 */
router.get(
  '/inventory',
  validate(reportValidation.inventoryReport),
  reportController.inventory
);

/**
 * @route GET /api/v1/reports/export
 * @desc Export report
 * @access Private - Admin, Manager with branch
 */
router.get(
  '/export',
  validate(reportValidation.exportReport),
  reportController.export
);

/**
 * @route GET /api/v1/reports/sales/summary
 * @desc Sales summary report (API Contract)
 * @access Private - Admin, Manager with branch
 */
router.get('/sales/summary', reportController.salesSummary);

/**
 * @route GET /api/v1/reports/sales/daily
 * @desc Daily sales report (API Contract)
 * @access Private - Admin, Manager with branch
 */
router.get('/sales/daily', reportController.salesDaily);

/**
 * @route GET /api/v1/reports/sales/products
 * @desc Product sales report (API Contract)
 * @access Private - Admin, Manager with branch
 */
router.get('/sales/products', reportController.products);

/**
 * @route GET /api/v1/reports/sales/categories
 * @desc Category sales report (API Contract)
 * @access Private - Admin, Manager with branch
 */
router.get('/sales/categories', reportController.salesCategories);

/**
 * @route GET /api/v1/reports/sales/hourly
 * @desc Hourly sales report (API Contract)
 * @access Private - Admin, Manager with branch
 */
router.get('/sales/hourly', reportController.salesHourly);

/**
 * @route GET /api/v1/reports/sales/payments
 * @desc Payment method breakdown (API Contract)
 * @access Private - Admin, Manager with branch
 */
router.get('/sales/payments', reportController.salesPayments);

/**
 * @route GET /api/v1/reports/tax
 * @desc Tax report (API Contract)
 * @access Private - Admin, Manager with branch
 */
router.get('/tax', reportController.taxReport);

/**
 * @route GET /api/v1/reports/profit-loss
 * @desc Profit & Loss report (API Contract)
 * @access Private - Admin, Manager with branch
 */
router.get('/profit-loss', reportController.profitLoss);

/**
 * @route GET /api/v1/reports/balance-sheet
 * @desc Balance Sheet report (API Contract)
 * @access Private - Admin, Manager with branch
 */
router.get('/balance-sheet', reportController.balanceSheet);

/**
 * @route GET /api/v1/reports/customers
 * @desc Customer report
 * @access Private - Admin, Manager with branch
 */
router.get('/customers', reportController.customers);

/**
 * @route GET /api/v1/reports/wastage
 * @desc Wastage report
 * @access Private - Admin, Manager with branch
 */
router.get('/wastage', reportController.wastage);

module.exports = router;
