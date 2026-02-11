const menuService = require('../services/menu.service');

class MenuController {
  async getMenus(req, res, next) {
    try {
      const branchId = req.user?.branchId || req.branchId;
      const result = await menuService.getMenus(req.query, branchId);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async getActiveMenu(req, res, next) {
    try {
      const branchId = req.user?.branchId || req.branchId;
      const result = await menuService.getActiveMenu(branchId);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async getAllProductsAsMenu(req, res, next) {
    try {
      const branchId = req.user?.branchId || req.branchId;
      const result = await menuService.getAllProductsAsMenu(branchId);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async getMenuById(req, res, next) {
    try {
      const branchId = req.user?.branchId || req.branchId;
      const result = await menuService.getMenuById(req.params.id, branchId);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async createMenu(req, res, next) {
    try {
      const branchId = req.user?.branchId || req.branchId;
      const result = await menuService.createMenu(req.body, branchId);
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async updateMenu(req, res, next) {
    try {
      const branchId = req.user?.branchId || req.branchId;
      const result = await menuService.updateMenu(req.params.id, req.body, branchId);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async deleteMenu(req, res, next) {
    try {
      const branchId = req.user?.branchId || req.branchId;
      const result = await menuService.deleteMenu(req.params.id, branchId);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async addProducts(req, res, next) {
    try {
      const branchId = req.user?.branchId || req.branchId;
      const result = await menuService.addProducts(req.params.id, req.body.products, branchId);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async removeProduct(req, res, next) {
    try {
      const branchId = req.user?.branchId || req.branchId;
      const result = await menuService.removeProduct(req.params.id, req.params.productId, branchId);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async updateMenuProduct(req, res, next) {
    try {
      const branchId = req.user?.branchId || req.branchId;
      const result = await menuService.updateMenuProduct(req.params.id, req.params.productId, req.body, branchId);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async reorderProducts(req, res, next) {
    try {
      const branchId = req.user?.branchId || req.branchId;
      const result = await menuService.reorderProducts(req.params.id, req.body.products, branchId);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async cloneMenu(req, res, next) {
    try {
      const branchId = req.user?.branchId || req.branchId;
      const result = await menuService.cloneMenu(req.params.id, req.body.name, branchId);
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new MenuController();
