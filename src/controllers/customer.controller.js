const customerService = require('../services/customer.service');

class CustomerController {
  /**
   * List customers
   * GET /customers
   */
  async index(req, res, next) {
    try {
      const data = await customerService.getCustomers(req.query, req.branchId);

      res.json({
        success: true,
        data
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Search customers
   * GET /customers/search
   */
  async search(req, res, next) {
    try {
      const { q, limit } = req.query;
      const data = await customerService.searchCustomers(q, req.branchId, parseInt(limit) || 10);

      res.json({
        success: true,
        data
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get customer by ID
   * GET /customers/:id
   */
  async show(req, res, next) {
    try {
      const data = await customerService.getCustomerById(req.params.id, req.branchId);

      res.json({
        success: true,
        data
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get customer orders
   * GET /customers/:id/orders
   */
  async orders(req, res, next) {
    try {
      const data = await customerService.getCustomerOrders(req.params.id, req.query, req.branchId);

      res.json({
        success: true,
        data
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create customer
   * POST /customers
   */
  async store(req, res, next) {
    try {
      const data = await customerService.createCustomer(req.body, req.branchId);

      res.status(201).json({
        success: true,
        message: 'Customer created successfully',
        data
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update customer
   * PUT /customers/:id
   */
  async update(req, res, next) {
    try {
      const data = await customerService.updateCustomer(req.params.id, req.body, req.branchId);

      res.json({
        success: true,
        message: 'Customer updated successfully',
        data
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete customer
   * DELETE /customers/:id
   */
  async destroy(req, res, next) {
    try {
      await customerService.deleteCustomer(req.params.id, req.branchId);

      res.json({
        success: true,
        message: 'Customer deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new CustomerController();
