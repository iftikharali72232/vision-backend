const express = require('express');
const router = express.Router();
const orderController = require('../controllers/order.controller');
const { authenticate, hasPermission, requireBranch } = require('../middlewares/auth');
const validate = require('../middlewares/validate');
const orderValidation = require('../validations/order.validation');

// All routes require authentication
router.use(authenticate);

/**
 * @route GET /api/v1/orders
 * @desc List orders
 * @access Private - All roles with branch
 */
router.get(
  '/',
  requireBranch,
  validate(orderValidation.getOrders),
  orderController.index
);

/**
 * @route GET /api/v1/orders/kitchen
 * @desc Get kitchen orders (KDS)
 * @access Private - Kitchen staff
 */
router.get(
  '/kitchen',
  requireBranch,
  orderController.kitchenOrders
);

/**
 * @route GET /api/v1/orders/held
 * @desc Get held orders
 * @access Private - All roles with branch
 */
router.get(
  '/held',
  requireBranch,
  orderController.heldOrders
);

/**
 * @route GET /api/v1/orders/held/:id
 * @desc Get held order by ID
 * @access Private - All roles with branch
 */
router.get(
  '/held/:id',
  requireBranch,
  validate(orderValidation.getHeldOrderById),
  orderController.heldOrderById
);

/**
 * @route DELETE /api/v1/orders/held/:id
 * @desc Delete held order
 * @access Private - All roles with branch
 */
router.delete(
  '/held/:id',
  requireBranch,
  validate(orderValidation.deleteHeldOrder),
  orderController.deleteHeldOrder
);

/**
 * @route POST /api/v1/orders
 * @desc Create order (initial status: pending)
 * @access Private - All roles with branch
 */
router.post(
  '/',
  requireBranch,
  validate(orderValidation.createOrder),
  orderController.store
);

/**
 * @route POST /api/v1/orders/hold
 * @desc Hold order (save for later)
 * @access Private - All roles with branch
 */
router.post(
  '/hold',
  requireBranch,
  validate(orderValidation.holdOrder),
  orderController.hold
);

/**
 * @route GET /api/v1/orders/hold
 * @desc Get held orders (alias)
 * @access Private - All roles with branch
 */
router.get(
  '/hold',
  requireBranch,
  orderController.heldOrders
);

/**
 * @route POST /api/v1/orders/resume/:id
 * @desc Resume held order (convert to regular order)
 * @access Private - All roles with branch
 */
router.post(
  '/resume/:id',
  requireBranch,
  orderController.resumeHeldOrder
);

/**
 * @route GET /api/v1/orders/:id
 * @desc Get order by ID
 * @access Private - All roles
 */
router.get(
  '/:id',
  requireBranch,
  validate(orderValidation.getOrderById),
  orderController.show
);

/**
 * @route GET /api/v1/orders/invoice/:invoiceNo
 * @desc Get order by invoice number
 * @access Private - All roles
 */
router.get(
  '/invoice/:invoiceNo',
  requireBranch,
  orderController.getByInvoice
);

/**
 * @route GET /api/v1/orders/:id/receipt
 * @desc Get order receipt
 * @access Private - All roles
 */
router.get(
  '/:id/receipt',
  requireBranch,
  validate(orderValidation.getOrderReceipt),
  orderController.receipt
);

/**
 * @route GET /api/v1/orders/:id/transitions
 * @desc Get valid status transitions for order
 * @access Private - All roles with branch
 */
router.get(
  '/:id/transitions',
  requireBranch,
  orderController.getTransitions
);

/**
 * ========================================
 * CRITICAL ENDPOINT: COMPLETE ORDER
 * ========================================
 * @route POST /api/v1/orders/:id/complete
 * @desc Complete order and generate invoice
 * 
 * This is the ONLY way to:
 * - Generate invoice from order
 * - Deduct inventory
 * - Create accounting journal entries
 * - Finalize the sale
 * 
 * Flow:
 * 1. Validate order can be completed
 * 2. Process any additional payment
 * 3. Lock order (status = completed)
 * 4. Generate invoice
 * 5. Deduct inventory
 * 6. Create accounting entries
 * 7. Update order status to invoiced
 * 8. Update customer stats
 * 9. Free table if dine-in
 * 
 * @access Private - Cashier, Manager, Admin
 */
router.post(
  '/:id/complete',
  requireBranch,
  hasPermission('orders', 'create'),
  validate(orderValidation.completeOrder),
  orderController.complete
);

/**
 * @route POST /api/v1/orders/:id/cancel
 * @desc Cancel order
 * @access Private - Admin, Manager
 */
router.post(
  '/:id/cancel',
  requireBranch,
  hasPermission('orders', 'cancel'),
  validate(orderValidation.cancelOrder),
  orderController.cancel
);

/**
 * @route POST /api/v1/orders/:id/refund
 * @desc Refund order (only for completed/invoiced orders)
 * @access Private - Admin, Manager
 */
router.post(
  '/:id/refund',
  requireBranch,
  hasPermission('orders', 'refund'),
  orderController.refund
);

/**
 * @route POST /api/v1/orders/:id/reopen
 * @desc Reopen an order (move back to confirmed)
 * @access Private
 */
router.post(
  '/:id/reopen',
  requireBranch,
  hasPermission('orders', 'update'),
  orderController.reopen
);

/**
 * @route PUT /api/v1/orders/:id/status
 * @desc Update order status (state machine)
 * @access Private - All roles with branch
 */
router.put(
  '/:id/status',
  requireBranch,
  validate(orderValidation.updateOrderStatus),
  orderController.updateStatus
);

/**
 * @route POST /api/v1/orders/:id/payment
 * @desc Add payment to order
 * @access Private - Cashier, Manager, Admin
 */
router.post(
  '/:id/payment',
  requireBranch,
  hasPermission('orders', 'create'),
  orderController.addPayment
);

/**
 * @route PUT /api/v1/orders/:id/items/:itemId/status
 * @desc Update order item status (for kitchen)
 * @access Private - Kitchen staff
 */
router.put(
  '/:id/items/:itemId/status',
  requireBranch,
  orderController.updateItemStatus
);

/**
 * @route DELETE /api/v1/orders/hold/:id
 * @desc Delete held order (alias)
 * @access Private - All roles with branch
 */
router.delete(
  '/hold/:id',
  requireBranch,
  validate(orderValidation.deleteHeldOrder),
  orderController.deleteHeldOrder
);

module.exports = router;
