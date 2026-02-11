const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller.new');
const { authenticate, requirePermission } = require('../middlewares/auth.new');
const validate = require('../middlewares/validate');
const userValidation = require('../validations/user.validation');

// All routes require authentication
router.use(authenticate);

/**
 * @route GET /api/v1/users
 * @desc List users
 * @access Private - Admin, Manager
 */
router.get(
  '/',
  requirePermission('users.view'),
  validate(userValidation.getUsers),
  userController.getUsers
);

/**
 * @route POST /api/v1/users
 * @desc Create user
 * @access Private - Admin
 */
router.post(
  '/',
  requirePermission('users.create'),
  validate(userValidation.createUser),
  userController.createUser
);

/**
 * @route GET /api/v1/users/:id
 * @desc Get user by ID
 * @access Private - Admin, Manager
 */
router.get(
  '/:id',
  requirePermission('users.view'),
  validate(userValidation.getUserById),
  userController.getUserById
);

/**
 * @route PUT /api/v1/users/:id
 * @desc Update user
 * @access Private - Admin
 */
router.put(
  '/:id',
  requirePermission('users.update'),
  validate(userValidation.updateUser),
  userController.updateUser
);

/**
 * @route DELETE /api/v1/users/:id
 * @desc Delete user
 * @access Private - Admin
 */
router.delete(
  '/:id',
  requirePermission('users.delete'),
  validate(userValidation.deleteUser),
  userController.deleteUser
);

/**
 * @route POST /api/v1/users/:id/reset-password
 * @desc Reset user password
 * @access Private - Admin
 */
router.post(
  '/:id/reset-password',
  requirePermission('users.update'),
  validate(userValidation.resetPassword),
  userController.resetPassword
);

module.exports = router;
