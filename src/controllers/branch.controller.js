const branchService = require('../services/branch.service');

class BranchController {
  /**
   * List branches
   * GET /branches
   */
  async index(req, res, next) {
    try {
      const data = await branchService.getBranches(req.query);

      res.json({
        success: true,
        data
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get branch by ID
   * GET /branches/:id
   */
  async show(req, res, next) {
    try {
      const data = await branchService.getBranchById(req.params.id);

      res.json({
        success: true,
        data
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create branch
   * POST /branches
   */
  async store(req, res, next) {
    try {
      const data = await branchService.createBranch(req.body);

      res.status(201).json({
        success: true,
        message: 'Branch created successfully',
        data
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update branch
   * PUT /branches/:id
   */
  async update(req, res, next) {
    try {
      const data = await branchService.updateBranch(req.params.id, req.body);

      res.json({
        success: true,
        message: 'Branch updated successfully',
        data
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete branch
   * DELETE /branches/:id
   */
  async destroy(req, res, next) {
    try {
      await branchService.deleteBranch(req.params.id);

      res.json({
        success: true,
        message: 'Branch deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new BranchController();
