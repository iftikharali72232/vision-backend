/**
 * Role Routes
 * API endpoints for role management
 */

const express = require('express');
const router = express.Router();
const roleController = require('../controllers/role.controller');
const { authenticate, requirePermission, requireMaster } = require('../middlewares/auth');

// All routes require authentication
router.use(authenticate);

/**
 * @route   GET /roles
 * @desc    Get all roles for company
 * @access  Private (requires roles.view permission)
 */
router.get('/', requirePermission('users.roles.view'), roleController.getRoles);

/**
 * @route   GET /roles/:id
 * @desc    Get single role with permissions
 * @access  Private (requires roles.view permission)
 */
router.get('/:id', requirePermission('users.roles.view'), roleController.getRole);

/**
 * @route   POST /roles
 * @desc    Create new role
 * @access  Private (requires roles.create permission)
 */
router.post('/', requirePermission('users.roles.create'), roleController.createRole);

/**
 * @route   PUT /roles/:id
 * @desc    Update role
 * @access  Private (requires roles.update permission)
 */
router.put('/:id', requirePermission('users.roles.update'), roleController.updateRole);

/**
 * @route   DELETE /roles/:id
 * @desc    Delete role
 * @access  Private (requires roles.delete permission)
 */
router.delete('/:id', requirePermission('users.roles.delete'), roleController.deleteRole);

/**
 * @route   PUT /roles/:id/permissions
 * @desc    Update role permissions
 * @access  Private (requires roles.update permission)
 */
router.put('/:id/permissions', requirePermission('users.roles.update'), roleController.updatePermissions);

/**
 * @route   POST /roles/:id/clone
 * @desc    Clone a role
 * @access  Private (requires roles.create permission)
 */
router.post('/:id/clone', requirePermission('users.roles.create'), roleController.cloneRole);

module.exports = router;
