const { body, param, query } = require('express-validator');

const createCategory = [
  body('name')
    .notEmpty().withMessage('Name is required')
    .isLength({ min: 2, max: 255 }).withMessage('Name must be 2-255 characters'),
  body('description')
    .optional()
    .isLength({ max: 1000 }).withMessage('Description must not exceed 1000 characters'),
  body('parent_id')
    .optional({ nullable: true })
    .isInt().withMessage('Parent ID must be an integer'),
  body('image')
    .optional()
    .isString().withMessage('Image must be a string'),
  body('is_active')
    .optional()
    .isBoolean().withMessage('is_active must be a boolean')
];

const updateCategory = [
  param('id')
    .isInt().withMessage('Invalid category ID'),
  body('name')
    .optional()
    .isLength({ min: 2, max: 255 }).withMessage('Name must be 2-255 characters'),
  body('description')
    .optional()
    .isLength({ max: 1000 }).withMessage('Description must not exceed 1000 characters'),
  body('parent_id')
    .optional({ nullable: true })
    .custom((value) => {
      if (value !== null && !Number.isInteger(value)) {
        throw new Error('Parent ID must be an integer or null');
      }
      return true;
    }),
  body('image')
    .optional()
    .isString().withMessage('Image must be a string'),
  body('is_active')
    .optional()
    .isBoolean().withMessage('is_active must be a boolean')
];

const listCategories = [
  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('per_page')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('Per page must be between 1 and 100'),
  query('parent_id')
    .optional()
    .isInt().withMessage('Parent ID must be an integer'),
  query('status')
    .optional()
    .isIn(['active', 'inactive']).withMessage('Invalid status')
];

module.exports = {
  createCategory,
  updateCategory,
  getCategories: listCategories,
  getCategoryById: [param('id').isInt().withMessage('Invalid category ID')],
  deleteCategoryById: [param('id').isInt().withMessage('Invalid category ID')]
};
