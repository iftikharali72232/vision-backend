const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customer.controller');
const { authenticate, hasPermission, requireBranch } = require('../middlewares/auth');
const validate = require('../middlewares/validate');
const customerValidation = require('../validations/customer.validation');

// All routes require authentication
router.use(authenticate);

/**
 * @route GET /api/v1/customers
 * @desc List customers
 * @access Private - All roles
 */
router.get(
  '/',
  requireBranch,
  validate(customerValidation.getCustomers),
  customerController.index
);

/**
 * @route GET /api/v1/customers/search
 * @desc Search customers
 * @access Private - All roles
 */
router.get(
  '/search',
  requireBranch,
  validate(customerValidation.searchCustomers),
  customerController.search
);

/**
 * @route POST /api/v1/customers
 * @desc Create customer
 * @access Private - All roles
 */
router.post(
  '/',
  requireBranch,
  validate(customerValidation.createCustomer),
  customerController.store
);

/**
 * @route GET /api/v1/customers/:id
 * @desc Get customer by ID
 * @access Private - All roles
 */
router.get(
  '/:id',
  requireBranch,
  validate(customerValidation.getCustomerById),
  customerController.show
);

/**
 * @route GET /api/v1/customers/:id/orders
 * @desc Get customer orders
 * @access Private - All roles
 */
router.get(
  '/:id/orders',
  requireBranch,
  validate(customerValidation.getCustomerOrders),
  customerController.orders
);

/**
 * @route PUT /api/v1/customers/:id
 * @desc Update customer
 * @access Private - All roles
 */
router.put(
  '/:id',
  requireBranch,
  validate(customerValidation.updateCustomer),
  customerController.update
);

/**
 * @route DELETE /api/v1/customers/:id
 * @desc Delete customer
 * @access Private - Admin, Manager
 */
router.delete(
  '/:id',
  requireBranch,
  hasPermission('customers', 'delete'),
  validate(customerValidation.deleteCustomer),
  customerController.destroy
);

module.exports = router;
