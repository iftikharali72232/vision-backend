/**
 * System Menu Controller
 * Handles system menu management HTTP requests
 */

const systemMenuService = require('../services/systemMenu.service');

class SystemMenuController {
  /**
   * Get all menus (admin)
   * GET /system/menus
   */
  async getAllMenus(req, res, next) {
    try {
      const { include_inactive, type } = req.query;
      const data = await systemMenuService.getAllMenus({
        includeInactive: include_inactive === 'true',
        type
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
   * Get user accessible menus
   * GET /menus
   */
  async getUserMenus(req, res, next) {
    try {
      const permissions = req.user?.permissions || [];
      const data = await systemMenuService.getUserAccessibleMenus(permissions);

      res.json({
        success: true,
        data
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get modules
   * GET /menus/modules
   */
  async getModules(req, res, next) {
    try {
      const data = await systemMenuService.getModules();

      res.json({
        success: true,
        data
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get menus for permission assignment
   * GET /menus/permissions
   */
  async getMenusForPermissions(req, res, next) {
    try {
      const data = await systemMenuService.getMenusForPermissions();

      res.json({
        success: true,
        data
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get single menu
   * GET /system/menus/:id
   */
  async getMenu(req, res, next) {
    try {
      const data = await systemMenuService.getMenuById(req.params.id);

      res.json({
        success: true,
        data
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create menu (admin)
   * POST /system/menus
   */
  async createMenu(req, res, next) {
    try {
      const data = await systemMenuService.createMenu(req.body);

      res.status(201).json({
        success: true,
        message: 'Menu created successfully',
        data
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update menu (admin)
   * PUT /system/menus/:id
   */
  async updateMenu(req, res, next) {
    try {
      const data = await systemMenuService.updateMenu(req.params.id, req.body);

      res.json({
        success: true,
        message: 'Menu updated successfully',
        data
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete menu (admin)
   * DELETE /system/menus/:id
   */
  async deleteMenu(req, res, next) {
    try {
      await systemMenuService.deleteMenu(req.params.id);

      res.json({
        success: true,
        message: 'Menu deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new SystemMenuController();
