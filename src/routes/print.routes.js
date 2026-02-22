/**
 * Print Routes
 * Handles printing action endpoints: KOT, invoice, test, cash drawer, settings
 */

const express = require('express');
const router = express.Router();
const printController = require('../controllers/print.controller');
const { authenticate, requireBranch } = require('../middlewares/auth');

// All routes require authentication
router.use(authenticate);
router.use(requireBranch);

/**
 * @route POST /api/v1/print/kot
 * @desc Print Kitchen Order Ticket
 * @access Private
 */
router.post('/kot', printController.printKOT);

/**
 * @route POST /api/v1/print/invoice
 * @desc Print invoice
 * @access Private
 */
router.post('/invoice', printController.printInvoice);

/**
 * @route POST /api/v1/print/test
 * @desc Test print
 * @access Private
 */
router.post('/test', printController.testPrint);

/**
 * @route POST /api/v1/print/drawer
 * @desc Open cash drawer
 * @access Private
 */
router.post('/drawer', printController.openDrawer);

/**
 * @route GET /api/v1/print/settings
 * @desc Get print settings
 * @access Private
 */
router.get('/settings', printController.getSettings);

/**
 * @route PUT /api/v1/print/settings
 * @desc Update print settings
 * @access Private
 */
router.put('/settings', printController.updateSettings);

module.exports = router;
