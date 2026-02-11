const { body, param, query } = require('express-validator');

const createOrder = [
  body('customer_id')
    .optional({ nullable: true })
    .isInt().withMessage('Customer ID must be an integer'),
  body('table_id')
    .optional({ nullable: true })
    .isInt().withMessage('Table ID must be an integer'),
  body('table')
    .optional({ nullable: true })
    .custom((value) => {
      // Accept both object with id property or just the ID number
      if (typeof value === 'number' || typeof value === 'string') {
        return true; // Accept numeric ID
      }
      if (typeof value === 'object' && value !== null && value.id) {
        return true; // Accept object with id
      }
      throw new Error('Table must be an object or a number (ID)');
    }),
  body('order_type')
    .optional()
    .isIn(['dine_in', 'take_away', 'delivery', 'self_pickup', 'dinein', 'takeaway', 'selfpickup'])
    .withMessage('Invalid order type'),
  body('items')
    .notEmpty().withMessage('Items are required')
    .isArray({ min: 1 }).withMessage('At least one item is required'),
  body('items.*.product_id')
    .notEmpty().withMessage('Product ID is required')
    .isInt().withMessage('Product ID must be an integer'),
  body('items.*.quantity')
    .notEmpty().withMessage('Quantity is required')
    .isFloat({ min: 0.01 }).withMessage('Quantity must be greater than 0'),
  body('items.*.unit_price')
    .optional({ nullable: true })
    .isFloat({ min: 0 }).withMessage('Unit price must be a non-negative number'),
  body('items.*.price')
    .optional({ nullable: true })
    .isFloat({ min: 0 }).withMessage('Price must be a non-negative number'),
  body('items.*.discount_type')
    .optional({ nullable: true })
    .isIn(['percentage', 'fixed', null]).withMessage('Invalid discount type'),
  body('items.*.discount_value')
    .optional()
    .isFloat({ min: 0 }).withMessage('Discount value must be a non-negative number'),
  body('discount')
    .optional({ nullable: true })
    .isObject().withMessage('Discount must be an object'),
  body('discount.type')
    .optional()
    .isIn(['percentage', 'fixed']).withMessage('Invalid discount type'),
  body('discount.value')
    .optional()
    .isFloat({ min: 0 }).withMessage('Discount value must be a non-negative number'),
  body('tax_rate')
    .optional()
    .isFloat({ min: 0, max: 100 }).withMessage('Tax rate must be between 0 and 100'),
  body('payment')
    .optional()
    .isObject().withMessage('Payment must be an object'),
  body('payment.method')
    .optional()
    .isIn(['cash', 'card', 'split', 'bank_transfer', 'digital_wallet']).withMessage('Invalid payment method'),
  body('payment.amount')
    .optional()
    .isFloat({ min: 0.01 }).withMessage('Payment amount must be greater than 0'),
  body('payment.cash_amount')
    .optional()
    .isFloat({ min: 0 }).withMessage('Cash amount must be a non-negative number'),
  body('payment.card_amount')
    .optional()
    .isFloat({ min: 0 }).withMessage('Card amount must be a non-negative number'),
  body('payment.reference')
    .optional()
    .isLength({ max: 100 }).withMessage('Payment reference must not exceed 100 characters'),
  body('payments')
    .optional()
    .isArray().withMessage('Payments must be an array'),
  body('payments.*.method')
    .optional()
    .isIn(['cash', 'card', 'split', 'bank_transfer', 'digital_wallet']).withMessage('Invalid payment method'),
  body('payments.*.amount')
    .optional()
    .isFloat({ min: 0.01 }).withMessage('Payment amount must be greater than 0'),
  body('payments.*.reference')
    .optional()
    .isLength({ max: 100 }).withMessage('Payment reference must not exceed 100 characters'),
  body('notes')
    .optional()
    .isLength({ max: 1000 }).withMessage('Notes must not exceed 1000 characters')
];

const cancelOrder = [
  param('id')
    .isInt().withMessage('Invalid order ID'),
  body('reason')
    .optional()
    .isLength({ max: 500 }).withMessage('Reason must not exceed 500 characters')
];

const refundOrder = [
  param('id')
    .isInt().withMessage('Invalid order ID'),
  body('reason')
    .notEmpty().withMessage('Refund reason is required')
    .isLength({ max: 500 }).withMessage('Reason must not exceed 500 characters'),
  body('refund_items')
    .optional()
    .isArray().withMessage('Refund items must be an array'),
  body('refund_items.*.order_item_id')
    .optional()
    .isInt().withMessage('Order item ID must be an integer'),
  body('refund_items.*.quantity')
    .optional()
    .isFloat({ min: 0.01 }).withMessage('Quantity must be greater than 0'),
  body('refund_method')
    .optional()
    .isIn(['cash', 'card']).withMessage('Invalid refund method')
];

const listOrders = [
  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('per_page')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('Per page must be between 1 and 100'),
  query('status')
    .optional()
    .isIn(['pending', 'completed', 'cancelled', 'refunded']).withMessage('Invalid status'),
  query('payment_method')
    .optional()
    .isIn(['cash', 'card', 'split']).withMessage('Invalid payment method'),
  query('customer_id')
    .optional()
    .isInt().withMessage('Customer ID must be an integer'),
  query('user_id')
    .optional()
    .isInt().withMessage('User ID must be an integer'),
  query('date_from')
    .optional()
    .isISO8601().withMessage('Invalid date format (use YYYY-MM-DD)'),
  query('date_to')
    .optional()
    .isISO8601().withMessage('Invalid date format (use YYYY-MM-DD)'),
  query('sort_by')
    .optional()
    .isIn(['created_at', 'total']).withMessage('Invalid sort field'),
  query('sort_order')
    .optional()
    .isIn(['asc', 'desc']).withMessage('Invalid sort order')
];

const updateOrderStatus = [
  param('id').isInt().withMessage('Invalid order ID'),
  body('status')
    .notEmpty().withMessage('Status is required')
    .isIn(['pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled']).withMessage('Invalid status')
];

const holdOrder = [
  body('customer_id')
    .optional({ nullable: true })
    .isInt().withMessage('Customer ID must be an integer'),
  body('customer')
    .optional({ nullable: true })
    .isObject().withMessage('Customer must be an object'),
  body('customer.id')
    .optional()
    .isInt().withMessage('Customer ID must be an integer'),
  body('table_id')
    .optional({ nullable: true })
    .isInt().withMessage('Table ID must be an integer'),
  body('table')
    .optional({ nullable: true })
    .custom((value) => {
      // Accept both object with id property or just the ID number
      if (typeof value === 'number' || typeof value === 'string') {
        return true; // Accept numeric ID
      }
      if (typeof value === 'object' && value !== null && value.id) {
        return true; // Accept object with id
      }
      throw new Error('Table must be an object or a number (ID)');
    }),
  body('order_type')
    .optional()
    .isIn(['dine_in', 'take_away', 'delivery', 'self_pickup', 'dinein', 'takeaway', 'selfpickup'])
    .withMessage('Invalid order type'),
  body('items')
    .notEmpty().withMessage('Items are required')
    .isArray({ min: 1 }).withMessage('At least one item is required'),
  body('items.*.product_id')
    .notEmpty().withMessage('Product ID is required')
    .isInt().withMessage('Product ID must be an integer'),
  body('items.*.quantity')
    .notEmpty().withMessage('Quantity is required')
    .isFloat({ min: 0.01 }).withMessage('Quantity must be greater than 0'),
  body('items.*.unit_price')
    .optional({ nullable: true })
    .isFloat({ min: 0 }).withMessage('Unit price must be a non-negative number'),
  body('items.*.price')
    .optional({ nullable: true })
    .isFloat({ min: 0 }).withMessage('Price must be a non-negative number'),
  body('discount')
    .optional({ nullable: true })
    .isObject().withMessage('Discount must be an object'),
  body('tax_rate')
    .optional()
    .isFloat({ min: 0, max: 100 }).withMessage('Tax rate must be between 0 and 100'),
  body('tax_amount')
    .optional()
    .isFloat({ min: 0 }).withMessage('Tax amount must be non-negative'),
  body('total_tax')
    .optional()
    .isFloat({ min: 0 }).withMessage('Total tax must be non-negative'),
  body('notes')
    .optional()
    .isLength({ max: 1000 }).withMessage('Notes must not exceed 1000 characters')
];

const completeOrder = [
  body('payments')
    .optional()
    .isArray().withMessage('Payments must be an array'),
  body('payments.*.method')
    .optional()
    .isIn(['cash', 'card', 'split', 'bank_transfer', 'digital_wallet']).withMessage('Invalid payment method'),
  body('payments.*.amount')
    .optional()
    .isFloat({ min: 0.01 }).withMessage('Payment amount must be greater than 0'),
  body('payments.*.reference')
    .optional()
    .isLength({ max: 100 }).withMessage('Payment reference must not exceed 100 characters')
];

module.exports = {
  createOrder,
  cancelOrder,
  refundOrder,
  listOrders,
  getOrders: listOrders,
  holdOrder,
  completeOrder,
  updateOrderStatus,
  getHeldOrderById: [param('id').isInt().withMessage('Invalid held order ID')],
  deleteHeldOrder: [param('id').isInt().withMessage('Invalid held order ID')],
  getOrderById: [param('id').isInt().withMessage('Invalid order ID')],
  getOrderReceipt: [param('id').isInt().withMessage('Invalid order ID')]
};
