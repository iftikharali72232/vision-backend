/**
 * User Controller
 * Handles all user-related HTTP requests for multi-tenant system
 */

const userService = require('../services/user.service');

class UserController {
  /**
   * Get all users
   * GET /users
   */
  async getUsers(req, res, next) {
    try {
      const data = await userService.getUsers(
        req.user.companyId,
        req.tenantDb,
        req.query
      );

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
   * Get user by ID
   * GET /users/:id
   */
  async getUserById(req, res, next) {
    try {
      const data = await userService.getUserById(
        req.user.companyId,
        req.tenantDb,
        req.params.id
      );

      res.json({
        success: true,
        data
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create new user
   * POST /users
   */
  async createUser(req, res, next) {
    try {
      const data = await userService.createUser(
        req.user.companyId,
        req.tenantDb,
        req.body
      );

      res.status(201).json({
        success: true,
        message: 'User created successfully',
        data
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update user
   * PUT /users/:id
   */
  async updateUser(req, res, next) {
    try {
      const data = await userService.updateUser(
        req.user.companyId,
        req.tenantDb,
        req.params.id,
        req.body
      );

      res.json({
        success: true,
        message: 'User updated successfully',
        data
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete user
   * DELETE /users/:id
   */
  async deleteUser(req, res, next) {
    try {
      await userService.deleteUser(
        req.user.companyId,
        req.tenantDb,
        req.params.id
      );

      res.json({
        success: true,
        message: 'User deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Reset user password
   * POST /users/:id/reset-password
   */
  async resetPassword(req, res, next) {
    try {
      await userService.resetPassword(
        req.user.companyId,
        req.params.id,
        req.body.newPassword
      );

      res.json({
        success: true,
        message: 'Password reset successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Toggle user status
   * POST /users/:id/toggle-status
   */
  async toggleUserStatus(req, res, next) {
    try {
      const data = await userService.toggleUserStatus(
        req.user.companyId,
        req.params.id
      );

      res.json({
        success: true,
        message: `User ${data.status === 'ACTIVE' ? 'activated' : 'deactivated'} successfully`,
        data
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get user permissions
   * GET /users/:id/permissions
   */
  async getUserPermissions(req, res, next) {
    try {
      const data = await userService.getUserPermissions(
        req.user.companyId,
        req.tenantDb,
        req.params.id
      );

      res.json({
        success: true,
        data
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new UserController();
