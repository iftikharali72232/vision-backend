/**
 * Branch Controller
 * Handles all branch-related HTTP requests for multi-tenant system
 */

const branchService = require('../services/branch.service');

class BranchController {
  /**
   * Get all branches
   * GET /branches
   */
  async getBranches(req, res, next) {
    try {
      const data = await branchService.getBranches(req.query);

      res.json({
        success: true,
        data: data.items,
        pagination: data.pagination
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get branch by ID
   * GET /branches/:id
   */
  async getBranchById(req, res, next) {
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
   * Create new branch
   * POST /branches
   */
  async createBranch(req, res, next) {
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
  async updateBranch(req, res, next) {
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
  async deleteBranch(req, res, next) {
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

  /**
   * Get branch statistics
   * GET /branches/:id/stats
   */
  async getBranchStats(req, res, next) {
    try {
      const data = await branchService.getBranchStats(req.params.id);

      res.json({
        success: true,
        data
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Add user to branch
   * POST /branches/:id/users
   */
  async addUserToBranch(req, res, next) {
    try {
      const data = await branchService.addUserToBranch(
        req.user.companyId,
        req.params.id,
        req.body
      );

      res.status(201).json({
        success: true,
        message: 'User added to branch successfully',
        data
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Remove user from branch
   * DELETE /branches/:id/users/:userId
   */
  async removeUserFromBranch(req, res, next) {
    try {
      await branchService.removeUserFromBranch(
        req.params.id,
        req.params.userId
      );

      res.json({
        success: true,
        message: 'User removed from branch successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update user's role in branch
   * PUT /branches/:id/users/:userId/role
   */
  async updateBranchUserRole(req, res, next) {
    try {
      const data = await branchService.updateBranchUserRole(
        req.user.companyId,
        req.params.id,
        req.params.userId,
        req.body.roleId
      );

      res.json({
        success: true,
        message: 'User role updated successfully',
        data
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new BranchController();
