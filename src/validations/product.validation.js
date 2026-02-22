const { body, param, query } = require('express-validator');

const createProduct = [
  body('name')
    .notEmpty().withMessage('Name is required')
    .isLength({ min: 2, max: 255 }).withMessage('Name must be 2-255 characters'),
  body('sku')
    .notEmpty().withMessage('SKU is required')
    .isLength({ min: 1, max: 100 }).withMessage('SKU must be 1-100 characters'),
  body('barcode')
    .optional()
    .isLength({ max: 100 }).withMessage('Barcode must not exceed 100 characters'),
  body('description')
    .optional()
    .isLength({ max: 2000 }).withMessage('Description must not exceed 2000 characters'),
  body('category_id')
    .optional({ nullable: true })
    .isInt().withMessage('Category ID must be an integer'),
  body('unit')
    .optional()
    .isIn(['pieces', 'piece', 'kg', 'gram', 'liters', 'liter', 'ml', 'box', 'pack']).withMessage('Invalid unit'),
  body('cost_price')
    .optional()
    .isFloat({ min: 0 }).withMessage('Cost price must be a positive number'),
  body('selling_price')
    .optional()
    .isFloat({ min: 0 }).withMessage('Selling price must be a positive number'),
  body('price')
    .optional()
    .isFloat({ min: 0 }).withMessage('Price must be a positive number')
    .custom((value, { req }) => {
      if (!req.body.selling_price && !req.body.price) {
        throw new Error('Selling price is required (use selling_price or price)');
      }
      return true;
    }),
  body('low_stock_threshold')
    .optional()
    .isInt({ min: 0 }).withMessage('Low stock threshold must be a non-negative integer'),
  body('image')
    .optional({ nullable: true })
    .isString().withMessage('Image must be a string'),
  body('images')
    .optional()
    .isArray().withMessage('Images must be an array'),
  body('is_active')
    .optional()
    .isBoolean().withMessage('is_active must be a boolean'),
  body('is_taxable')
    .optional()
    .isBoolean().withMessage('is_taxable must be a boolean'),
  body('tax_rate')
    .optional()
    .isFloat({ min: 0, max: 100 }).withMessage('Tax rate must be between 0 and 100'),
  body('branch_stocks')
    .optional()
    .isArray().withMessage('Branch stocks must be an array'),
  body('stock_quantity')
    .optional()
    .isInt({ min: 0 }).withMessage('Stock quantity must be a non-negative integer')
];

const updateProduct = [
  param('id')
    .isInt().withMessage('Invalid product ID'),
  body('name')
    .optional()
    .isLength({ min: 2, max: 255 }).withMessage('Name must be 2-255 characters'),
  body('description')
    .optional()
    .isLength({ max: 2000 }).withMessage('Description must not exceed 2000 characters'),
  body('category_id')
    .optional({ nullable: true })
    .custom((value) => {
      if (value !== null && !Number.isInteger(value)) {
        throw new Error('Category ID must be an integer or null');
      }
      return true;
    }),
  body('unit')
    .optional()
    .isIn(['pieces', 'piece', 'kg', 'gram', 'liters', 'liter', 'ml', 'box', 'pack']).withMessage('Invalid unit'),
  body('cost_price')
    .optional()
    .isFloat({ min: 0 }).withMessage('Cost price must be a positive number'),
  body('selling_price')
    .optional()
    .isFloat({ min: 0 }).withMessage('Selling price must be a positive number'),
  body('low_stock_threshold')
    .optional()
    .isInt({ min: 0 }).withMessage('Low stock threshold must be a non-negative integer'),
  body('is_active')
    .optional()
    .isBoolean().withMessage('is_active must be a boolean'),
  body('is_taxable')
    .optional()
    .isBoolean().withMessage('is_taxable must be a boolean'),
  body('tax_rate')
    .optional()
    .isFloat({ min: 0, max: 100 }).withMessage('Tax rate must be between 0 and 100')
];

const updateStock = [
  param('id')
    .isInt().withMessage('Invalid product ID'),
  body('quantity')
    .notEmpty().withMessage('Quantity is required')
    .isInt({ min: 0 }).withMessage('Quantity must be a non-negative integer'),
  body('adjustment_type')
    .notEmpty().withMessage('Adjustment type is required')
    .isIn(['set', 'add', 'subtract']).withMessage('Invalid adjustment type'),
  body('variation_id')
    .optional()
    .isInt({ min: 1 }).withMessage('variation_id must be a positive integer'),
  body('unit_cost')
    .optional()
    .isFloat({ min: 0 }).withMessage('unit_cost must be a non-negative number'),
  body('reference')
    .optional()
    .isLength({ max: 255 }).withMessage('reference must not exceed 255 characters'),
  body('notes')
    .optional()
    .isLength({ max: 1000 }).withMessage('notes must not exceed 1000 characters'),
  body('reason')
    .optional()
    .isLength({ max: 500 }).withMessage('Reason must not exceed 500 characters')
];

const listProducts = [
  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('per_page')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('Per page must be between 1 and 100'),
  query('category_id')
    .optional()
    .isInt().withMessage('Category ID must be an integer'),
  query('status')
    .optional()
    .isIn(['active', 'inactive']).withMessage('Invalid status'),
  query('stock_status')
    .optional()
    .isIn(['in_stock', 'low_stock', 'out_of_stock']).withMessage('Invalid stock status'),
  query('min_price')
    .optional()
    .isFloat({ min: 0 }).withMessage('Min price must be a non-negative number'),
  query('max_price')
    .optional()
    .isFloat({ min: 0 }).withMessage('Max price must be a non-negative number'),
  query('sort_by')
    .optional()
    .isIn(['name', 'price', 'stock', 'created_at']).withMessage('Invalid sort field'),
  query('sort_order')
    .optional()
    .isIn(['asc', 'desc']).withMessage('Invalid sort order')
];

const addVariation = [
  param('id').isInt().withMessage('Invalid product ID'),
  body('name')
    .notEmpty().withMessage('Variation name is required')
    .isLength({ min: 1, max: 255 }).withMessage('Variation name must be 1-255 characters'),
  body('price')
    .notEmpty().withMessage('Variation price is required')
    .isFloat({ min: 0 }).withMessage('Variation price must be a non-negative number'),
  body('sku')
    .optional({ nullable: true })
    .isLength({ max: 100 }).withMessage('SKU must not exceed 100 characters'),
  body('barcode')
    .optional({ nullable: true })
    .isLength({ max: 100 }).withMessage('Barcode must not exceed 100 characters'),
  body('cost_price')
    .optional()
    .isFloat({ min: 0 }).withMessage('Cost price must be a non-negative number'),
  body('stock_quantity')
    .optional()
    .isInt({ min: 0 }).withMessage('Stock quantity must be a non-negative integer'),
  body('image')
    .optional({ nullable: true })
    .isString().withMessage('Image must be a string'),
  body('is_active')
    .optional()
    .isBoolean().withMessage('is_active must be a boolean'),
  body('display_order')
    .optional()
    .isInt({ min: 0 }).withMessage('display_order must be a non-negative integer')
];

const updateVariation = [
  param('id').isInt().withMessage('Invalid product ID'),
  param('variationId').isInt().withMessage('Invalid variation ID'),
  body('name')
    .optional()
    .isLength({ min: 1, max: 255 }).withMessage('Variation name must be 1-255 characters'),
  body('price')
    .optional()
    .isFloat({ min: 0 }).withMessage('Variation price must be a non-negative number'),
  body('sku')
    .optional({ nullable: true })
    .isLength({ max: 100 }).withMessage('SKU must not exceed 100 characters'),
  body('barcode')
    .optional({ nullable: true })
    .isLength({ max: 100 }).withMessage('Barcode must not exceed 100 characters'),
  body('cost_price')
    .optional()
    .isFloat({ min: 0 }).withMessage('Cost price must be a non-negative number'),
  body('stock_quantity')
    .optional()
    .isInt({ min: 0 }).withMessage('Stock quantity must be a non-negative integer'),
  body('image')
    .optional({ nullable: true })
    .isString().withMessage('Image must be a string'),
  body('is_active')
    .optional()
    .isBoolean().withMessage('is_active must be a boolean'),
  body('display_order')
    .optional()
    .isInt({ min: 0 }).withMessage('display_order must be a non-negative integer')
];

const deleteVariation = [
  param('id').isInt().withMessage('Invalid product ID'),
  param('variationId').isInt().withMessage('Invalid variation ID')
];

module.exports = {
  createProduct,
  updateProduct,
  updateStock,
  addVariation,
  updateVariation,
  deleteVariation,
  listProducts,
  getProducts: listProducts,
  getProductsForPOS: listProducts,
  getProductById: [param('id').isInt().withMessage('Invalid product ID')],
  getProductByBarcode: [param('barcode').notEmpty().withMessage('Barcode is required')],
  deleteProduct: [param('id').isInt().withMessage('Invalid product ID')]
};
