/**
 * System Menu Routes
 * API endpoints for system menu management
 */

const express = require('express');
const router = express.Router();
const systemMenuController = require('../controllers/systemMenu.controller');
const { authenticate, requireMaster } = require('../middlewares/auth');

// All routes require authentication
router.use(authenticate);

/**
 * @route   GET /menus
 * @desc    Get user accessible menus based on permissions
 * @access  Private
 */
router.get('/', systemMenuController.getUserMenus);

/**
 * @route   GET /menus/modules
 * @desc    Get all modules with their menus
 * @access  Private
 */
router.get('/modules', systemMenuController.getModules);

/**
 * @route   GET /menus/permissions
 * @desc    Get flat menu list for permission assignment
 * @access  Private (master only)
 */
router.get('/permissions', requireMaster, systemMenuController.getMenusForPermissions);

/**
 * System Admin Routes (for managing menus)
 * These routes are typically used by super admins only
 */

/**
 * @route   GET /menus/all
 * @desc    Get all menus including inactive (admin)
 * @access  Private (master only)
 */
router.get('/all', requireMaster, systemMenuController.getAllMenus);

/**
 * @route   GET /menus/:id
 * @desc    Get single menu by ID
 * @access  Private (master only)
 */
router.get('/:id', requireMaster, systemMenuController.getMenu);

/**
 * @route   POST /menus
 * @desc    Create new menu
 * @access  Private (super admin only - typically disabled)
 */
router.post('/', requireMaster, systemMenuController.createMenu);

/**
 * @route   PUT /menus/:id
 * @desc    Update menu
 * @access  Private (super admin only - typically disabled)
 */
router.put('/:id', requireMaster, systemMenuController.updateMenu);

/**
 * @route   DELETE /menus/:id
 * @desc    Delete menu
 * @access  Private (super admin only - typically disabled)
 */
router.delete('/:id', requireMaster, systemMenuController.deleteMenu);

module.exports = router;
