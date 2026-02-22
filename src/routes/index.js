const express = require('express');
const router = express.Router();

// Import route modules
const authRoutes = require('./auth.routes');
const userRoutes = require('./user.routes');
const branchRoutes = require('./branch.routes');
const categoryRoutes = require('./category.routes');
const productRoutes = require('./product.routes');
const customerRoutes = require('./customer.routes');
const orderRoutes = require('./order.routes');
const dashboardRoutes = require('./dashboard.routes');
const reportRoutes = require('./report.routes');
const settingRoutes = require('./setting.routes');
const tableRoutes = require('./table.routes');
const menuRoutes = require('./menu.routes');
const inventoryRoutes = require('./inventory.routes');
const notificationRoutes = require('./notification.routes');
const accountingRoutes = require('./accounting.routes');
const heldOrdersRoutes = require('./held-orders.routes');
const translationRoutes = require('./translation.routes');
const uploadRoutes = require('./upload.routes');

// New system routes
const roleRoutes = require('./role.routes');
const systemMenuRoutes = require('./systemMenu.routes');
const printerRoutes = require('./printer.routes');
const printRoutes = require('./print.routes');

// Import controllers for aliases
const accountingController = require('../controllers/accounting.controller');
const tableController = require('../controllers/table.controller');
const { authenticate, hasPermission, requireBranch, requireMaster } = require('../middlewares/auth');

// Mount routes
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/branches', branchRoutes);
router.use('/categories', categoryRoutes);
router.use('/products', productRoutes);
router.use('/customers', customerRoutes);
router.use('/orders', orderRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/reports', reportRoutes);
router.use('/settings', settingRoutes);
router.use('/tables', tableRoutes);
router.use('/menus', menuRoutes);
router.use('/inventory', inventoryRoutes);
router.use('/notifications', notificationRoutes);
router.use('/accounting', accountingRoutes);
router.use('/held-orders', heldOrdersRoutes);
router.use('/translations', translationRoutes);
router.use('/uploads', uploadRoutes);

// System management routes
router.use('/roles', roleRoutes);
router.use('/system-menus', systemMenuRoutes);
router.use('/printers', printerRoutes);
router.use('/print', printRoutes);

// Alias route for product-categories
router.use('/product-categories', categoryRoutes);

// Alias routes for halls
router.get('/halls', authenticate, requireBranch, tableController.getHalls);
router.get('/halls/:id', authenticate, requireBranch, tableController.getHallById);
router.post('/halls', authenticate, requireBranch, hasPermission('tables', 'create'), tableController.createHall);
router.put('/halls/:id', authenticate, requireBranch, hasPermission('tables', 'update'), tableController.updateHall);
router.delete('/halls/:id', authenticate, requireBranch, hasPermission('tables', 'delete'), tableController.deleteHall);
router.put('/halls/reorder', authenticate, requireBranch, hasPermission('tables', 'update'), tableController.reorderHalls);

// Alias routes for accounting (shorter URLs)
router.get('/accounts', authenticate, requireBranch, hasPermission('accounting', 'view'), accountingController.getAccounts);
router.get('/accounts/tree', authenticate, requireBranch, hasPermission('accounting', 'view'), accountingController.getAccountTree);
router.post('/accounts', authenticate, requireBranch, hasPermission('accounting', 'create'), accountingController.createAccount);

// Additional accounting aliases
router.get('/invoices', authenticate, requireBranch, hasPermission('accounting', 'view'), accountingController.getInvoices);
router.get('/journal-entries', authenticate, requireBranch, hasPermission('accounting', 'view'), accountingController.getJournalEntries);
router.get('/reports/profit-loss', authenticate, requireBranch, hasPermission('accounting', 'view'), accountingController.getProfitLoss);

// API info endpoint
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'POS Backend API v1',
    version: '1.0.0',
    endpoints: {
      auth: '/api/v1/auth',
      users: '/api/v1/users',
      branches: '/api/v1/branches',
      categories: '/api/v1/categories',
      products: '/api/v1/products',
      customers: '/api/v1/customers',
      orders: '/api/v1/orders',
      dashboard: '/api/v1/dashboard',
      reports: '/api/v1/reports',
      settings: '/api/v1/settings',
      tables: '/api/v1/tables',
      menus: '/api/v1/menus',
      inventory: '/api/v1/inventory',
      notifications: '/api/v1/notifications',
      accounting: '/api/v1/accounting',
      translations: '/api/v1/translations',
      heldOrders: '/api/v1/held-orders',
      roles: '/api/v1/roles',
      systemMenus: '/api/v1/system-menus',
      print: '/api/v1/print',
      printers: '/api/v1/printers'
    }
  });
});

module.exports = router;
