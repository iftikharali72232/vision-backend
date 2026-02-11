const orderService = require('../services/order.service');

class OrderController {
  /**
   * List orders
   * GET /orders
   */
  async index(req, res, next) {
    try {
      const data = await orderService.getOrders(req.query, req.branchId);

      res.json({
        success: true,
        data
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get held orders
   * GET /orders/held
   */
  async heldOrders(req, res, next) {
    try {
      const data = await orderService.getHeldOrders(req.query, req.branchId);

      res.json({
        success: true,
        data: {
          items: data
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get held order by ID
   * GET /orders/held/:id
   */
  async heldOrderById(req, res, next) {
    try {
      const data = await orderService.getHeldOrderById(req.params.id, req.branchId);

      res.json({
        success: true,
        data
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete held order
   * DELETE /orders/held/:id
   */
  async deleteHeldOrder(req, res, next) {
    try {
      await orderService.deleteHeldOrder(req.params.id, req.branchId);

      res.json({
        success: true,
        message: 'Held order deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get order by ID
   * GET /orders/:id
   */
  async show(req, res, next) {
    try {
      const data = await orderService.getOrderById(req.params.id, req.branchId);

      res.json({
        success: true,
        data
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get order by invoice number
   * GET /orders/invoice/:invoiceNo
   */
  async getByInvoice(req, res, next) {
    try {
      const data = await orderService.getOrderByInvoiceNumber(req.params.invoiceNo, req.branchId);

      res.json({
        success: true,
        data
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get order receipt
   * GET /orders/:id/receipt
   */
  async receipt(req, res, next) {
    try {
      const data = await orderService.getOrderReceipt(req.params.id);

      res.json({
        success: true,
        data
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create order
   * POST /orders
   */
  async store(req, res, next) {
    try {
      const data = await orderService.createOrder(req.body, req.user.id, req.branchId);

      res.status(201).json({
        success: true,
        message: 'Order created successfully',
        data
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Hold order
   * POST /orders/hold
   */
  async hold(req, res, next) {
    try {
      const data = await orderService.holdOrder(req.body, req.user.id, req.branchId);

      res.status(201).json({
        success: true,
        message: 'Order held successfully',
        data
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * COMPLETE ORDER - Critical endpoint
   * POST /orders/:id/complete
   * 
   * This is the ONLY way to:
   * 1. Generate invoice
   * 2. Deduct inventory
   * 3. Create accounting entries
   * 4. Finalize the sale
   */
  async complete(req, res, next) {
    try {
      const data = await orderService.completeOrder(
        req.params.id, 
        req.user.id, 
        req.branchId,
        req.body
      );

      res.json({
        success: true,
        message: 'Order completed and invoice generated',
        data
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Cancel order
   * POST /orders/:id/cancel
   */
  async cancel(req, res, next) {
    try {
      const { reason } = req.body;
      const data = await orderService.cancelOrder(req.params.id, req.user.id, reason, req.branchId);

      res.json({
        success: true,
        message: 'Order cancelled successfully',
        data
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Refund order
   * POST /orders/:id/refund
   */
  async refund(req, res, next) {
    try {
      const data = await orderService.refundOrder(req.params.id, req.user.id, req.body, req.branchId);

      res.json({
        success: true,
        message: 'Order refunded successfully',
        data
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Reopen order
   * POST /orders/:id/reopen
   */
  async reopen(req, res, next) {
    try {
      const data = await orderService.reopenOrder(req.params.id, req.user.id, req.branchId);

      res.json({
        success: true,
        message: 'Order reopened successfully',
        data
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Resume held order
   * POST /orders/resume/:id or POST /held-orders/:id/resume
   */
  async resumeHeldOrder(req, res, next) {
    try {
      const data = await orderService.resumeHeldOrder(req.params.id, req.user.id, req.branchId);

      res.json({
        success: true,
        message: 'Order resumed successfully',
        data
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update order status
   * PUT /orders/:id/status
   */
  async updateStatus(req, res, next) {
    try {
      const data = await orderService.updateOrderStatus(
        req.params.id, 
        req.body.status, 
        req.user.id, 
        req.branchId
      );

      res.json({
        success: true,
        message: 'Order status updated successfully',
        data
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Add payment to order
   * POST /orders/:id/payment
   */
  async addPayment(req, res, next) {
    try {
      const data = await orderService.addPayment(req.params.id, req.body, req.branchId);

      res.json({
        success: true,
        message: 'Payment added successfully',
        data
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update order item status (for kitchen)
   * PUT /orders/:id/items/:itemId/status
   */
  async updateItemStatus(req, res, next) {
    try {
      const data = await orderService.updateItemStatus(
        req.params.id,
        req.params.itemId,
        req.body.status,
        req.branchId
      );

      res.json({
        success: true,
        message: 'Item status updated successfully',
        data
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get kitchen orders
   * GET /orders/kitchen
   */
  async kitchenOrders(req, res, next) {
    try {
      const data = await orderService.getKitchenOrders(req.branchId);

      res.json({
        success: true,
        data
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get valid status transitions
   * GET /orders/:id/transitions
   */
  async getTransitions(req, res, next) {
    try {
      const order = await orderService.getOrderById(req.params.id, req.branchId);
      const validTransitions = orderService.getValidTransitions(order.status);

      res.json({
        success: true,
        data: {
          current_status: order.status,
          valid_transitions: validTransitions
        }
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new OrderController();
