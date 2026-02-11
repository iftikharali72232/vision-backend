const { query } = require('express-validator');

const reportDateRange = [
  query('date_from')
    .notEmpty().withMessage('Start date is required')
    .isISO8601().withMessage('Invalid date format (use YYYY-MM-DD)'),
  query('date_to')
    .notEmpty().withMessage('End date is required')
    .isISO8601().withMessage('Invalid date format (use YYYY-MM-DD)')
];

const salesReport = [
  ...reportDateRange,
  query('group_by')
    .optional()
    .isIn(['day', 'week', 'month']).withMessage('Invalid group_by value'),
  query('branch_id')
    .optional()
    .isInt().withMessage('Branch ID must be an integer'),
  query('user_id')
    .optional()
    .isInt().withMessage('User ID must be an integer'),
  query('payment_method')
    .optional()
    .isIn(['cash', 'card', 'split']).withMessage('Invalid payment method')
];

const productReport = [
  ...reportDateRange,
  query('category_id')
    .optional()
    .isInt().withMessage('Category ID must be an integer'),
  query('sort_by')
    .optional()
    .isIn(['quantity', 'revenue', 'profit']).withMessage('Invalid sort field'),
  query('sort_order')
    .optional()
    .isIn(['asc', 'desc']).withMessage('Invalid sort order')
];

const inventoryReport = [
  query('category_id')
    .optional()
    .isInt().withMessage('Category ID must be an integer'),
  query('stock_status')
    .optional()
    .isIn(['all', 'low', 'out']).withMessage('Invalid stock status')
];

const cashierReport = [
  ...reportDateRange,
  query('branch_id')
    .optional()
    .isInt().withMessage('Branch ID must be an integer'),
  query('user_id')
    .optional()
    .isInt().withMessage('User ID must be an integer')
];

const exportReport = [
  query('report_type')
    .notEmpty().withMessage('Report type is required')
    .isIn(['sales', 'products', 'cashiers', 'inventory']).withMessage('Invalid report type'),
  query('format')
    .notEmpty().withMessage('Export format is required')
    .isIn(['csv', 'xlsx', 'pdf']).withMessage('Invalid export format'),
  ...reportDateRange
];

module.exports = {
  reportDateRange,
  salesReport,
  productReport,
  cashierReport,
  inventoryReport,
  exportReport
};
