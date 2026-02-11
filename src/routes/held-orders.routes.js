const express = require('express');
const router = express.Router();
const orderController = require('../controllers/order.controller');
const { authenticate, requireBranch, requireBranchFromHeldOrder } = require('../middlewares/auth');
const validate = require('../middlewares/validate');
const orderValidation = require('../validations/order.validation');

// All routes require authentication
router.use(authenticate);

/**
 * @route GET /api/v1/held-orders
 * @desc Get held orders
 * @access Private - All roles with branch
 */
router.get(
  '/',
  requireBranch,
  orderController.heldOrders
);

/**
 * @route GET /api/v1/held-orders/:id
 * @desc Get held order by ID
 * @access Private - All roles with branch
 */
router.get(
  '/:id',
  requireBranch,
  validate(orderValidation.getHeldOrderById),
  orderController.heldOrderById
);

/**
 * @route POST /api/v1/held-orders
 * @desc Create held order
 * @access Private - All roles with branch
 */
router.post(
  '/',
  requireBranch,
  validate(orderValidation.holdOrder),
  orderController.hold
);

/**
 * @route DELETE /api/v1/held-orders/:id
 * @desc Delete held order
 * @access Private - All roles with branch
 */
router.delete(
  '/:id',
  requireBranch,
  validate(orderValidation.deleteHeldOrder),
  orderController.deleteHeldOrder
);

/**
 * @route POST /api/v1/held-orders/:id/resume
 * @desc Resume held order (convert to regular order)
 * @access Private - All roles with branch
 * @note Branch ID can be from X-Branch-Id header or extracted from held order
 */
router.post(
  '/:id/resume',
  requireBranchFromHeldOrder,
  orderController.resumeHeldOrder
);

module.exports = router;