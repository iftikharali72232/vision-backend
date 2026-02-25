const { body, param, query } = require('express-validator');

const createUser = [
  body('name')
    .notEmpty().withMessage('Name is required')
    .isLength({ min: 2, max: 255 }).withMessage('Name must be 2-255 characters'),
  body('email')
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Invalid email format'),
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('password_confirmation')
    .notEmpty().withMessage('Password confirmation is required')
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('Passwords do not match');
      }
      return true;
    }),
  body('role_id')
    .notEmpty().withMessage('Role is required')
    .isInt({ min: 1 }).withMessage('Invalid role'),
  body('phone')
    .optional()
    .isLength({ max: 50 }).withMessage('Phone must not exceed 50 characters'),
  body('branch_ids')
    .optional()
    .isArray().withMessage('Branch IDs must be an array'),
  body('is_active')
    .optional()
    .isBoolean().withMessage('is_active must be a boolean')
];

const updateUser = [
  param('id')
    .isInt().withMessage('Invalid user ID'),
  body('name')
    .optional()
    .isLength({ min: 2, max: 255 }).withMessage('Name must be 2-255 characters'),
  body('email')
    .optional()
    .isEmail().withMessage('Invalid email format'),
  body('role_id')
    .optional()
    .isInt({ min: 1 }).withMessage('Invalid role'),
  body('phone')
    .optional()
    .isLength({ max: 50 }).withMessage('Phone must not exceed 50 characters'),
  body('branch_ids')
    .optional()
    .isArray().withMessage('Branch IDs must be an array'),
  body('is_active')
    .optional()
    .isBoolean().withMessage('is_active must be a boolean')
];

const resetPassword = [
  param('id')
    .isInt().withMessage('Invalid user ID'),
  body('new_password')
    .notEmpty().withMessage('New password is required')
    .isLength({ min: 6 }).withMessage('New password must be at least 6 characters'),
  body('new_password_confirmation')
    .notEmpty().withMessage('Password confirmation is required')
    .custom((value, { req }) => {
      if (value !== req.body.new_password) {
        throw new Error('Passwords do not match');
      }
      return true;
    })
];

const listUsers = [
  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('per_page')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('Per page must be between 1 and 100'),
  query('role')
    .optional()
    .isIn(['admin', 'manager', 'cashier']).withMessage('Invalid role'),
  query('status')
    .optional()
    .isIn(['active', 'inactive']).withMessage('Invalid status')
];

module.exports = {
  createUser,
  updateUser,
  resetPassword,
  listUsers,
  getUsers: listUsers,
  getUserById: [param('id').isInt().withMessage('Invalid user ID')],
  deleteUser: [param('id').isInt().withMessage('Invalid user ID')]
};
