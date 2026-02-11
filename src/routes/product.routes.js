const express = require('express');
const router = express.Router();
const productController = require('../controllers/product.controller');
const categoryController = require('../controllers/category.controller');
const { authenticate, hasPermission, requireBranch, optionalBranch } = require('../middlewares/auth');
const validate = require('../middlewares/validate');
const productValidation = require('../validations/product.validation');

// All routes require authentication
router.use(authenticate);

/**
 * @route GET /api/v1/products
 * @desc List products
 * @access Private - All roles
 */
router.get(
  '/',
  requireBranch,
  validate(productValidation.getProducts),
  productController.index
);

/**
 * @route GET /api/v1/products/pos
 * @desc Get products for POS
 * @access Private - All roles with branch
 */
router.get(
  '/pos',
  requireBranch,
  validate(productValidation.getProductsForPOS),
  productController.pos
);

/**
 * @route GET /api/v1/products/low-stock
 * @desc Get low stock products
 * @access Private - Admin, Manager
 */
router.get(
  '/low-stock',
  hasPermission('inventory', 'read'),
  requireBranch,
  productController.lowStock
);

/**
 * @route GET /api/v1/products/barcode/:barcode
 * @desc Get product by barcode
 * @access Private - All roles with branch
 */
router.get(
  '/barcode/:barcode',
  requireBranch,
  validate(productValidation.getProductByBarcode),
  productController.byBarcode
);

/**
 * @route POST /api/v1/products
 * @desc Create product
 * @access Private - Admin, Manager
 */
router.post(
  '/',
  hasPermission('products', 'create'),
  validate(productValidation.createProduct),
  productController.store
);

/**
 * @route GET /api/v1/products/:id
 * @desc Get product by ID
 * @access Private - All roles
 */
router.get(
  '/:id',
  validate(productValidation.getProductById),
  productController.show
);

/**
 * @route PUT /api/v1/products/:id
 * @desc Update product
 * @access Private - Admin, Manager
 */
router.put(
  '/:id',
  hasPermission('products', 'update'),
  validate(productValidation.updateProduct),
  productController.update
);

/**
 * @route DELETE /api/v1/products/:id
 * @desc Delete product
 * @access Private - Admin, Manager
 */
router.delete(
  '/:id',
  hasPermission('products', 'delete'),
  validate(productValidation.deleteProduct),
  productController.destroy
);

/**
 * @route PUT /api/v1/products/:id/stock
 * @desc Update product stock
 * @access Private - Admin, Manager
 */
router.put(
  '/:id/stock',
  hasPermission('inventory', 'update'),
  requireBranch,
  validate(productValidation.updateStock),
  productController.updateStock
);

/**
 * @route GET /api/v1/products/categories
 * @desc List categories (alias for /categories)
 * @access Private - All roles
 */
router.get(
  '/categories',
  categoryController.index
);

module.exports = router;
