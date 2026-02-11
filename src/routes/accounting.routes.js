const express = require('express');
const router = express.Router();
const accountingController = require('../controllers/accounting.controller');
const { authenticate, hasPermission, requireBranch } = require('../middlewares/auth');

// All routes require authentication and branch
router.use(authenticate);
router.use(requireBranch);

// ==================== CHART OF ACCOUNTS ====================

// Get accounts list (paginated)
router.get('/accounts', hasPermission('accounting', 'view'), accountingController.getAccounts);

// Get account tree (hierarchy)
router.get('/accounts/tree', hasPermission('accounting', 'view'), accountingController.getAccountTree);

// Get next account number for auto-numbering
router.get('/accounts/next-number', hasPermission('accounting', 'view'), accountingController.getNextAccountNumber);

// Check if account code is unique
router.get('/accounts/check-unique', hasPermission('accounting', 'view'), accountingController.checkCodeUnique);

// Initialize default chart of accounts
router.post('/accounts/initialize', hasPermission('accounting', 'create'), accountingController.initializeChartOfAccounts);

// Get single account
router.get('/accounts/:id', hasPermission('accounting', 'view'), accountingController.getAccountById);

// Create account
router.post('/accounts', hasPermission('accounting', 'create'), accountingController.createAccount);

// Update account
router.put('/accounts/:id', hasPermission('accounting', 'update'), accountingController.updateAccount);

// Delete account
router.delete('/accounts/:id', hasPermission('accounting', 'delete'), accountingController.deleteAccount);

// ==================== JOURNAL ENTRIES ====================

// Get journal entries list
router.get('/journal-entries', hasPermission('accounting', 'view'), accountingController.getJournalEntries);

// Get single journal entry
router.get('/journal-entries/:id', hasPermission('accounting', 'view'), accountingController.getJournalEntryById);

// Create journal entry
router.post('/journal-entries', hasPermission('accounting', 'create'), accountingController.createJournalEntry);

// Void journal entry
router.post('/journal-entries/:id/void', hasPermission('accounting', 'update'), accountingController.voidJournalEntry);

// ==================== INVOICES ====================

// Get invoices list
router.get('/invoices', hasPermission('accounting', 'view'), accountingController.getInvoices);

// Get single invoice
router.get('/invoices/:id', hasPermission('accounting', 'view'), accountingController.getInvoiceById);

// Generate invoice from order
router.post('/invoices/from-order', hasPermission('accounting', 'create'), accountingController.generateInvoiceFromOrder);

// Update invoice status
router.patch('/invoices/:id/status', hasPermission('accounting', 'update'), accountingController.updateInvoiceStatus);

// Record payment
router.post('/invoices/:id/payment', hasPermission('accounting', 'update'), accountingController.recordPayment);

// ==================== TRANSACTIONS ====================

// Get transactions list
router.get('/transactions', hasPermission('accounting', 'view'), accountingController.getTransactions);

// ==================== REPORTS ====================

// Trial Balance
router.get('/reports/trial-balance', hasPermission('accounting', 'view'), accountingController.getTrialBalance);

// Profit & Loss
router.get('/reports/profit-loss', hasPermission('accounting', 'view'), accountingController.getProfitLoss);

// Balance Sheet
router.get('/reports/balance-sheet', hasPermission('accounting', 'view'), accountingController.getBalanceSheet);

// Cash Flow
router.get('/reports/cash-flow', hasPermission('accounting', 'view'), accountingController.getCashFlow);

module.exports = router;
