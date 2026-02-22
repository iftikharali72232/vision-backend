const express = require('express');
const router = express.Router();
const branchController = require('../controllers/branch.controller');
const { authenticate, requirePermission } = require('../middlewares/auth');
const validate = require('../middlewares/validate');
const branchValidation = require('../validations/branch.validation');

// All routes require authentication
router.use(authenticate);

/**
 * @route GET /api/branches
 * @desc List branches
 * @access Private
 */
router.get(
  '/',
  validate(branchValidation.listBranches),
  branchController.getBranches
);

/**
 * @route POST /api/branches
 * @desc Create branch
 * @access Private - Admin
 */
router.post(
  '/',
  requirePermission('branches.create'),
  validate(branchValidation.createBranch),
  branchController.createBranch
);

/**
 * @route GET /api/v1/branches/:id
 * @desc Get branch by ID
 * @access Private - Admin, Manager
 */
router.get(
  '/:id',
  requirePermission('branches.view'),
  validate(branchValidation.getBranchById),
  branchController.getBranchById
);

/**
 * @route PUT /api/v1/branches/:id
 * @desc Update branch
 * @access Private - Admin
 */
router.put(
  '/:id',
  requirePermission('branches.update'),
  validate(branchValidation.updateBranch),
  branchController.updateBranch
);

/**
 * @route DELETE /api/v1/branches/:id
 * @desc Delete branch
 * @access Private - Admin
 */
router.delete(
  '/:id',
  requirePermission('branches.delete'),
  validate(branchValidation.deleteBranch),
  branchController.deleteBranch
);

module.exports = router;
