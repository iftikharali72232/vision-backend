const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/inventory.controller');
const { authenticate, hasPermission, requireBranch } = require('../middlewares/auth');

// All routes require authentication + branch context
router.use(authenticate);
router.use(requireBranch);

// Get stock levels
router.get('/stock', inventoryController.getStockLevels);

// Adjust stock for a product
router.post('/stock/:productId/adjust', hasPermission('products', 'update'), inventoryController.adjustStock);

// Bulk adjust stock
router.post('/stock/bulk-adjust', hasPermission('products', 'update'), inventoryController.bulkAdjustStock);

// Transfer stock between branches
router.post('/transfer', hasPermission('products', 'update'), inventoryController.transferStock);

// Get inventory movements
router.get('/movements', inventoryController.getMovements);

// Get movement summary (before :id to avoid matching 'summary' as id)
router.get('/movements/summary', inventoryController.getMovementSummary);

// Get movement by ID
router.get('/movements/:id', inventoryController.getMovementById);

// Get stock alerts
router.get('/alerts', inventoryController.getStockAlerts);

// Dismiss alert
router.patch('/alerts/:id/dismiss', inventoryController.dismissAlert);

// Export stock as CSV
router.get('/export', inventoryController.exportStock);

// Start stock take
router.post('/stock-take/start', hasPermission('products', 'update'), inventoryController.startStockTake);

// Submit stock take
router.post('/stock-take/submit', hasPermission('products', 'update'), inventoryController.submitStockTake);

// Get valuation report
router.get('/valuation', inventoryController.getValuationReport);

module.exports = router;
