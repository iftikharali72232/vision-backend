const express = require('express');
const router = express.Router();
const branchController = require('../controllers/branch.controller.new');
const { authenticate, requireMaster, requirePermission } = require('../middlewares/auth.new');

/**
 * @route GET /api/v1/branches
 * @desc Get all branches
 * @access Private (branches.view permission)
 */
router.get(
  '/',
  authenticate,
  requirePermission('branches.view'),
  branchController.getBranches
);

/**
 * @route GET /api/v1/branches/:id
 * @desc Get branch by ID
 * @access Private (branches.view permission)
 */
router.get(
  '/:id',
  authenticate,
  requirePermission('branches.view'),
  branchController.getBranchById
);

/**
 * @route POST /api/v1/branches
 * @desc Create new branch
 * @access Private (Master only + branches.create permission)
 */
router.post(
  '/',
  authenticate,
  requireMaster,
  requirePermission('branches.create'),
  branchController.createBranch
);

/**
 * @route PUT /api/v1/branches/:id
 * @desc Update branch
 * @access Private (Master only + branches.update permission)
 */
router.put(
  '/:id',
  authenticate,
  requireMaster,
  requirePermission('branches.update'),
  branchController.updateBranch
);

/**
 * @route DELETE /api/v1/branches/:id
 * @desc Delete branch
 * @access Private (Master only + branches.delete permission)
 */
router.delete(
  '/:id',
  authenticate,
  requireMaster,
  requirePermission('branches.delete'),
  branchController.deleteBranch
);

/**
 * @route GET /api/v1/branches/:id/stats
 * @desc Get branch statistics
 * @access Private (branches.view permission)
 */
router.get(
  '/:id/stats',
  authenticate,
  requirePermission('branches.view'),
  branchController.getBranchStats
);

/**
 * @route POST /api/v1/branches/:id/users
 * @desc Add user to branch
 * @access Private (Master only + users.create permission)
 */
router.post(
  '/:id/users',
  authenticate,
  requireMaster,
  requirePermission('users.create'),
  branchController.addUserToBranch
);

/**
 * @route DELETE /api/v1/branches/:id/users/:userId
 * @desc Remove user from branch
 * @access Private (Master only + users.delete permission)
 */
router.delete(
  '/:id/users/:userId',
  authenticate,
  requireMaster,
  requirePermission('users.delete'),
  branchController.removeUserFromBranch
);

/**
 * @route PUT /api/v1/branches/:id/users/:userId/role
 * @desc Update user's role in branch
 * @access Private (Master only + users.update permission)
 */
router.put(
  '/:id/users/:userId/role',
  authenticate,
  requireMaster,
  requirePermission('users.update'),
  branchController.updateBranchUserRole
);

module.exports = router;
