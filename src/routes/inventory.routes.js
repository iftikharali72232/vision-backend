const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/inventory.controller');
const { authenticate, authorize } = require('../middlewares/auth');

// All routes require authentication
router.use(authenticate);

// Get stock levels
router.get('/stock', inventoryController.getStockLevels);

// Adjust stock for a product (manager+)
router.post('/stock/:productId/adjust', authorize('manager', 'admin'), inventoryController.adjustStock);

// Bulk adjust stock (manager+)
router.post('/stock/bulk-adjust', authorize('manager', 'admin'), inventoryController.bulkAdjustStock);

// Transfer stock between branches (manager+)
router.post('/transfer', authorize('manager', 'admin'), inventoryController.transferStock);

// Get inventory movements
router.get('/movements', inventoryController.getMovements);

// Get movement by ID
router.get('/movements/:id', inventoryController.getMovementById);

// Get movement summary
router.get('/movements/summary', inventoryController.getMovementSummary);

// Get stock alerts
router.get('/alerts', inventoryController.getStockAlerts);

// Dismiss alert
router.patch('/alerts/:id/dismiss', inventoryController.dismissAlert);

// Start stock take (manager+)
router.post('/stock-take/start', authorize('manager', 'admin'), inventoryController.startStockTake);

// Submit stock take (manager+)
router.post('/stock-take/submit', authorize('manager', 'admin'), inventoryController.submitStockTake);

// Get valuation report
router.get('/valuation', inventoryController.getValuationReport);

module.exports = router;
