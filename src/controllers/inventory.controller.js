const inventoryService = require('../services/inventory.service');

/**
 * Resolve the correct userId for inventory movements.
 * InventoryMovement.userId references User.id (system users table) in schema.prisma.
 * req.user.id is the system user ID, always available after authentication.
 */
function resolveUserId(req) {
  return req.user?.id;
}

class InventoryController {
  async getStockLevels(req, res, next) {
    try {
      const branchId = req.branchId || req.user?.branchId;
      const result = await inventoryService.getStockLevels(req.query, branchId);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async adjustStock(req, res, next) {
    try {
      const branchId = req.branchId || req.user?.branchId;
      const userId = resolveUserId(req);
      const result = await inventoryService.adjustStock(req.params.productId, req.body, userId, branchId);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async bulkAdjustStock(req, res, next) {
    try {
      const branchId = req.branchId || req.user?.branchId;
      const userId = resolveUserId(req);
      const result = await inventoryService.bulkAdjustStock(req.body.adjustments, userId, branchId);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async transferStock(req, res, next) {
    try {
      const branchId = req.branchId || req.user?.branchId;
      const userId = resolveUserId(req);
      const result = await inventoryService.transferStock(req.body, userId, branchId);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async getMovements(req, res, next) {
    try {
      const branchId = req.branchId || req.user?.branchId;
      const result = await inventoryService.getMovements(req.query, branchId);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async getMovementById(req, res, next) {
    try {
      const branchId = req.branchId || req.user?.branchId;
      const result = await inventoryService.getMovementById(req.params.id, branchId);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async getStockAlerts(req, res, next) {
    try {
      const branchId = req.branchId || req.user?.branchId;
      const result = await inventoryService.getStockAlerts(req.query, branchId);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async dismissAlert(req, res, next) {
    try {
      const branchId = req.branchId || req.user?.branchId;
      const result = await inventoryService.dismissAlert(req.params.id, branchId);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async startStockTake(req, res, next) {
    try {
      const branchId = req.branchId || req.user?.branchId;
      const userId = resolveUserId(req);
      const result = await inventoryService.startStockTake(req.body || {}, userId, branchId);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async submitStockTake(req, res, next) {
    try {
      const branchId = req.branchId || req.user?.branchId;
      const userId = resolveUserId(req);
      const result = await inventoryService.submitStockTake(req.body, userId, branchId);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async getValuationReport(req, res, next) {
    try {
      const branchId = req.branchId || req.user?.branchId;
      const result = await inventoryService.getValuationReport(branchId);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async getMovementSummary(req, res, next) {
    try {
      const branchId = req.branchId || req.user?.branchId;
      const result = await inventoryService.getMovementSummary(req.query, branchId);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async exportStock(req, res, next) {
    try {
      const branchId = req.branchId || req.user?.branchId;
      const csv = await inventoryService.exportStockCSV(req.query, branchId);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=inventory-${new Date().toISOString().split('T')[0]}.csv`);
      res.send(csv);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new InventoryController();
