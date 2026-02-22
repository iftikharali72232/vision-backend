const { getCurrentPrisma } = require('../middlewares/requestContext');
const prisma = new Proxy({}, { get: (_, prop) => getCurrentPrisma()[prop] });
const { pagination: paginationConfig } = require('../config/constants');
const { NotFoundError, AppError } = require('../middlewares/errorHandler');

class InventoryService {
  denormalizeUnit(unit) {
    if (unit === undefined || unit === null || unit === '') return undefined;
    const normalized = String(unit).toLowerCase();
    if (normalized === 'pieces') return 'piece';
    if (normalized === 'liters') return 'liter';
    return normalized;
  }

  // ==================== STOCK MANAGEMENT ====================

  /**
   * Get stock levels for all products
   */
  async getStockLevels(query, branchId) {
    const {
      page = paginationConfig.defaultPage,
      per_page = paginationConfig.defaultPerPage,
      search,
      category_id,
      low_stock,
      out_of_stock,
      sort_by = 'name',
      sort_order = 'asc'
    } = query;

    const numericPerPage = parseInt(per_page) || 20;
    const numericPage = parseInt(page) || 1;
    const skip = (numericPage - 1) * numericPerPage;
    const take = Math.min(numericPerPage, paginationConfig.maxPerPage);
    const numericBranchId = parseInt(branchId);

    const where = {
      branchId: numericBranchId,
      trackStock: true
    };

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { sku: { contains: search } },
        { barcode: { contains: search } }
      ];
    }

    if (category_id) {
      where.categoryId = parseInt(category_id);
    }

    // Get products with stock
    const products = await prisma.product.findMany({
      where,
      include: {
        category: { select: { id: true, name: true } },
        stocks: { where: { branchId: numericBranchId } }
      }
    });

    // Filter and format
    let items = products.map(product => {
      const stock = product.stocks[0];
      const stockQty = stock?.stockQuantity || 0;
      const minLevel = product.lowStockThreshold || 10;

      return {
        id: product.id,
        name: product.name,
        sku: product.sku,
        barcode: product.barcode,
        category: product.category,
        unit: this.denormalizeUnit(product.unit),
        image_url: product.image,
        cost_price: Number(product.costPrice),
        selling_price: Number(product.sellingPrice),
        stock_quantity: stockQty,
        min_stock: minLevel,
        min_stock_level: minLevel,
        max_stock_level: stock?.maxStockLevel,
        reorder_point: minLevel,
        status: stockQty === 0 ? 'out_of_stock' : stockQty <= minLevel ? 'low_stock' : 'in_stock',
        stock_value: stockQty * Number(product.costPrice),
        created_at: product.createdAt
      };
    });

    // Apply filters
    if (low_stock === 'true' || low_stock === true) {
      items = items.filter(i => i.status === 'low_stock');
    }

    if (out_of_stock === 'true' || out_of_stock === true) {
      items = items.filter(i => i.status === 'out_of_stock');
    }

    // Sort
    items.sort((a, b) => {
      let comparison = 0;
      switch (sort_by) {
        case 'stock':
          comparison = a.stock_quantity - b.stock_quantity;
          break;
        case 'value':
          comparison = a.stock_value - b.stock_value;
          break;
        default:
          comparison = (a.name || '').localeCompare(b.name || '');
      }
      return sort_order === 'desc' ? -comparison : comparison;
    });

    // Calculate summary from ALL items (before pagination)
    const summary = {
      total_products: items.length,
      total_stock_value: items.reduce((sum, i) => sum + i.stock_value, 0),
      low_stock_count: items.filter(i => i.status === 'low_stock').length,
      out_of_stock_count: items.filter(i => i.status === 'out_of_stock').length
    };

    // Paginate
    const total = items.length;
    const paginatedItems = items.slice(skip, skip + take);

    return {
      items: paginatedItems,
      summary,
      pagination: {
        current_page: numericPage,
        per_page: take,
        total_pages: Math.ceil(total / take),
        last_page: Math.ceil(total / take),
        total_items: total,
        total
      }
    };
  }

  /**
   * Adjust stock quantity
   */
  async adjustStock(productId, data, userId, branchId) {
    const adjustment_type = data?.adjustment_type ?? data?.type; // accept frontend alias
    const quantity = data?.quantity;
    const reason = data?.reason;
    const notes = data?.notes;
    const unit_cost = data?.unit_cost;

    if (!adjustment_type) {
      throw new AppError('Adjustment type is required', 400, 'INVALID_TYPE');
    }

    const numericQuantity = parseInt(quantity);
    if (!Number.isFinite(numericQuantity) || numericQuantity < 0) {
      throw new AppError('Quantity must be a non-negative integer', 400, 'INVALID_QUANTITY');
    }

    const numericBranchId = parseInt(branchId);
    const numericProductId = parseInt(productId);
    const numericUserId = userId ? parseInt(userId) : null;

    if (!numericUserId) {
      throw new AppError('User context is required for stock adjustments', 400, 'MISSING_USER');
    }

    const product = await prisma.product.findUnique({
      where: { id: numericProductId }
    });

    if (!product) {
      throw new NotFoundError('Product');
    }

    if (!product.trackStock) {
      throw new AppError('Product does not track inventory', 400, 'NO_INVENTORY');
    }

    // Get or create stock record
    let stock = await prisma.productStock.findUnique({
      where: {
        productId_branchId: {
          productId: numericProductId,
          branchId: numericBranchId
        }
      }
    });

    if (!stock) {
      stock = await prisma.productStock.create({
        data: {
          product: { connect: { id: numericProductId } },
          branch: { connect: { id: numericBranchId } },
          stockQuantity: 0
        }
      });
    }

    const beforeQty = stock.stockQuantity;
    let afterQty;
    let movementType;
    let movementQty;

    switch (adjustment_type) {
      case 'set':
        afterQty = numericQuantity;
        movementQty = Math.abs(numericQuantity - beforeQty);
        movementType = 'adjustment';
        break;
      case 'add':
        afterQty = beforeQty + numericQuantity;
        movementQty = numericQuantity;
        movementType = 'in';
        break;
      case 'subtract':
        afterQty = Math.max(0, beforeQty - numericQuantity);
        movementQty = beforeQty - afterQty;
        movementType = 'out';
        break;
      default:
        throw new AppError('Invalid adjustment type', 400, 'INVALID_TYPE');
    }

    // Update stock and create movement
    await prisma.$transaction(async (tx) => {
      await tx.productStock.update({
        where: {
          productId_branchId: {
            productId: numericProductId,
            branchId: numericBranchId
          }
        },
        data: { stockQuantity: afterQty }
      });

      // Also update the denormalized stockQuantity on Product
      await tx.product.update({
        where: { id: numericProductId },
        data: { stockQuantity: afterQty }
      });

      await tx.inventoryMovement.create({
        data: {
          branch: { connect: { id: numericBranchId } },
          product: { connect: { id: numericProductId } },
          user: { connect: { id: numericUserId } },
          type: movementType,
          reason: reason || 'correction',
          quantity: movementQty,
          quantityBefore: beforeQty,
          quantityAfter: afterQty,
          unitCost: unit_cost ? parseFloat(unit_cost) : Number(product.costPrice) || null,
          notes: notes || null
        }
      });

      // Check for low stock alert
      const minLevel = product.lowStockThreshold || 10;
      if (afterQty <= minLevel && afterQty > 0) {
        await this.createStockAlert(tx, numericProductId, numericBranchId, 'low_stock', afterQty, minLevel, product);
      } else if (afterQty === 0) {
        await this.createStockAlert(tx, numericProductId, numericBranchId, 'out_of_stock', afterQty, minLevel, product);
      }
    });

    return {
      product_id: numericProductId,
      product_name: product.name,
      before_quantity: beforeQty,
      after_quantity: afterQty,
      adjustment: afterQty - beforeQty
    };
  }

  /**
   * Bulk stock adjustment
   */
  async bulkAdjustStock(adjustments, userId, branchId) {
    const results = [];

    for (const adj of adjustments) {
      try {
        const result = await this.adjustStock(adj.product_id, adj, userId, branchId);
        results.push({ ...result, success: true });
      } catch (error) {
        results.push({
          product_id: adj.product_id,
          success: false,
          error: error.message
        });
      }
    }

    return {
      total: adjustments.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results
    };
  }

  /**
   * Stock transfer between branches
   */
  async transferStock(data, userId, sourceBranchId) {
    const {
      target_branch_id,
      product_id,
      quantity,
      notes
    } = data;

    const numericSourceBranch = parseInt(sourceBranchId);
    const numericTargetBranch = parseInt(target_branch_id);
    const numericProductId = parseInt(product_id);
    const numericUserId = parseInt(userId);

    if (numericSourceBranch === numericTargetBranch) {
      throw new AppError('Cannot transfer to same branch', 400, 'SAME_BRANCH');
    }

    const product = await prisma.product.findUnique({
      where: { id: numericProductId }
    });

    if (!product) {
      throw new NotFoundError('Product');
    }

    // Get source stock
    const sourceStock = await prisma.productStock.findUnique({
      where: {
        productId_branchId: {
          productId: numericProductId,
          branchId: numericSourceBranch
        }
      }
    });

    if (!sourceStock || sourceStock.stockQuantity < quantity) {
      throw new AppError('Insufficient stock for transfer', 400, 'INSUFFICIENT_STOCK');
    }

    const transferRef = `TRF-${Date.now()}`;

    await prisma.$transaction(async (tx) => {
      const sourceBeforeQty = sourceStock.stockQuantity;
      const sourceAfterQty = sourceBeforeQty - quantity;

      await tx.productStock.update({
        where: {
          productId_branchId: {
            productId: numericProductId,
            branchId: numericSourceBranch
          }
        },
        data: { stockQuantity: sourceAfterQty }
      });

      await tx.inventoryMovement.create({
        data: {
          branch: { connect: { id: numericSourceBranch } },
          product: { connect: { id: numericProductId } },
          user: { connect: { id: numericUserId } },
          type: 'out',
          reason: 'transfer_out',
          quantity,
          quantityBefore: sourceBeforeQty,
          quantityAfter: sourceAfterQty,
          unitCost: Number(product.costPrice) || null,
          reference: transferRef,
          notes: `Transfer to branch ${numericTargetBranch}: ${notes || ''}`
        }
      });

      // Add to target
      let targetStock = await tx.productStock.findUnique({
        where: {
          productId_branchId: {
            productId: numericProductId,
            branchId: numericTargetBranch
          }
        }
      });

      const targetBeforeQty = targetStock?.stockQuantity || 0;
      const targetAfterQty = targetBeforeQty + quantity;

      await tx.productStock.upsert({
        where: {
          productId_branchId: {
            productId: numericProductId,
            branchId: numericTargetBranch
          }
        },
        update: { stockQuantity: targetAfterQty },
        create: {
          product: { connect: { id: numericProductId } },
          branch: { connect: { id: numericTargetBranch } },
          stockQuantity: quantity
        }
      });

      await tx.inventoryMovement.create({
        data: {
          branch: { connect: { id: numericTargetBranch } },
          product: { connect: { id: numericProductId } },
          user: { connect: { id: numericUserId } },
          type: 'in',
          reason: 'transfer_in',
          quantity,
          quantityBefore: targetBeforeQty,
          quantityAfter: targetAfterQty,
          unitCost: Number(product.costPrice) || null,
          reference: transferRef,
          notes: `Transfer from branch ${numericSourceBranch}: ${notes || ''}`
        }
      });
    });

    return {
      reference: transferRef,
      product_id: numericProductId,
      product_name: product.name,
      quantity,
      source_branch_id: numericSourceBranch,
      target_branch_id: numericTargetBranch
    };
  }

  // ==================== INVENTORY MOVEMENTS ====================

  /**
   * Get inventory movements history
   */
  async getMovements(query, branchId) {
    const {
      page = paginationConfig.defaultPage,
      per_page = paginationConfig.defaultPerPage,
      product_id,
      type,
      reason,
      date_from,
      date_to,
      user_id
    } = query;

    const numericPage = parseInt(page) || 1;
    const numericPerPage = parseInt(per_page) || 20;
    const skip = (numericPage - 1) * numericPerPage;
    const take = Math.min(numericPerPage, paginationConfig.maxPerPage);
    const numericBranchId = parseInt(branchId);

    const where = { branchId: numericBranchId };

    if (product_id) where.productId = parseInt(product_id);
    if (type) where.type = type;
    if (reason) where.reason = reason;
    if (user_id) where.userId = parseInt(user_id);

    if (date_from || date_to) {
      where.createdAt = {};
      if (date_from) where.createdAt.gte = new Date(date_from);
      if (date_to) {
        const endDate = new Date(date_to);
        endDate.setHours(23, 59, 59, 999);
        where.createdAt.lte = endDate;
      }
    }

    const [movements, total] = await Promise.all([
      prisma.inventoryMovement.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          product: { select: { id: true, name: true, sku: true } },
          user: { select: { id: true, name: true } }
        }
      }),
      prisma.inventoryMovement.count({ where })
    ]);

    const items = movements.map(m => ({
      id: m.id,
      product: m.product,
      product_name: m.product?.name,
      sku: m.product?.sku,
      user: m.user,
      created_by: m.user?.name,
      type: m.type,
      reason: m.reason,
      quantity: m.quantity,
      quantity_before: m.quantityBefore,
      quantity_after: m.quantityAfter,
      unit_cost: m.unitCost ? Number(m.unitCost) : null,
      reference: m.reference,
      notes: m.notes,
      created_at: m.createdAt
    }));

    return {
      items,
      pagination: {
        current_page: numericPage,
        per_page: take,
        total_pages: Math.ceil(total / take),
        total_items: total,
        total
      }
    };
  }

  /**
   * Get movement details
   */
  async getMovementById(id, branchId) {
    const numericBranchId = parseInt(branchId);
    const movement = await prisma.inventoryMovement.findFirst({
      where: { id: parseInt(id), branchId: numericBranchId },
      include: {
        product: { select: { id: true, name: true, sku: true, barcode: true } },
        user: { select: { id: true, name: true } },
        variation: { select: { id: true, name: true, sku: true } }
      }
    });

    if (!movement) {
      throw new NotFoundError('Movement');
    }

    return {
      id: movement.id,
      product: movement.product,
      variation: movement.variation,
      user: movement.user,
      type: movement.type,
      reason: movement.reason,
      quantity: movement.quantity,
      quantity_before: movement.quantityBefore,
      quantity_after: movement.quantityAfter,
      unit_cost: movement.unitCost ? Number(movement.unitCost) : null,
      total_cost: movement.unitCost ? Number(movement.unitCost) * movement.quantity : null,
      reference: movement.reference,
      notes: movement.notes,
      created_at: movement.createdAt
    };
  }

  // ==================== STOCK ALERTS ====================

  /**
   * Get active stock alerts
   */
  async getStockAlerts(query, branchId) {
    const { status = 'active', product_id, alert_type } = query;
    const numericBranchId = parseInt(branchId);

    const where = { branchId: numericBranchId };
    if (status) where.status = status;
    if (product_id) where.productId = parseInt(product_id);
    if (alert_type) where.alertType = alert_type;

    const alerts = await prisma.stockAlert.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
            lowStockThreshold: true,
            stocks: { where: { branchId: numericBranchId } }
          }
        }
      }
    });

    // Format to match the LowStockAlert component expectations
    return alerts.map(alert => ({
      id: alert.id,
      product_id: alert.productId,
      product_name: alert.productName || alert.product?.name,
      sku: alert.sku || alert.product?.sku,
      current_stock: alert.product?.stocks?.[0]?.stockQuantity ?? alert.currentStock,
      min_stock: alert.minStock || alert.product?.lowStockThreshold || 10,
      reorder_quantity: alert.reorderQuantity || null,
      alert_type: alert.alertType || (alert.currentStock === 0 ? 'out_of_stock' : 'low_stock'),
      status: alert.status,
      dismissed_at: alert.dismissedAt,
      created_at: alert.createdAt,
      last_restocked: null
    }));
  }

  /**
   * Dismiss stock alert
   */
  async dismissAlert(id, branchId) {
    const numericBranchId = parseInt(branchId);
    const alert = await prisma.stockAlert.findFirst({
      where: { id: parseInt(id), branchId: numericBranchId }
    });

    if (!alert) {
      throw new NotFoundError('Alert');
    }

    await prisma.stockAlert.update({
      where: { id: parseInt(id) },
      data: {
        status: 'dismissed',
        dismissedAt: new Date()
      }
    });

    return { message: 'Alert dismissed successfully' };
  }

  /**
   * Create stock alert (internal)
   */
  async createStockAlert(tx, productId, branchId, alertType, currentQty, thresholdQty, product) {
    const numericProductId = parseInt(productId);
    // Check if similar active alert exists
    const existing = await tx.stockAlert.findFirst({
      where: {
        productId: numericProductId,
        branchId,
        status: 'active'
      }
    });

    if (existing) {
      await tx.stockAlert.update({
        where: { id: existing.id },
        data: {
          currentStock: currentQty,
          minStock: thresholdQty
        }
      });
    } else {
      await tx.stockAlert.create({
        data: {
          branch: { connect: { id: branchId } },
          product: { connect: { id: numericProductId } },
          productName: product?.name || 'Unknown',
          sku: product?.sku || null,
          currentStock: currentQty,
          minStock: thresholdQty,
          status: 'active'
        }
      });
    }
  }

  // ==================== STOCK TAKE / INVENTORY COUNT ====================

  /**
   * Start stock take session
   */
  async startStockTake(data, userId, branchId) {
    const { category_id, notes } = data;
    const numericBranchId = parseInt(branchId);

    const where = { branchId: numericBranchId, trackStock: true };
    if (category_id) where.categoryId = parseInt(category_id);

    const products = await prisma.product.findMany({
      where,
      include: {
        stocks: { where: { branchId: numericBranchId } },
        category: { select: { id: true, name: true } }
      }
    });

    const stockTakeId = `ST-${Date.now()}`;

    return {
      stock_take_id: stockTakeId,
      started_at: new Date(),
      started_by: userId,
      notes,
      products: products.map(p => ({
        product_id: p.id,
        product_name: p.name,
        sku: p.sku,
        barcode: p.barcode,
        category: p.category,
        system_quantity: p.stocks[0]?.stockQuantity || 0,
        counted_quantity: null,
        variance: null
      }))
    };
  }

  /**
   * Submit stock take results
   */
  async submitStockTake(data, userId, branchId) {
    const { stock_take_id, counts, notes } = data;
    const numericBranchId = parseInt(branchId);
    const numericUserId = parseInt(userId);
    const results = [];

    await prisma.$transaction(async (tx) => {
      for (const count of (counts || [])) {
        const { product_id, counted_quantity } = count;
        const numericProductId = parseInt(product_id);

        const stock = await tx.productStock.findUnique({
          where: {
            productId_branchId: {
              productId: numericProductId,
              branchId: numericBranchId
            }
          }
        });

        const systemQty = stock?.stockQuantity || 0;
        const variance = counted_quantity - systemQty;

        if (variance !== 0) {
          await tx.productStock.upsert({
            where: {
              productId_branchId: {
                productId: numericProductId,
                branchId: numericBranchId
              }
            },
            update: { stockQuantity: counted_quantity },
            create: {
              product: { connect: { id: numericProductId } },
              branch: { connect: { id: numericBranchId } },
              stockQuantity: counted_quantity
            }
          });

          await tx.inventoryMovement.create({
            data: {
              branch: { connect: { id: numericBranchId } },
              product: { connect: { id: numericProductId } },
              user: { connect: { id: numericUserId } },
              type: 'adjustment',
              reason: 'correction',
              quantity: Math.abs(variance),
              quantityBefore: systemQty,
              quantityAfter: counted_quantity,
              reference: stock_take_id,
              notes: `Stock take adjustment: ${notes || ''}`
            }
          });
        }

        results.push({
          product_id: numericProductId,
          system_quantity: systemQty,
          counted_quantity,
          variance,
          adjusted: variance !== 0
        });
      }
    });

    return {
      stock_take_id,
      completed_at: new Date(),
      total_products: (counts || []).length,
      products_adjusted: results.filter(r => r.adjusted).length,
      total_variance: results.reduce((sum, r) => sum + r.variance, 0),
      results
    };
  }

  // ==================== REPORTS ====================

  /**
   * Get inventory valuation report
   */
  async getValuationReport(branchId) {
    const numericBranchId = parseInt(branchId);
    const products = await prisma.product.findMany({
      where: { branchId: numericBranchId, trackStock: true },
      include: {
        category: { select: { id: true, name: true } },
        stocks: { where: { branchId: numericBranchId } }
      }
    });

    const items = products.map(p => {
      const stockQty = p.stocks[0]?.stockQuantity || 0;
      return {
        product_id: p.id,
        product_name: p.name,
        sku: p.sku,
        category: p.category,
        stock_quantity: stockQty,
        cost_price: Number(p.costPrice),
        stock_value: stockQty * Number(p.costPrice),
        selling_price: Number(p.sellingPrice),
        potential_revenue: stockQty * Number(p.sellingPrice)
      };
    });

    const byCategory = {};
    for (const item of items) {
      const catName = item.category?.name || 'Uncategorized';
      if (!byCategory[catName]) {
        byCategory[catName] = {
          category: item.category || { name: 'Uncategorized' },
          total_items: 0,
          total_stock: 0,
          total_value: 0
        };
      }
      byCategory[catName].total_items++;
      byCategory[catName].total_stock += item.stock_quantity;
      byCategory[catName].total_value += item.stock_value;
    }

    return {
      summary: {
        total_products: items.length,
        total_stock_units: items.reduce((sum, i) => sum + i.stock_quantity, 0),
        total_stock_value: items.reduce((sum, i) => sum + i.stock_value, 0),
        total_potential_revenue: items.reduce((sum, i) => sum + i.potential_revenue, 0)
      },
      by_category: Object.values(byCategory),
      items
    };
  }

  /**
   * Get movement summary report
   */
  async getMovementSummary(query, branchId) {
    const { date_from, date_to } = query;
    const numericBranchId = parseInt(branchId);
    const where = { branchId: numericBranchId };

    if (date_from || date_to) {
      where.createdAt = {};
      if (date_from) where.createdAt.gte = new Date(date_from);
      if (date_to) {
        const endDate = new Date(date_to);
        endDate.setHours(23, 59, 59, 999);
        where.createdAt.lte = endDate;
      }
    }

    const movements = await prisma.inventoryMovement.findMany({
      where,
      include: { product: { select: { id: true, name: true } } }
    });

    const summary = {
      total_movements: movements.length,
      by_type: {
        in: movements.filter(m => m.type === 'in').length,
        out: movements.filter(m => m.type === 'out').length,
        adjustment: movements.filter(m => m.type === 'adjustment').length,
        transfer: movements.filter(m => m.type === 'transfer').length
      },
      by_reason: {}
    };

    for (const m of movements) {
      if (!summary.by_reason[m.reason]) {
        summary.by_reason[m.reason] = { count: 0, total_quantity: 0 };
      }
      summary.by_reason[m.reason].count++;
      summary.by_reason[m.reason].total_quantity += m.quantity;
    }

    const productMovements = {};
    for (const m of movements) {
      if (!productMovements[m.productId]) {
        productMovements[m.productId] = {
          product: m.product,
          total_in: 0,
          total_out: 0,
          movement_count: 0
        };
      }
      productMovements[m.productId].movement_count++;
      if (m.type === 'in') productMovements[m.productId].total_in += m.quantity;
      else if (m.type === 'out') productMovements[m.productId].total_out += m.quantity;
    }

    const topProducts = Object.values(productMovements)
      .sort((a, b) => b.movement_count - a.movement_count)
      .slice(0, 10);

    return { ...summary, top_products: topProducts };
  }

  // ==================== EXPORT ====================

  /**
   * Export stock data as CSV
   */
  async exportStockCSV(query, branchId) {
    const result = await this.getStockLevels({ ...query, per_page: 10000 }, branchId);
    const items = result.items || [];

    const headers = ['Product', 'SKU', 'Category', 'Stock Qty', 'Min Stock', 'Cost Price', 'Stock Value', 'Status'];
    const rows = items.map(item => [
      `"${(item.name || '').replace(/"/g, '""')}"`,
      item.sku || '',
      item.category?.name || '',
      item.stock_quantity,
      item.min_stock,
      item.cost_price,
      item.stock_value.toFixed(2),
      item.status
    ]);

    return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  }
}

module.exports = new InventoryService();
