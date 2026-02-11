const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller.new');
const { authenticate, requireMaster, requirePermission } = require('../middlewares/auth.new');

/**
 * @route GET /api/v1/users
 * @desc Get all users
 * @access Private (users.view permission)
 */
router.get(
  '/',
  authenticate,
  requirePermission('users.view'),
  userController.getUsers
);

/**
 * @route GET /api/v1/users/:id
 * @desc Get user by ID
 * @access Private (users.view permission)
 */
router.get(
  '/:id',
  authenticate,
  requirePermission('users.view'),
  userController.getUserById
);

/**
 * @route POST /api/v1/users
 * @desc Create new user
 * @access Private (Master only + users.create permission)
 */
router.post(
  '/',
  authenticate,
  requireMaster,
  requirePermission('users.create'),
  userController.createUser
);

/**
 * @route PUT /api/v1/users/:id
 * @desc Update user
 * @access Private (Master only + users.update permission)
 */
router.put(
  '/:id',
  authenticate,
  requireMaster,
  requirePermission('users.update'),
  userController.updateUser
);

/**
 * @route DELETE /api/v1/users/:id
 * @desc Delete user
 * @access Private (Master only + users.delete permission)
 */
router.delete(
  '/:id',
  authenticate,
  requireMaster,
  requirePermission('users.delete'),
  userController.deleteUser
);

/**
 * @route POST /api/v1/users/:id/reset-password
 * @desc Reset user password
 * @access Private (Master only + users.update permission)
 */
router.post(
  '/:id/reset-password',
  authenticate,
  requireMaster,
  requirePermission('users.update'),
  userController.resetPassword
);

/**
 * @route POST /api/v1/users/:id/toggle-status
 * @desc Toggle user status (activate/deactivate)
 * @access Private (Master only + users.update permission)
 */
router.post(
  '/:id/toggle-status',
  authenticate,
  requireMaster,
  requirePermission('users.update'),
  userController.toggleUserStatus
);

/**
 * @route GET /api/v1/users/:id/permissions
 * @desc Get user permissions
 * @access Private (users.view permission)
 */
router.get(
  '/:id/permissions',
  authenticate,
  requirePermission('users.view'),
  userController.getUserPermissions
);

module.exports = router;
