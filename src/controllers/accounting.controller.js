const accountingService = require('../services/accounting.service');

class AccountingController {
  // ==================== CHART OF ACCOUNTS ====================

  async getAccounts(req, res, next) {
    try {
      const branchId = req.branchId;
      const result = await accountingService.getAccounts(req.query, branchId);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async getAccountTree(req, res, next) {
    try {
      const branchId = req.branchId;
      const result = await accountingService.getAccountTree(branchId);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async getAccountById(req, res, next) {
    try {
      const branchId = req.branchId;
      const result = await accountingService.getAccountById(req.params.id, branchId);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async getNextAccountNumber(req, res, next) {
    try {
      const branchId = req.branchId;
      const parentId = req.query.parent_id;
      const result = await accountingService.getNextAccountNumber(branchId, parentId);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async checkCodeUnique(req, res, next) {
    try {
      const branchId = req.branchId;
      const { code, exclude_id } = req.query;
      const result = await accountingService.checkCodeUnique(branchId, code, exclude_id);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async createAccount(req, res, next) {
    try {
      const branchId = req.branchId;
      const result = await accountingService.createAccount(req.body, branchId);
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async updateAccount(req, res, next) {
    try {
      const branchId = req.branchId;
      const result = await accountingService.updateAccount(req.params.id, req.body, branchId);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async deleteAccount(req, res, next) {
    try {
      const branchId = req.branchId;
      const result = await accountingService.deleteAccount(req.params.id, branchId);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async initializeChartOfAccounts(req, res, next) {
    try {
      const branchId = req.branchId;
      const result = await accountingService.initializeChartOfAccounts(branchId);
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  // ==================== JOURNAL ENTRIES ====================

  async getJournalEntries(req, res, next) {
    try {
      const branchId = req.branchId;
      const result = await accountingService.getJournalEntries(req.query, branchId);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async getJournalEntryById(req, res, next) {
    try {
      const branchId = req.branchId;
      const result = await accountingService.getJournalEntryById(req.params.id, branchId);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async createJournalEntry(req, res, next) {
    try {
      const branchId = req.branchId;
      const result = await accountingService.createJournalEntry(req.body, branchId);
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async voidJournalEntry(req, res, next) {
    try {
      const branchId = req.branchId;
      const result = await accountingService.voidJournalEntry(req.params.id, branchId);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  // ==================== INVOICES ====================

  async getInvoices(req, res, next) {
    try {
      const branchId = req.branchId;
      const result = await accountingService.getInvoices(req.query, branchId);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async getInvoiceById(req, res, next) {
    try {
      const branchId = req.branchId;
      const result = await accountingService.getInvoiceById(req.params.id, branchId);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async generateInvoiceFromOrder(req, res, next) {
    try {
      const branchId = req.branchId;
      const { order_id } = req.body;
      const result = await accountingService.generateInvoiceFromOrder(order_id, branchId);
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async updateInvoiceStatus(req, res, next) {
    try {
      const branchId = req.branchId;
      const { status } = req.body;
      const result = await accountingService.updateInvoiceStatus(req.params.id, status, branchId);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async recordPayment(req, res, next) {
    try {
      const branchId = req.branchId;
      const result = await accountingService.recordPayment(req.params.id, req.body, branchId);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  // ==================== TRANSACTIONS ====================

  async getTransactions(req, res, next) {
    try {
      const branchId = req.branchId;
      const result = await accountingService.getTransactions(req.query, branchId);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  // ==================== REPORTS ====================

  async getTrialBalance(req, res, next) {
    try {
      const branchId = req.branchId;
      const result = await accountingService.getTrialBalance(req.query, branchId);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async getProfitLoss(req, res, next) {
    try {
      const branchId = req.branchId;
      const result = await accountingService.getProfitLoss(req.query, branchId);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async getBalanceSheet(req, res, next) {
    try {
      const branchId = req.branchId;
      const result = await accountingService.getBalanceSheet(req.query, branchId);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async getCashFlow(req, res, next) {
    try {
      const branchId = req.branchId;
      const result = await accountingService.getCashFlow(req.query, branchId);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AccountingController();
