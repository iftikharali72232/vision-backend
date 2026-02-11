const { body, param, query } = require('express-validator');

const createBranch = [
  body('name')
    .notEmpty().withMessage('Name is required')
    .isLength({ min: 2, max: 255 }).withMessage('Name must be 2-255 characters'),
  body('code')
    .notEmpty().withMessage('Code is required')
    .isLength({ min: 2, max: 50 }).withMessage('Code must be 2-50 characters'),
  body('address')
    .optional()
    .isLength({ max: 500 }).withMessage('Address must not exceed 500 characters'),
  body('phone')
    .optional()
    .isLength({ max: 50 }).withMessage('Phone must not exceed 50 characters'),
  body('email')
    .optional()
    .isEmail().withMessage('Invalid email format'),
  body('is_active')
    .optional()
    .isBoolean().withMessage('is_active must be a boolean'),
  body('settings')
    .optional()
    .isObject().withMessage('Settings must be an object')
];

const updateBranch = [
  param('id')
    .isInt().withMessage('Invalid branch ID'),
  body('name')
    .optional()
    .isLength({ min: 2, max: 255 }).withMessage('Name must be 2-255 characters'),
  body('address')
    .optional()
    .isLength({ max: 500 }).withMessage('Address must not exceed 500 characters'),
  body('phone')
    .optional()
    .isLength({ max: 50 }).withMessage('Phone must not exceed 50 characters'),
  body('email')
    .optional()
    .isEmail().withMessage('Invalid email format'),
  body('is_active')
    .optional()
    .isBoolean().withMessage('is_active must be a boolean'),
  body('settings')
    .optional()
    .isObject().withMessage('Settings must be an object')
];

const listBranches = [
  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('per_page')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('Per page must be between 1 and 100'),
  query('status')
    .optional()
    .isIn(['active', 'inactive']).withMessage('Invalid status')
];

module.exports = {
  createBranch,
  updateBranch,
  listBranches,
  getBranchById: [param('id').isInt().withMessage('Invalid branch ID')],
  deleteBranch: [param('id').isInt().withMessage('Invalid branch ID')]
};
