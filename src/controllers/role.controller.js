/**
 * Role Controller
 * Handles role management HTTP requests
 */

const roleService = require('../services/role.service');

class RoleController {
  /**
   * Get all roles
   * GET /roles
   */
  async getRoles(req, res, next) {
    try {
      const { page, per_page, include_permissions } = req.query;
      const data = await roleService.getRoles(req.tokenData.companyId, {
        page: parseInt(page) || 1,
        perPage: parseInt(per_page) || 20,
        includePermissions: include_permissions === 'true'
      });

      res.json({
        success: true,
        data
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get single role
   * GET /roles/:id
   */
  async getRole(req, res, next) {
    try {
      const data = await roleService.getRoleById(req.tokenData.companyId, req.params.id);

      res.json({
        success: true,
        data
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create role
   * POST /roles
   */
  async createRole(req, res, next) {
    try {
      const data = await roleService.createRole(req.tokenData.companyId, req.body);

      res.status(201).json({
        success: true,
        message: 'Role created successfully',
        data
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update role
   * PUT /roles/:id
   */
  async updateRole(req, res, next) {
    try {
      const data = await roleService.updateRole(req.tokenData.companyId, req.params.id, req.body);

      res.json({
        success: true,
        message: 'Role updated successfully',
        data
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete role
   * DELETE /roles/:id
   */
  async deleteRole(req, res, next) {
    try {
      await roleService.deleteRole(req.tokenData.companyId, req.params.id);

      res.json({
        success: true,
        message: 'Role deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update role permissions
   * PUT /roles/:id/permissions
   */
  async updatePermissions(req, res, next) {
    try {
      const { permissions } = req.body;
      const data = await roleService.updateRolePermissions(
        req.tokenData.companyId,
        req.params.id,
        permissions
      );

      res.json({
        success: true,
        message: 'Permissions updated successfully',
        data
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Clone role
   * POST /roles/:id/clone
   */
  async cloneRole(req, res, next) {
    try {
      const data = await roleService.cloneRole(
        req.tokenData.companyId,
        req.params.id,
        req.body
      );

      res.status(201).json({
        success: true,
        message: 'Role cloned successfully',
        data
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new RoleController();
