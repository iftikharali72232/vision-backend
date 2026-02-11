const tableService = require('../services/table.service');

class TableController {
  // ==================== HALLS ====================

  async getHalls(req, res, next) {
    try {
      const branchId = req.branchId;
      const result = await tableService.getHalls(req.query, branchId);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async getHallById(req, res, next) {
    try {
      const branchId = req.branchId;
      const result = await tableService.getHallById(req.params.id, branchId);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async createHall(req, res, next) {
    try {
      const branchId = req.branchId;
      const result = await tableService.createHall(req.body, branchId);
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async updateHall(req, res, next) {
    try {
      const branchId = req.branchId;
      const result = await tableService.updateHall(req.params.id, req.body, branchId);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async deleteHall(req, res, next) {
    try {
      const branchId = req.branchId;
      const result = await tableService.deleteHall(req.params.id, branchId);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async reorderHalls(req, res, next) {
    try {
      const branchId = req.branchId;
      const result = await tableService.reorderHalls(req.body.halls, branchId);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  // ==================== TABLES ====================

  async getTables(req, res, next) {
    try {
      const branchId = req.branchId;
      const result = await tableService.getTables(req.query, branchId, req.tenantPrisma);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async getTablesForPOS(req, res, next) {
    try {
      const branchId = req.branchId;
      const result = await tableService.getTablesForPOS(req.query, branchId);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async getTableById(req, res, next) {
    try {
      const branchId = req.branchId;
      const result = await tableService.getTableById(req.params.id, branchId);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async createTable(req, res, next) {
    try {
      const branchId = req.branchId;
      const result = await tableService.createTable(req.body, branchId);
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async updateTable(req, res, next) {
    try {
      const branchId = req.branchId;
      const result = await tableService.updateTable(req.params.id, req.body, branchId);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async updateTableStatus(req, res, next) {
    try {
      const branchId = req.branchId;
      const result = await tableService.updateTableStatus(req.params.id, req.body.status, branchId);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async deleteTable(req, res, next) {
    try {
      const branchId = req.branchId;
      const result = await tableService.deleteTable(req.params.id, branchId);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async updateTablePositions(req, res, next) {
    try {
      const branchId = req.branchId;
      const result = await tableService.updateTablePositions(req.body.tables, branchId);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async mergeTables(req, res, next) {
    try {
      const branchId = req.branchId;
      const result = await tableService.mergeTables(req.body.table_ids, branchId);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async freeTables(req, res, next) {
    try {
      const branchId = req.branchId;
      const result = await tableService.freeTables(req.body.table_ids, branchId);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async getTableStats(req, res, next) {
    try {
      const branchId = req.branchId;
      const result = await tableService.getTableStats(branchId);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async fixTableStatusInconsistencies(req, res, next) {
    try {
      const branchId = req.branchId;
      const result = await tableService.fixTableStatusInconsistencies(branchId, req.tenantPrisma);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async getTableStatsWithConsistency(req, res, next) {
    try {
      const branchId = req.branchId;
      const result = await tableService.getTableStatsWithConsistency(branchId, req.tenantPrisma);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new TableController();
