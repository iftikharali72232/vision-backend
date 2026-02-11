const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/category.controller');
const { authenticate, hasPermission, requireBranch } = require('../middlewares/auth');
const validate = require('../middlewares/validate');
const categoryValidation = require('../validations/category.validation');

// All routes require authentication and branch
router.use(authenticate);
router.use(requireBranch);

/**
 * @route GET /api/v1/categories
 * @desc List categories
 * @access Private - All roles
 */
router.get(
  '/',
  validate(categoryValidation.getCategories),
  categoryController.index
);

/**
 * @route POST /api/v1/categories
 * @desc Create category
 * @access Private - Admin, Manager
 */
router.post(
  '/',
  hasPermission('categories', 'create'),
  validate(categoryValidation.createCategory),
  categoryController.store
);

/**
 * @route GET /api/v1/categories/:id
 * @desc Get category by ID
 * @access Private - All roles
 */
router.get(
  '/:id',
  validate(categoryValidation.getCategoryById),
  categoryController.show
);

/**
 * @route PUT /api/v1/categories/:id
 * @desc Update category
 * @access Private - Admin, Manager
 */
router.put(
  '/:id',
  hasPermission('categories', 'update'),
  validate(categoryValidation.updateCategory),
  categoryController.update
);

/**
 * @route DELETE /api/v1/categories/:id
 * @desc Delete category
 * @access Private - Admin, Manager
 */
router.delete(
  '/:id',
  hasPermission('categories', 'delete'),
  validate(categoryValidation.deleteCategoryById),
  categoryController.destroy
);

module.exports = router;
