const express = require('express');
const router = express.Router();
const tableController = require('../controllers/table.controller');
const { authenticate, authorize, requireBranch } = require('../middlewares/auth');

// All routes require authentication
router.use(authenticate);

// ==================== HALLS ====================

// Get all halls
router.get('/halls', requireBranch, tableController.getHalls);

// Get single hall
router.get('/halls/:id', requireBranch, tableController.getHallById);

// Create hall (manager+)
router.post('/halls', requireBranch, authorize('manager', 'admin'), tableController.createHall);

// Update hall (manager+)
router.put('/halls/:id', requireBranch, authorize('manager', 'admin'), tableController.updateHall);

// Delete hall (admin only)
router.delete('/halls/:id', requireBranch, authorize('admin'), tableController.deleteHall);

// Reorder halls (manager+)
router.put('/halls/reorder', requireBranch, authorize('manager', 'admin'), tableController.reorderHalls);

// ==================== TABLES ====================

// Get all tables
router.get('/', requireBranch, tableController.getTables);

// Get tables for POS view
router.get('/pos', requireBranch, tableController.getTablesForPOS);

// Get table statistics
router.get('/stats', requireBranch, tableController.getTableStats);

// Get table statistics with consistency check
router.get('/stats/consistency', requireBranch, tableController.getTableStatsWithConsistency);

// Fix table status inconsistencies (authenticated users)
router.post('/fix-inconsistencies', requireBranch, tableController.fixTableStatusInconsistencies);

// Get single table
router.get('/:id', requireBranch, tableController.getTableById);

// Create table (manager+)
router.post('/', requireBranch, authorize('manager', 'admin'), tableController.createTable);

// Update table (manager+)
router.put('/:id', requireBranch, authorize('manager', 'admin'), tableController.updateTable);

// Update table status (cashier+)
router.patch('/:id/status', requireBranch, tableController.updateTableStatus);

// Delete table (admin only)
router.delete('/:id', requireBranch, authorize('admin'), tableController.deleteTable);

// Update table positions (manager+)
router.put('/positions', requireBranch, authorize('manager', 'admin'), tableController.updateTablePositions);

// Merge tables (cashier+)
router.post('/merge', requireBranch, tableController.mergeTables);

// Free tables (cashier+)
router.post('/free', requireBranch, tableController.freeTables);

// Get table with current order
router.get('/:id/current-order', requireBranch, tableController.getTableById);

module.exports = router;
