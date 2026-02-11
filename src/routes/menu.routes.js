const express = require('express');
const router = express.Router();
const menuController = require('../controllers/menu.controller');
const { authenticate, authorize } = require('../middlewares/auth');

// All routes require authentication
router.use(authenticate);

// Get all menus
router.get('/', menuController.getMenus);

// Get active menu (for POS)
router.get('/active', menuController.getActiveMenu);

// Get all products as menu (fallback)
router.get('/products', menuController.getAllProductsAsMenu);

// Get single menu
router.get('/:id', menuController.getMenuById);

// Create menu (manager+)
router.post('/', authorize('manager', 'admin'), menuController.createMenu);

// Update menu (manager+)
router.put('/:id', authorize('manager', 'admin'), menuController.updateMenu);

// Delete menu (admin only)
router.delete('/:id', authorize('admin'), menuController.deleteMenu);

// Add products to menu (manager+)
router.post('/:id/products', authorize('manager', 'admin'), menuController.addProducts);

// Remove product from menu (manager+)
router.delete('/:id/products/:productId', authorize('manager', 'admin'), menuController.removeProduct);

// Update menu product (manager+)
router.put('/:id/products/:productId', authorize('manager', 'admin'), menuController.updateMenuProduct);

// Reorder products in menu (manager+)
router.put('/:id/products/reorder', authorize('manager', 'admin'), menuController.reorderProducts);

// Clone menu (manager+)
router.post('/:id/clone', authorize('manager', 'admin'), menuController.cloneMenu);

module.exports = router;
