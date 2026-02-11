const express = require('express');
const router = express.Router();
const tableController = require('../controllers/table.controller');
const { authenticate, authorize } = require('../middlewares/auth');

// All routes require authentication
router.use(authenticate);

// ==================== HALLS ====================

// Get all halls
router.get('/halls', tableController.getHalls);

// Get single hall
router.get('/halls/:id', tableController.getHallById);

// Create hall (manager+)
router.post('/halls', authorize('manager', 'admin'), tableController.createHall);

// Update hall (manager+)
router.put('/halls/:id', authorize('manager', 'admin'), tableController.updateHall);

// Delete hall (admin only)
router.delete('/halls/:id', authorize('admin'), tableController.deleteHall);

// Reorder halls (manager+)
router.put('/halls/reorder', authorize('manager', 'admin'), tableController.reorderHalls);

// ==================== TABLES ====================

// Get all tables
router.get('/', tableController.getTables);

// Get tables for POS view
router.get('/pos', tableController.getTablesForPOS);

// Get table statistics
router.get('/stats', tableController.getTableStats);

// Get table statistics with consistency check
router.get('/stats/consistency', tableController.getTableStatsWithConsistency);

// Fix table status inconsistencies (authenticated users)
router.post('/fix-inconsistencies', tableController.fixTableStatusInconsistencies);

// Get single table
router.get('/:id', tableController.getTableById);

// Create table (manager+)
router.post('/', authorize('manager', 'admin'), tableController.createTable);

// Update table (manager+)
router.put('/:id', authorize('manager', 'admin'), tableController.updateTable);

// Update table status (cashier+)
router.patch('/:id/status', tableController.updateTableStatus);

// Delete table (admin only)
router.delete('/:id', authorize('admin'), tableController.deleteTable);

// Update table positions (manager+)
router.put('/positions', authorize('manager', 'admin'), tableController.updateTablePositions);

// Merge tables (cashier+)
router.post('/merge', tableController.mergeTables);

// Free tables (cashier+)
router.post('/free', tableController.freeTables);

// Get table with current order
router.get('/:id/current-order', tableController.getTableById);

module.exports = router;
