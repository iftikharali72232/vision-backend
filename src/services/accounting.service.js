const { getCurrentPrisma } = require('../middlewares/requestContext');
const prisma = new Proxy({}, { get: (_, prop) => getCurrentPrisma()[prop] });
const { pagination: paginationConfig, defaultChartOfAccounts } = require('../config/constants');
const { NotFoundError, BadRequestError, AppError } = require('../middlewares/errorHandler');

class AccountingService {
  // ==================== CHART OF ACCOUNTS ====================

  /**
   * Get all accounts (paginated list)
   */
  async getAccounts(query, branchId) {
    const {
      page = paginationConfig.defaultPage,
      per_page = paginationConfig.defaultPerPage,
      type,
      is_active,
      search,
      parent_id
    } = query;

    const skip = (page - 1) * per_page;
    const take = Math.min(parseInt(per_page), paginationConfig.maxPerPage);

    const where = { branchId };

    if (type) where.type = type;
    if (is_active !== undefined) where.isActive = is_active === 'true' || is_active === true;
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { code: { contains: search } }
      ];
    }
    if (parent_id === 'null' || parent_id === null) {
      where.parentId = null;
    } else if (parent_id) {
      where.parentId = parseInt(parent_id);
    }

    const [accounts, total] = await Promise.all([
      prisma.account.findMany({
        where,
        skip,
        take,
        include: {
          parent: { select: { id: true, name: true, code: true } },
          children: { select: { id: true, name: true, code: true } },
          _count: { select: { journalLines: true } }
        },
        orderBy: { code: 'asc' }
      }),
      prisma.account.count({ where })
    ]);

    const items = accounts.map(a => ({
      id: a.id,
      code: a.code,
      name: a.name,
      name_ar: a.nameAr || null,
      type: a.type,
      level: a.level,
      balance: Number(a.balance),
      is_system: a.isSystem,
      is_active: a.isActive,
      description: a.description,
      parent_id: a.parentId || null,
      has_transactions: a._count.journalLines > 0,
      parent: a.parent ? {
        id: a.parent.id,
        name: a.parent.name,
        code: a.parent.code
      } : null,
      children_count: a.children.length,
      created_at: a.createdAt
    }));

    return {
      items,
      pagination: {
        current_page: parseInt(page),
        per_page: take,
        total_pages: Math.ceil(total / take),
        total_items: total
      }
    };
  }

  /**
   * Get account tree structure (6-level hierarchy)
   */
  async getAccountTree(branchId) {
    const accounts = await prisma.account.findMany({
      where: { branchId },
      include: {
        _count: { select: { journalLines: true } }
      },
      orderBy: { code: 'asc' }
    });

    // Build tree structure
    const accountMap = new Map();
    const rootAccounts = [];

    // First pass: create map
    accounts.forEach(a => {
      accountMap.set(a.id, {
        id: a.id,
        code: a.code,
        name: a.name,
        type: a.type,
        level: a.level,
        balance: Number(a.balance),
        is_system: a.isSystem,
        is_active: a.isActive,
        has_transactions: a._count.journalLines > 0,
        children: []
      });
    });

    // Second pass: build hierarchy
    accounts.forEach(a => {
      const node = accountMap.get(a.id);
      if (a.parentId) {
        const parent = accountMap.get(a.parentId);
        if (parent) {
          parent.children.push(node);
        }
      } else {
        rootAccounts.push(node);
      }
    });

    return rootAccounts;
  }

  /**
   * Get single account by ID
   */
  async getAccountById(id, branchId) {
    const account = await prisma.account.findFirst({
      where: { id: parseInt(id), branchId },
      include: {
        parent: { select: { id: true, name: true, code: true } },
        children: {
          select: { id: true, name: true, code: true, balance: true },
          orderBy: { code: 'asc' }
        },
        _count: { select: { journalLines: true } }
      }
    });

    if (!account) throw new NotFoundError('Account');

    return {
      id: account.id,
      code: account.code,
      name: account.name,
      type: account.type,
      level: account.level,
      balance: Number(account.balance),
      description: account.description,
      is_system: account.isSystem,
      is_active: account.isActive,
      has_transactions: account._count.journalLines > 0,
      parent: account.parent,
      children: account.children.map(c => ({
        ...c,
        balance: Number(c.balance)
      })),
      created_at: account.createdAt,
      updated_at: account.updatedAt
    };
  }

  /**
   * Get next available account number for a parent
   */
  async getNextAccountNumber(branchId, parentId) {
    if (!parentId) {
      // For root accounts, find next available single digit
      const lastRoot = await prisma.account.findFirst({
        where: { branchId, parentId: null },
        orderBy: { code: 'desc' }
      });
      const nextCode = lastRoot ? String(parseInt(lastRoot.code) + 1) : '1';
      return { next_code: nextCode, parent_code: null };
    }

    const parent = await prisma.account.findFirst({
      where: { id: parseInt(parentId), branchId }
    });

    if (!parent) throw new NotFoundError('Parent account');

    // Find last child
    const lastChild = await prisma.account.findFirst({
      where: { branchId, parentId: parseInt(parentId) },
      orderBy: { code: 'desc' }
    });

    let nextCode;
    if (lastChild) {
      // Extract the child portion and increment
      const childPart = lastChild.code.substring(parent.code.length);
      const nextChildNum = parseInt(childPart) + 1;
      nextCode = parent.code + nextChildNum.toString().padStart(2, '0');
    } else {
      // First child
      nextCode = parent.code + '01';
    }

    return {
      next_code: nextCode,
      parent_code: parent.code,
      parent_name: parent.name
    };
  }

  /**
   * Check if account code is unique
   */
  async checkCodeUnique(branchId, code, excludeId = null) {
    const where = { branchId, code };
    if (excludeId) where.NOT = { id: parseInt(excludeId) };

    const existing = await prisma.account.findFirst({ where });
    return { is_unique: !existing };
  }

  /**
   * Create account
   */
  async createAccount(data, branchId) {
    const { code, name, type, description, parent_id, is_active = true } = data;

    // Check code uniqueness
    const { is_unique } = await this.checkCodeUnique(branchId, code);
    if (!is_unique) {
      throw new BadRequestError('Account code already exists');
    }

    let level = 1;
    let parentType = type;

    // Validate parent if provided
    if (parent_id) {
      const parent = await prisma.account.findFirst({
        where: { id: parseInt(parent_id), branchId }
      });

      if (!parent) throw new NotFoundError('Parent account');
      
      // Ensure code starts with parent code
      if (!code.startsWith(parent.code)) {
        throw new BadRequestError('Account code must start with parent code: ' + parent.code);
      }

      level = parent.level + 1;
      parentType = parent.type;

      // Max 6 levels
      if (level > 6) {
        throw new BadRequestError('Maximum account hierarchy depth is 6 levels');
      }
    }

    // Type must match parent's type
    if (parent_id && type !== parentType) {
      throw new BadRequestError('Account type must match parent account type: ' + parentType);
    }

    const account = await prisma.account.create({
      data: {
        branchId,
        code,
        name,
        type,
        description,
        level,
        parentId: parent_id ? parseInt(parent_id) : null,
        isActive: is_active
      }
    });

    return {
      id: account.id,
      code: account.code,
      name: account.name,
      type: account.type,
      level: account.level,
      balance: 0,
      is_active: account.isActive
    };
  }

  /**
   * Update account
   */
  async updateAccount(id, data, branchId) {
    const account = await prisma.account.findFirst({
      where: { id: parseInt(id), branchId }
    });

    if (!account) throw new NotFoundError('Account');

    // System accounts cannot have code/type changed
    if (account.isSystem && (data.code || data.type)) {
      throw new BadRequestError('Cannot modify code or type of system accounts');
    }

    const { code, name, description, is_active } = data;

    // Check code uniqueness if changing
    if (code && code !== account.code) {
      const { is_unique } = await this.checkCodeUnique(branchId, code, id);
      if (!is_unique) {
        throw new BadRequestError('Account code already exists');
      }
    }

    const updated = await prisma.account.update({
      where: { id: parseInt(id) },
      data: {
        ...(code && !account.isSystem && { code }),
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(is_active !== undefined && { isActive: is_active })
      }
    });

    return {
      id: updated.id,
      code: updated.code,
      name: updated.name,
      type: updated.type,
      level: updated.level,
      balance: Number(updated.balance),
      is_active: updated.isActive
    };
  }

  /**
   * Delete account
   */
  async deleteAccount(id, branchId) {
    const account = await prisma.account.findFirst({
      where: { id: parseInt(id), branchId },
      include: { children: true, _count: { select: { journalLines: true } } }
    });

    if (!account) throw new NotFoundError('Account');
    if (account.isSystem) throw new BadRequestError('Cannot delete system account');
    if (account.children.length > 0) throw new BadRequestError('Cannot delete account with sub-accounts');
    if (account._count.journalLines > 0) throw new BadRequestError('Cannot delete account with transactions');
    if (Number(account.balance) !== 0) throw new BadRequestError('Cannot delete account with non-zero balance');

    await prisma.account.delete({ where: { id: parseInt(id) } });
    return { message: 'Account deleted successfully' };
  }

  /**
   * Initialize default chart of accounts for a branch
   */
  async initializeChartOfAccounts(branchId) {
    const existing = await prisma.account.findFirst({ where: { branchId } });
    if (existing) {
      throw new BadRequestError('Chart of accounts already initialized for this branch');
    }

    const accountMap = new Map();

    // Sort by code length to ensure parents are created first
    const sortedAccounts = [...defaultChartOfAccounts].sort((a, b) => a.code.length - b.code.length);

    for (const acc of sortedAccounts) {
      let parentId = null;
      if (acc.parentCode) {
        parentId = accountMap.get(acc.parentCode);
      }

      const created = await prisma.account.create({
        data: {
          branchId,
          code: acc.code,
          name: acc.name,
          type: acc.type,
          level: acc.level,
          parentId,
          isSystem: true,
          isActive: true
        }
      });

      accountMap.set(acc.code, created.id);
    }

    return { message: 'Chart of accounts initialized successfully', count: sortedAccounts.length };
  }

  // ==================== JOURNAL ENTRIES ====================

  /**
   * Get journal entries
   */
  async getJournalEntries(query, branchId) {
    const {
      page = paginationConfig.defaultPage,
      per_page = paginationConfig.defaultPerPage,
      entry_type,
      status,
      date_from,
      date_to,
      reference,
      search
    } = query;

    const skip = (page - 1) * per_page;
    const take = Math.min(parseInt(per_page), paginationConfig.maxPerPage);

    const where = { branchId };

    if (entry_type) where.entryType = entry_type;
    if (status) where.status = status;
    if (reference) where.reference = { contains: reference };
    if (search) where.description = { contains: search };

    if (date_from || date_to) {
      where.entryDate = {};
      if (date_from) where.entryDate.gte = new Date(date_from);
      if (date_to) where.entryDate.lte = new Date(date_to);
    }

    const [entries, total] = await Promise.all([
      prisma.journalEntry.findMany({
        where,
        skip,
        take,
        include: {
          lines: {
            include: {
              account: { select: { id: true, code: true, name: true } }
            }
          }
        },
        orderBy: { entryDate: 'desc' }
      }),
      prisma.journalEntry.count({ where })
    ]);

    const items = entries.map(e => ({
      id: e.id,
      entry_number: e.entryNumber,
      entry_date: e.entryDate,
      entry_type: e.entryType,
      description: e.description,
      reference: e.reference,
      total_debit: Number(e.totalDebit),
      total_credit: Number(e.totalCredit),
      status: e.status,
      lines_count: e.lines.length,
      created_at: e.createdAt
    }));

    return {
      items,
      pagination: {
        current_page: parseInt(page),
        per_page: take,
        total_pages: Math.ceil(total / take),
        total_items: total
      }
    };
  }

  /**
   * Get single journal entry
   */
  async getJournalEntryById(id, branchId) {
    const entry = await prisma.journalEntry.findFirst({
      where: { id: parseInt(id), branchId },
      include: {
        lines: {
          include: {
            account: { select: { id: true, code: true, name: true, type: true } }
          }
        }
      }
    });

    if (!entry) throw new NotFoundError('Journal Entry');

    return {
      id: entry.id,
      entry_number: entry.entryNumber,
      entry_date: entry.entryDate,
      entry_type: entry.entryType,
      description: entry.description,
      reference: entry.reference,
      total_debit: Number(entry.totalDebit),
      total_credit: Number(entry.totalCredit),
      status: entry.status,
      lines: entry.lines.map(l => ({
        id: l.id,
        account: l.account,
        description: l.description,
        debit: Number(l.debit),
        credit: Number(l.credit)
      })),
      created_at: entry.createdAt
    };
  }

  /**
   * Generate entry number
   */
  async generateEntryNumber(branchId) {
    const today = new Date();
    const prefix = 'JE';
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    
    const lastEntry = await prisma.journalEntry.findFirst({
      where: {
        branchId,
        entryNumber: { startsWith: `${prefix}${dateStr}` }
      },
      orderBy: { entryNumber: 'desc' }
    });

    let sequence = 1;
    if (lastEntry) {
      const lastSeq = parseInt(lastEntry.entryNumber.slice(-4));
      sequence = lastSeq + 1;
    }

    return `${prefix}${dateStr}${sequence.toString().padStart(4, '0')}`;
  }

  /**
   * Create journal entry with multiple lines
   */
  async createJournalEntry(data, branchId) {
    const {
      entry_date,
      entry_type = 'general',
      description,
      reference,
      entries
    } = data;

    // Validate entries array
    if (!entries || !Array.isArray(entries) || entries.length < 2) {
      throw new BadRequestError('Journal entry requires at least 2 line items');
    }

    // Calculate totals and validate
    let totalDebit = 0;
    let totalCredit = 0;

    for (const entry of entries) {
      const debit = parseFloat(entry.debit || 0);
      const credit = parseFloat(entry.credit || 0);

      if (debit < 0 || credit < 0) {
        throw new BadRequestError('Debit and credit amounts must be positive');
      }
      if (debit > 0 && credit > 0) {
        throw new BadRequestError('A line cannot have both debit and credit');
      }
      if (debit === 0 && credit === 0) {
        throw new BadRequestError('A line must have either debit or credit');
      }

      totalDebit += debit;
      totalCredit += credit;
    }

    // Round for comparison
    totalDebit = Math.round(totalDebit * 100) / 100;
    totalCredit = Math.round(totalCredit * 100) / 100;

    // Debits must equal credits
    if (totalDebit !== totalCredit) {
      throw new BadRequestError(`Debits (${totalDebit}) must equal credits (${totalCredit})`);
    }

    // Validate all accounts exist
    const accountIds = entries.map(e => e.account_id);
    const accounts = await prisma.account.findMany({
      where: { id: { in: accountIds }, branchId }
    });

    if (accounts.length !== accountIds.length) {
      throw new BadRequestError('One or more accounts not found');
    }

    // Generate entry number
    const entryNumber = await this.generateEntryNumber(branchId);

    // Create entry with lines in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create journal entry
      const journalEntry = await tx.journalEntry.create({
        data: {
          branchId,
          entryNumber,
          entryDate: new Date(entry_date),
          entryType: entry_type,
          description,
          reference,
          totalDebit,
          totalCredit,
          status: 'posted'
        }
      });

      // Create lines and update account balances
      for (const entry of entries) {
        const debit = parseFloat(entry.debit || 0);
        const credit = parseFloat(entry.credit || 0);

        await tx.journalEntryLine.create({
          data: {
            entryId: journalEntry.id,
            accountId: entry.account_id,
            description: entry.description,
            debit,
            credit
          }
        });

        // Update account balance
        // Assets & Expenses: Debit increases, Credit decreases
        // Liabilities, Equity & Revenue: Credit increases, Debit decreases
        const account = accounts.find(a => a.id === entry.account_id);
        const isDebitNature = ['asset', 'expense'].includes(account.type);
        
        let balanceChange = 0;
        if (isDebitNature) {
          balanceChange = debit - credit;
        } else {
          balanceChange = credit - debit;
        }

        await tx.account.update({
          where: { id: entry.account_id },
          data: { balance: { increment: balanceChange } }
        });
      }

      return journalEntry;
    });

    return this.getJournalEntryById(result.id, branchId);
  }

  /**
   * Void a journal entry
   */
  async voidJournalEntry(id, branchId) {
    const entry = await prisma.journalEntry.findFirst({
      where: { id: parseInt(id), branchId },
      include: { lines: { include: { account: true } } }
    });

    if (!entry) throw new NotFoundError('Journal Entry');
    if (entry.status === 'void') throw new BadRequestError('Entry is already voided');

    // Reverse all account balance changes
    await prisma.$transaction(async (tx) => {
      for (const line of entry.lines) {
        const debit = Number(line.debit);
        const credit = Number(line.credit);
        const isDebitNature = ['asset', 'expense'].includes(line.account.type);
        
        let balanceChange = 0;
        if (isDebitNature) {
          balanceChange = credit - debit; // Reverse the original change
        } else {
          balanceChange = debit - credit;
        }

        await tx.account.update({
          where: { id: line.accountId },
          data: { balance: { increment: balanceChange } }
        });
      }

      await tx.journalEntry.update({
        where: { id: parseInt(id) },
        data: { status: 'void' }
      });
    });

    return { message: 'Journal entry voided successfully' };
  }

  /**
   * Create journal entry from order (auto-accounting)
   */
  async createOrderJournalEntry(orderId, branchId) {
    const order = await prisma.order.findFirst({
      where: { id: orderId, branchId },
      include: { items: true }
    });

    if (!order) throw new NotFoundError('Order');

    // Get required accounts
    const cashAccount = await prisma.account.findFirst({
      where: { branchId, code: '110101' } // Cash Counter
    });
    const salesAccount = await prisma.account.findFirst({
      where: { branchId, code: '41' } // Sales Revenue
    });
    const taxAccount = await prisma.account.findFirst({
      where: { branchId, code: '2102' } // Tax Payable
    });

    if (!cashAccount || !salesAccount) {
      throw new BadRequestError('Required accounts not found. Initialize chart of accounts first.');
    }

    const total = Number(order.total);
    const taxAmount = Number(order.taxAmount);
    const salesAmount = total - taxAmount;

    const entries = [
      { account_id: cashAccount.id, debit: total, credit: 0, description: 'Cash received' },
      { account_id: salesAccount.id, debit: 0, credit: salesAmount, description: 'Sales revenue' }
    ];

    if (taxAmount > 0 && taxAccount) {
      entries.push({ account_id: taxAccount.id, debit: 0, credit: taxAmount, description: 'Tax collected' });
    }

    return this.createJournalEntry({
      entry_date: order.createdAt.toISOString().slice(0, 10),
      entry_type: 'general',
      description: `Sales - Order ${order.orderNumber}`,
      reference: order.orderNumber,
      entries
    }, branchId);
  }

  // ==================== INVOICES ====================

  /**
   * Get invoices
   */
  async getInvoices(query, branchId) {
    const {
      page = paginationConfig.defaultPage,
      per_page = paginationConfig.defaultPerPage,
      status,
      customer_id,
      date_from,
      date_to,
      search
    } = query;

    const skip = (page - 1) * per_page;
    const take = Math.min(parseInt(per_page), paginationConfig.maxPerPage);

    const where = { branchId };

    if (status) where.status = status;
    if (customer_id) where.customerId = parseInt(customer_id);
    if (search) {
      where.OR = [
        { invoiceNumber: { contains: search } },
        { orderNumber: { contains: search } }
      ];
    }

    if (date_from || date_to) {
      where.createdAt = {};
      if (date_from) where.createdAt.gte = new Date(date_from);
      if (date_to) {
        const endDate = new Date(date_to);
        endDate.setHours(23, 59, 59, 999);
        where.createdAt.lte = endDate;
      }
    }

    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        skip,
        take,
        include: {
          customer: { select: { id: true, name: true, phone: true } },
          order: { select: { id: true, orderNumber: true } }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.invoice.count({ where })
    ]);

    const items = invoices.map(i => ({
      id: i.id,
      invoice_number: i.invoiceNumber,
      order_number: i.orderNumber,
      customer: i.customer,
      subtotal: Number(i.subtotal),
      discount_amount: Number(i.discountAmount),
      tax_amount: Number(i.taxAmount),
      total: Number(i.total),
      paid_amount: Number(i.paidAmount),
      due_amount: Number(i.dueAmount),
      status: i.status,
      payment_method: i.paymentMethod,
      due_date: i.dueDate,
      created_at: i.createdAt
    }));

    return {
      items,
      pagination: {
        current_page: parseInt(page),
        per_page: take,
        total_pages: Math.ceil(total / take),
        total_items: total
      }
    };
  }

  /**
   * Get invoice by ID
   */
  async getInvoiceById(id, branchId) {
    const invoice = await prisma.invoice.findFirst({
      where: { id: parseInt(id), branchId },
      include: {
        customer: true,
        order: {
          include: {
            items: {
              include: {
                product: { select: { id: true, name: true } }
              }
            }
          }
        },
        branch: { select: { id: true, name: true, address: true, phone: true, settings: true } }
      }
    });

    if (!invoice) throw new NotFoundError('Invoice');

    return {
      id: invoice.id,
      invoice_number: invoice.invoiceNumber,
      order_number: invoice.orderNumber,
      branch: invoice.branch,
      customer: invoice.customer ? {
        id: invoice.customer.id,
        name: invoice.customer.name,
        email: invoice.customer.email,
        phone: invoice.customer.phone,
        address: invoice.customer.address,
        tax_number: invoice.customer.taxNumber
      } : null,
      items: invoice.order?.items.map(item => ({
        id: item.id,
        product_name: item.productName,
        variation_name: item.variationName,
        quantity: item.quantity,
        unit_price: Number(item.unitPrice),
        discount_amount: Number(item.discountAmount),
        tax_amount: Number(item.taxAmount),
        total: Number(item.total)
      })) || [],
      subtotal: Number(invoice.subtotal),
      discount_amount: Number(invoice.discountAmount),
      tax_amount: Number(invoice.taxAmount),
      total: Number(invoice.total),
      paid_amount: Number(invoice.paidAmount),
      due_amount: Number(invoice.dueAmount),
      status: invoice.status,
      payment_method: invoice.paymentMethod,
      payment_reference: invoice.paymentReference,
      due_date: invoice.dueDate,
      notes: invoice.notes,
      terms: invoice.terms,
      created_at: invoice.createdAt
    };
  }

  /**
   * Generate invoice from order
   */
  async generateInvoiceFromOrder(orderId, branchId) {
    const order = await prisma.order.findFirst({
      where: { id: parseInt(orderId), branchId },
      include: {
        customer: true,
        items: true,
        invoice: true
      }
    });

    if (!order) throw new NotFoundError('Order');
    if (order.invoice) throw new BadRequestError('Invoice already exists for this order');

    // Generate invoice number
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 7).replace('-', '');
    const lastInvoice = await prisma.invoice.findFirst({
      where: { invoiceNumber: { startsWith: `INV-${dateStr}` } },
      orderBy: { invoiceNumber: 'desc' }
    });

    let sequence = 1;
    if (lastInvoice) {
      const lastSeq = parseInt(lastInvoice.invoiceNumber.slice(-4));
      sequence = lastSeq + 1;
    }
    const invoiceNumber = `INV-${dateStr}-${sequence.toString().padStart(4, '0')}`;

    const paidAmount = Number(order.paidAmount);
    const total = Number(order.total);

    const invoice = await prisma.invoice.create({
      data: {
        branchId,
        orderId: order.id,
        customerId: order.customerId,
        invoiceNumber,
        orderNumber: order.orderNumber,
        subtotal: order.subtotal,
        discountAmount: order.discountAmount,
        taxAmount: order.taxAmount,
        total: order.total,
        paidAmount: order.paidAmount,
        dueAmount: total - paidAmount,
        status: paidAmount >= total ? 'paid' : paidAmount > 0 ? 'partial' : 'issued',
        paymentMethod: order.paymentMethod,
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
      }
    });

    return this.getInvoiceById(invoice.id, branchId);
  }

  /**
   * Update invoice status
   */
  async updateInvoiceStatus(id, status, branchId) {
    const invoice = await prisma.invoice.findFirst({
      where: { id: parseInt(id), branchId }
    });

    if (!invoice) throw new NotFoundError('Invoice');

    const validStatuses = ['draft', 'issued', 'paid', 'partial', 'cancelled'];
    if (!validStatuses.includes(status)) {
      throw new BadRequestError('Invalid status');
    }

    const updated = await prisma.invoice.update({
      where: { id: parseInt(id) },
      data: { status }
    });

    return {
      id: updated.id,
      invoice_number: updated.invoiceNumber,
      status: updated.status
    };
  }

  /**
   * Record invoice payment
   */
  async recordPayment(id, data, branchId) {
    const { amount, payment_method, reference } = data;

    const invoice = await prisma.invoice.findFirst({
      where: { id: parseInt(id), branchId }
    });

    if (!invoice) throw new NotFoundError('Invoice');
    if (invoice.status === 'paid') throw new BadRequestError('Invoice is already fully paid');
    if (invoice.status === 'cancelled') throw new BadRequestError('Cannot pay cancelled invoice');

    const paymentAmount = parseFloat(amount);
    const newPaidAmount = Number(invoice.paidAmount) + paymentAmount;
    const total = Number(invoice.total);
    const newDueAmount = Math.max(0, total - newPaidAmount);

    let newStatus = invoice.status;
    if (newPaidAmount >= total) {
      newStatus = 'paid';
    } else if (newPaidAmount > 0) {
      newStatus = 'partial';
    }

    const updated = await prisma.invoice.update({
      where: { id: parseInt(id) },
      data: {
        paidAmount: newPaidAmount,
        dueAmount: newDueAmount,
        status: newStatus,
        paymentMethod: payment_method || invoice.paymentMethod,
        paymentReference: reference
      }
    });

    return {
      id: updated.id,
      invoice_number: updated.invoiceNumber,
      paid_amount: Number(updated.paidAmount),
      due_amount: Number(updated.dueAmount),
      status: updated.status
    };
  }

  // ==================== TRANSACTIONS ====================

  /**
   * Get transactions
   */
  async getTransactions(query, branchId) {
    const {
      page = paginationConfig.defaultPage,
      per_page = paginationConfig.defaultPerPage,
      type,
      date_from,
      date_to,
      reference
    } = query;

    const skip = (page - 1) * per_page;
    const take = Math.min(parseInt(per_page), paginationConfig.maxPerPage);

    const where = { branchId };

    if (type) where.type = type;
    if (reference) where.OR = [
      { transactionId: { contains: reference } },
      { description: { contains: reference } }
    ];

    if (date_from || date_to) {
      where.createdAt = {};
      if (date_from) where.createdAt.gte = new Date(date_from);
      if (date_to) {
        const endDate = new Date(date_to);
        endDate.setHours(23, 59, 59, 999);
        where.createdAt.lte = endDate;
      }
    }

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.transaction.count({ where })
    ]);

    const items = transactions.map(t => ({
      id: t.id,
      transaction_id: t.transactionId,
      type: t.type,
      reference_type: t.referenceType,
      reference_id: t.referenceId,
      description: t.description,
      debit: Number(t.debit),
      credit: Number(t.credit),
      balance: Number(t.balance),
      created_at: t.createdAt
    }));

    return {
      items,
      pagination: {
        current_page: parseInt(page),
        per_page: take,
        total_pages: Math.ceil(total / take),
        total_items: total
      }
    };
  }

  // ==================== REPORTS ====================

  /**
   * Trial Balance Report
   */
  async getTrialBalance(query, branchId) {
    const { date } = query;
    const asOfDate = date ? new Date(date) : new Date();

    const accounts = await prisma.account.findMany({
      where: { branchId, isActive: true },
      include: {
        journalLines: {
          where: {
            entry: { entryDate: { lte: asOfDate }, status: 'posted' }
          }
        }
      },
      orderBy: { code: 'asc' }
    });

    let totalDebit = 0;
    let totalCredit = 0;

    const items = accounts.map(acc => {
      let debitBalance = 0;
      let creditBalance = 0;

      // Calculate balance from journal entries
      acc.journalLines.forEach(line => {
        debitBalance += Number(line.debit);
        creditBalance += Number(line.credit);
      });

      const netBalance = debitBalance - creditBalance;
      const isDebitNature = ['asset', 'expense'].includes(acc.type);

      let debitCol = 0;
      let creditCol = 0;

      if (isDebitNature) {
        if (netBalance >= 0) debitCol = netBalance;
        else creditCol = Math.abs(netBalance);
      } else {
        if (netBalance <= 0) creditCol = Math.abs(netBalance);
        else debitCol = netBalance;
      }

      totalDebit += debitCol;
      totalCredit += creditCol;

      return {
        account_code: acc.code,
        account_name: acc.name,
        account_type: acc.type,
        debit: Math.round(debitCol * 100) / 100,
        credit: Math.round(creditCol * 100) / 100
      };
    }).filter(item => item.debit !== 0 || item.credit !== 0);

    return {
      as_of_date: asOfDate.toISOString().slice(0, 10),
      items,
      totals: {
        debit: Math.round(totalDebit * 100) / 100,
        credit: Math.round(totalCredit * 100) / 100,
        balanced: Math.abs(totalDebit - totalCredit) < 0.01
      }
    };
  }

  /**
   * Profit & Loss Report
   */
  async getProfitLoss(query, branchId) {
    const { date_from, date_to } = query;
    const startDate = new Date(date_from);
    const endDate = new Date(date_to);
    endDate.setHours(23, 59, 59, 999);

    // Get revenue accounts
    const revenueAccounts = await prisma.account.findMany({
      where: { branchId, type: 'revenue', isActive: true },
      include: {
        journalLines: {
          where: {
            entry: {
              entryDate: { gte: startDate, lte: endDate },
              status: 'posted'
            }
          }
        }
      }
    });

    // Get expense accounts
    const expenseAccounts = await prisma.account.findMany({
      where: { branchId, type: 'expense', isActive: true },
      include: {
        journalLines: {
          where: {
            entry: {
              entryDate: { gte: startDate, lte: endDate },
              status: 'posted'
            }
          }
        }
      }
    });

    const revenue = [];
    let totalRevenue = 0;

    revenueAccounts.forEach(acc => {
      let amount = 0;
      acc.journalLines.forEach(line => {
        amount += Number(line.credit) - Number(line.debit);
      });
      if (amount !== 0) {
        revenue.push({
          account_code: acc.code,
          account_name: acc.name,
          amount: Math.round(amount * 100) / 100
        });
        totalRevenue += amount;
      }
    });

    const expenses = [];
    let totalExpenses = 0;

    expenseAccounts.forEach(acc => {
      let amount = 0;
      acc.journalLines.forEach(line => {
        amount += Number(line.debit) - Number(line.credit);
      });
      if (amount !== 0) {
        expenses.push({
          account_code: acc.code,
          account_name: acc.name,
          amount: Math.round(amount * 100) / 100
        });
        totalExpenses += amount;
      }
    });

    const netIncome = totalRevenue - totalExpenses;

    return {
      period: {
        from: startDate.toISOString().slice(0, 10),
        to: endDate.toISOString().slice(0, 10)
      },
      revenue: {
        items: revenue,
        total: Math.round(totalRevenue * 100) / 100
      },
      expenses: {
        items: expenses,
        total: Math.round(totalExpenses * 100) / 100
      },
      net_income: Math.round(netIncome * 100) / 100,
      net_income_percentage: totalRevenue > 0 
        ? Math.round((netIncome / totalRevenue) * 10000) / 100 
        : 0
    };
  }

  /**
   * Balance Sheet Report
   */
  async getBalanceSheet(query, branchId) {
    const { date } = query;
    const asOfDate = date ? new Date(date) : new Date();

    const accounts = await prisma.account.findMany({
      where: { branchId, isActive: true },
      include: {
        journalLines: {
          where: {
            entry: { entryDate: { lte: asOfDate }, status: 'posted' }
          }
        }
      },
      orderBy: { code: 'asc' }
    });

    const categorize = (type) => {
      const items = [];
      let total = 0;

      accounts
        .filter(a => a.type === type)
        .forEach(acc => {
          let balance = 0;
          acc.journalLines.forEach(line => {
            if (['asset', 'expense'].includes(type)) {
              balance += Number(line.debit) - Number(line.credit);
            } else {
              balance += Number(line.credit) - Number(line.debit);
            }
          });

          if (balance !== 0) {
            items.push({
              account_code: acc.code,
              account_name: acc.name,
              balance: Math.round(balance * 100) / 100
            });
            total += balance;
          }
        });

      return { items, total: Math.round(total * 100) / 100 };
    };

    const assets = categorize('asset');
    const liabilities = categorize('liability');
    const equity = categorize('equity');

    return {
      as_of_date: asOfDate.toISOString().slice(0, 10),
      assets,
      liabilities,
      equity,
      total_liabilities_and_equity: Math.round((liabilities.total + equity.total) * 100) / 100,
      balanced: Math.abs(assets.total - (liabilities.total + equity.total)) < 0.01
    };
  }

  /**
   * Cash Flow Report
   */
  async getCashFlow(query, branchId) {
    const { date_from, date_to } = query;
    const startDate = new Date(date_from);
    const endDate = new Date(date_to);
    endDate.setHours(23, 59, 59, 999);

    // Get cash account
    const cashAccount = await prisma.account.findFirst({
      where: { branchId, code: { startsWith: '1101' } }
    });

    if (!cashAccount) {
      return {
        period: { from: date_from, to: date_to },
        opening_balance: 0,
        inflows: { items: [], total: 0 },
        outflows: { items: [], total: 0 },
        net_cash_flow: 0,
        closing_balance: 0
      };
    }

    // Get opening balance (all entries before start date)
    const openingEntries = await prisma.journalEntryLine.findMany({
      where: {
        accountId: cashAccount.id,
        entry: { entryDate: { lt: startDate }, status: 'posted' }
      }
    });

    let openingBalance = 0;
    openingEntries.forEach(line => {
      openingBalance += Number(line.debit) - Number(line.credit);
    });

    // Get period entries
    const periodEntries = await prisma.journalEntryLine.findMany({
      where: {
        accountId: cashAccount.id,
        entry: {
          entryDate: { gte: startDate, lte: endDate },
          status: 'posted'
        }
      },
      include: {
        entry: { select: { description: true, reference: true, entryDate: true } }
      }
    });

    const inflows = [];
    const outflows = [];
    let totalInflows = 0;
    let totalOutflows = 0;

    periodEntries.forEach(line => {
      const debit = Number(line.debit);
      const credit = Number(line.credit);

      if (debit > 0) {
        inflows.push({
          date: line.entry.entryDate,
          description: line.entry.description,
          reference: line.entry.reference,
          amount: Math.round(debit * 100) / 100
        });
        totalInflows += debit;
      }
      if (credit > 0) {
        outflows.push({
          date: line.entry.entryDate,
          description: line.entry.description,
          reference: line.entry.reference,
          amount: Math.round(credit * 100) / 100
        });
        totalOutflows += credit;
      }
    });

    const netCashFlow = totalInflows - totalOutflows;
    const closingBalance = openingBalance + netCashFlow;

    return {
      period: {
        from: startDate.toISOString().slice(0, 10),
        to: endDate.toISOString().slice(0, 10)
      },
      opening_balance: Math.round(openingBalance * 100) / 100,
      inflows: {
        items: inflows,
        total: Math.round(totalInflows * 100) / 100
      },
      outflows: {
        items: outflows,
        total: Math.round(totalOutflows * 100) / 100
      },
      net_cash_flow: Math.round(netCashFlow * 100) / 100,
      closing_balance: Math.round(closingBalance * 100) / 100
    };
  }
}

module.exports = new AccountingService();
