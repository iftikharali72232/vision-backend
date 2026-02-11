const inventoryService = require('../services/inventory.service');

class InventoryController {
  async getStockLevels(req, res, next) {
    try {
      const branchId = req.user?.branchId || req.branchId;
      const result = await inventoryService.getStockLevels(req.query, branchId);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async adjustStock(req, res, next) {
    try {
      const branchId = req.user?.branchId || req.branchId;
      const userId = req.user?.id || req.userId;
      const result = await inventoryService.adjustStock(req.params.productId, req.body, branchId, userId);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async bulkAdjustStock(req, res, next) {
    try {
      const branchId = req.user?.branchId || req.branchId;
      const userId = req.user?.id || req.userId;
      const result = await inventoryService.bulkAdjustStock(req.body.adjustments, branchId, userId);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async transferStock(req, res, next) {
    try {
      const branchId = req.user?.branchId || req.branchId;
      const userId = req.user?.id || req.userId;
      const result = await inventoryService.transferStock(req.body, branchId, userId);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async getMovements(req, res, next) {
    try {
      const branchId = req.user?.branchId || req.branchId;
      const result = await inventoryService.getMovements(req.query, branchId);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async getMovementById(req, res, next) {
    try {
      const branchId = req.user?.branchId || req.branchId;
      const result = await inventoryService.getMovementById(req.params.id, branchId);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async getStockAlerts(req, res, next) {
    try {
      const branchId = req.user?.branchId || req.branchId;
      const result = await inventoryService.getStockAlerts(req.query, branchId);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async dismissAlert(req, res, next) {
    try {
      const branchId = req.user?.branchId || req.branchId;
      const result = await inventoryService.dismissAlert(req.params.id, branchId);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async startStockTake(req, res, next) {
    try {
      const branchId = req.user?.branchId || req.branchId;
      const result = await inventoryService.startStockTake(branchId);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async submitStockTake(req, res, next) {
    try {
      const branchId = req.user?.branchId || req.branchId;
      const userId = req.user?.id || req.userId;
      const result = await inventoryService.submitStockTake(req.body.counts, branchId, userId);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async getValuationReport(req, res, next) {
    try {
      const branchId = req.user?.branchId || req.branchId;
      const result = await inventoryService.getValuationReport(branchId);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async getMovementSummary(req, res, next) {
    try {
      const branchId = req.user?.branchId || req.branchId;
      const result = await inventoryService.getMovementSummary(req.query, branchId);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new InventoryController();
