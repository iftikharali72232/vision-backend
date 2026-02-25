/**
 * Printer Routes
 * Handles printer management endpoints
 */

const express = require('express');
const router = express.Router();
const printerController = require('../controllers/printer.controller');
const { authenticate, requirePermission, requireBranch } = require('../middlewares/auth');

// All routes require authentication and branch selection
router.use(authenticate);
router.use(requireBranch);

/**
 * @route GET /api/v1/printers/discover
 * @desc Discover system printers
 * @access Private
 */
router.get('/discover', printerController.discoverPrinters);

/**
 * @route GET /api/v1/printers
 * @desc Get all printers for branch
 * @access Private
 */
router.get('/', printerController.getPrinters);

/**
 * @route POST /api/v1/printers
 * @desc Create new printer
 * @access Private - Settings permission
 */
router.post(
  '/',
  requirePermission('settings.create'),
  printerController.createPrinter
);

/**
 * @route GET /api/v1/printers/:id
 * @desc Get printer by ID
 * @access Private
 */
router.get('/:id', printerController.getPrinterById);

/**
 * @route PUT /api/v1/printers/:id
 * @desc Update printer
 * @access Private - Settings permission
 */
router.put(
  '/:id',
  requirePermission('settings.update'),
  printerController.updatePrinter
);

/**
 * @route DELETE /api/v1/printers/:id
 * @desc Delete printer
 * @access Private - Settings permission
 */
router.delete(
  '/:id',
  requirePermission('settings.delete'),
  printerController.deletePrinter
);

/**
 * @route POST /api/v1/printers/:id/test
 * @desc Test printer connection
 * @access Private
 */
router.post('/:id/test', printerController.testPrinter);

/**
 * @route POST /api/v1/printers/:id/print-test
 * @desc Print test page
 * @access Private
 */
router.post('/:id/print-test', printerController.printTestPage);

module.exports = router;
