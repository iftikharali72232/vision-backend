const { body, param, query } = require('express-validator');

const createCustomer = [
  body('name')
    .notEmpty().withMessage('Name is required')
    .isLength({ min: 2, max: 255 }).withMessage('Name must be 2-255 characters'),
  body('email')
    .optional()
    .isEmail().withMessage('Invalid email format'),
  body('phone')
    .optional()
    .isLength({ max: 50 }).withMessage('Phone must not exceed 50 characters'),
  body('address')
    .optional()
    .isLength({ max: 500 }).withMessage('Address must not exceed 500 characters'),
  body('notes')
    .optional()
    .isLength({ max: 1000 }).withMessage('Notes must not exceed 1000 characters')
];

const updateCustomer = [
  param('id')
    .isInt().withMessage('Invalid customer ID'),
  body('name')
    .optional()
    .isLength({ min: 2, max: 255 }).withMessage('Name must be 2-255 characters'),
  body('email')
    .optional()
    .isEmail().withMessage('Invalid email format'),
  body('phone')
    .optional()
    .isLength({ max: 50 }).withMessage('Phone must not exceed 50 characters'),
  body('address')
    .optional()
    .isLength({ max: 500 }).withMessage('Address must not exceed 500 characters'),
  body('notes')
    .optional()
    .isLength({ max: 1000 }).withMessage('Notes must not exceed 1000 characters')
];

const listCustomers = [
  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('per_page')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('Per page must be between 1 and 100'),
  query('sort_by')
    .optional()
    .isIn(['name', 'created_at', 'total_purchases']).withMessage('Invalid sort field'),
  query('sort_order')
    .optional()
    .isIn(['asc', 'desc']).withMessage('Invalid sort order')
];

const searchCustomers = [
  query('q')
    .notEmpty().withMessage('Search query is required'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50')
];

module.exports = {
  createCustomer,
  updateCustomer,
  listCustomers,
  getCustomers: listCustomers,
  searchCustomers
};
