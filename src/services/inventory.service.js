const prisma = require('../config/database');
const { pagination: paginationConfig } = require('../config/constants');
const { NotFoundError, AppError } = require('../middlewares/errorHandler');

class InventoryService {
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

    const skip = (page - 1) * per_page;
    const take = Math.min(per_page, paginationConfig.maxPerPage);

    const where = {
      branchId,
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
        stocks: { where: { branchId } }
      }
    });

    // Filter and format
    let items = products.map(product => {
      const stock = product.stocks[0];
      const stockQty = stock?.stockQuantity || 0;
      const minLevel = stock?.minStockLevel || 10;
      
      return {
        id: product.id,
        name: product.name,
        sku: product.sku,
        barcode: product.barcode,
        category: product.category,
        cost_price: Number(product.costPrice),
        stock_quantity: stockQty,
        min_stock_level: minLevel,
        max_stock_level: stock?.maxStockLevel,
        reorder_point: stock?.reorderPoint || minLevel,
        status: stockQty === 0 ? 'out_of_stock' : stockQty <= minLevel ? 'low_stock' : 'in_stock',
        stock_value: stockQty * Number(product.costPrice)
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
          comparison = a.name.localeCompare(b.name);
      }
      return sort_order === 'desc' ? -comparison : comparison;
    });

    // Paginate
    const total = items.length;
    const paginatedItems = items.slice(skip, skip + take);

    // Calculate summary
    const summary = {
      total_products: total,
      total_stock_value: items.reduce((sum, i) => sum + i.stock_value, 0),
      low_stock_count: items.filter(i => i.status === 'low_stock').length,
      out_of_stock_count: items.filter(i => i.status === 'out_of_stock').length
    };

    return {
      items: paginatedItems,
      summary,
      pagination: {
        current_page: parseInt(page),
        per_page: take,
        total_pages: Math.ceil(total / take),
        total_items: total
      }
    };
  }

  /**
   * Adjust stock quantity
   */
  async adjustStock(productId, data, userId, branchId) {
    const {
      adjustment_type, // 'set', 'add', 'subtract'
      quantity,
      reason,
      notes,
      unit_cost
    } = data;

    const product = await prisma.product.findUnique({
      where: { id: parseInt(productId) }
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
          productId: parseInt(productId),
          branchId
        }
      }
    });

    if (!stock) {
      stock = await prisma.productStock.create({
        data: {
          productId: parseInt(productId),
          branchId,
          stockQuantity: 0,
          minStockLevel: 10
        }
      });
    }

    const beforeQty = stock.stockQuantity;
    let afterQty;
    let movementType;
    let movementQty;

    switch (adjustment_type) {
      case 'set':
        afterQty = quantity;
        movementQty = Math.abs(quantity - beforeQty);
        movementType = quantity > beforeQty ? 'in' : 'out';
        break;
      case 'add':
        afterQty = beforeQty + quantity;
        movementQty = quantity;
        movementType = 'in';
        break;
      case 'subtract':
        afterQty = Math.max(0, beforeQty - quantity);
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
            productId: parseInt(productId),
            branchId
          }
        },
        data: { stockQuantity: afterQty }
      });

      await tx.inventoryMovement.create({
        data: {
          branchId,
          productId: parseInt(productId),
          userId,
          type: movementType === 'in' && movementType === 'out' ? 'adjustment' : movementType,
          reason: reason || 'correction',
          quantity: movementQty,
          quantityBefore: beforeQty,
          quantityAfter: afterQty,
          unitCost: unit_cost || product.costPrice,
          notes
        }
      });

      // Check for low stock alert
      if (afterQty <= stock.minStockLevel && afterQty > 0) {
        await this.createStockAlert(tx, productId, branchId, 'low_stock', afterQty, stock.minStockLevel);
      } else if (afterQty === 0) {
        await this.createStockAlert(tx, productId, branchId, 'out_of_stock', afterQty, stock.minStockLevel);
      }
    });

    return {
      product_id: parseInt(productId),
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

    if (sourceBranchId === target_branch_id) {
      throw new AppError('Cannot transfer to same branch', 400, 'SAME_BRANCH');
    }

    const product = await prisma.product.findUnique({
      where: { id: parseInt(product_id) }
    });

    if (!product) {
      throw new NotFoundError('Product');
    }

    // Get source stock
    const sourceStock = await prisma.productStock.findUnique({
      where: {
        productId_branchId: {
          productId: parseInt(product_id),
          branchId: sourceBranchId
        }
      }
    });

    if (!sourceStock || sourceStock.stockQuantity < quantity) {
      throw new AppError('Insufficient stock for transfer', 400, 'INSUFFICIENT_STOCK');
    }

    // Generate transfer reference
    const transferRef = `TRF-${Date.now()}`;

    await prisma.$transaction(async (tx) => {
      // Deduct from source
      const sourceBeforeQty = sourceStock.stockQuantity;
      const sourceAfterQty = sourceBeforeQty - quantity;

      await tx.productStock.update({
        where: {
          productId_branchId: {
            productId: parseInt(product_id),
            branchId: sourceBranchId
          }
        },
        data: { stockQuantity: sourceAfterQty }
      });

      await tx.inventoryMovement.create({
        data: {
          branchId: sourceBranchId,
          productId: parseInt(product_id),
          userId,
          type: 'out',
          reason: 'transfer_out',
          quantity,
          quantityBefore: sourceBeforeQty,
          quantityAfter: sourceAfterQty,
          unitCost: product.costPrice,
          reference: transferRef,
          notes: `Transfer to branch ${target_branch_id}: ${notes || ''}`
        }
      });

      // Add to target
      let targetStock = await tx.productStock.findUnique({
        where: {
          productId_branchId: {
            productId: parseInt(product_id),
            branchId: target_branch_id
          }
        }
      });

      const targetBeforeQty = targetStock?.stockQuantity || 0;
      const targetAfterQty = targetBeforeQty + quantity;

      await tx.productStock.upsert({
        where: {
          productId_branchId: {
            productId: parseInt(product_id),
            branchId: target_branch_id
          }
        },
        update: { stockQuantity: targetAfterQty },
        create: {
          productId: parseInt(product_id),
          branchId: target_branch_id,
          stockQuantity: quantity,
          minStockLevel: 10
        }
      });

      await tx.inventoryMovement.create({
        data: {
          branchId: target_branch_id,
          productId: parseInt(product_id),
          userId,
          type: 'in',
          reason: 'transfer_in',
          quantity,
          quantityBefore: targetBeforeQty,
          quantityAfter: targetAfterQty,
          unitCost: product.costPrice,
          reference: transferRef,
          notes: `Transfer from branch ${sourceBranchId}: ${notes || ''}`
        }
      });
    });

    return {
      reference: transferRef,
      product_id: parseInt(product_id),
      product_name: product.name,
      quantity,
      source_branch_id: sourceBranchId,
      target_branch_id
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

    const skip = (page - 1) * per_page;
    const take = Math.min(per_page, paginationConfig.maxPerPage);

    const where = { branchId };

    if (product_id) {
      where.productId = parseInt(product_id);
    }

    if (type) {
      where.type = type;
    }

    if (reason) {
      where.reason = reason;
    }

    if (user_id) {
      where.userId = parseInt(user_id);
    }

    if (date_from || date_to) {
      where.createdAt = {};
      if (date_from) {
        where.createdAt.gte = new Date(date_from);
      }
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
      user: m.user,
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
        current_page: parseInt(page),
        per_page: take,
        total_pages: Math.ceil(total / take),
        total_items: total
      }
    };
  }

  /**
   * Get movement details
   */
  async getMovementById(id, branchId) {
    const movement = await prisma.inventoryMovement.findFirst({
      where: { id: parseInt(id), branchId },
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

    const where = { branchId };

    if (status) {
      where.status = status;
    }

    if (product_id) {
      where.productId = parseInt(product_id);
    }

    if (alert_type) {
      where.alertType = alert_type;
    }

    const alerts = await prisma.stockAlert.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
            stocks: { where: { branchId } }
          }
        }
      }
    });

    return alerts.map(alert => ({
      id: alert.id,
      product: {
        id: alert.product.id,
        name: alert.product.name,
        sku: alert.product.sku,
        current_stock: alert.product.stocks[0]?.stockQuantity || 0
      },
      alert_type: alert.alertType,
      current_quantity: alert.currentQuantity,
      threshold_quantity: alert.thresholdQuantity,
      status: alert.status,
      dismissed_at: alert.dismissedAt,
      created_at: alert.createdAt
    }));
  }

  /**
   * Dismiss stock alert
   */
  async dismissAlert(id, branchId) {
    const alert = await prisma.stockAlert.findFirst({
      where: { id: parseInt(id), branchId }
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
  async createStockAlert(tx, productId, branchId, alertType, currentQty, thresholdQty) {
    // Check if similar active alert exists
    const existing = await tx.stockAlert.findFirst({
      where: {
        productId: parseInt(productId),
        branchId,
        alertType,
        status: 'active'
      }
    });

    if (existing) {
      // Update existing alert
      await tx.stockAlert.update({
        where: { id: existing.id },
        data: {
          currentQuantity: currentQty,
          thresholdQuantity: thresholdQty
        }
      });
    } else {
      // Create new alert
      await tx.stockAlert.create({
        data: {
          branchId,
          productId: parseInt(productId),
          alertType,
          currentQuantity: currentQty,
          thresholdQuantity: thresholdQty,
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

    // Get products to count
    const where = { branchId, trackStock: true };
    if (category_id) {
      where.categoryId = parseInt(category_id);
    }

    const products = await prisma.product.findMany({
      where,
      include: {
        stocks: { where: { branchId } },
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

    const results = [];

    await prisma.$transaction(async (tx) => {
      for (const count of counts) {
        const { product_id, counted_quantity } = count;

        const stock = await tx.productStock.findUnique({
          where: {
            productId_branchId: {
              productId: product_id,
              branchId
            }
          }
        });

        const systemQty = stock?.stockQuantity || 0;
        const variance = counted_quantity - systemQty;

        if (variance !== 0) {
          // Create adjustment
          await tx.productStock.upsert({
            where: {
              productId_branchId: {
                productId: product_id,
                branchId
              }
            },
            update: { stockQuantity: counted_quantity },
            create: {
              productId: product_id,
              branchId,
              stockQuantity: counted_quantity,
              minStockLevel: 10
            }
          });

          await tx.inventoryMovement.create({
            data: {
              branchId,
              productId: product_id,
              userId,
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
          product_id,
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
      total_products: counts.length,
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
    const products = await prisma.product.findMany({
      where: { branchId, trackStock: true },
      include: {
        category: { select: { id: true, name: true } },
        stocks: { where: { branchId } }
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
        selling_price: Number(p.price),
        potential_revenue: stockQty * Number(p.price)
      };
    });

    // Group by category
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

    const where = { branchId };

    if (date_from || date_to) {
      where.createdAt = {};
      if (date_from) {
        where.createdAt.gte = new Date(date_from);
      }
      if (date_to) {
        const endDate = new Date(date_to);
        endDate.setHours(23, 59, 59, 999);
        where.createdAt.lte = endDate;
      }
    }

    const movements = await prisma.inventoryMovement.findMany({
      where,
      include: {
        product: { select: { id: true, name: true } }
      }
    });

    // Aggregate by type and reason
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

    // Top products by movement
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
      if (m.type === 'in') {
        productMovements[m.productId].total_in += m.quantity;
      } else if (m.type === 'out') {
        productMovements[m.productId].total_out += m.quantity;
      }
    }

    const topProducts = Object.values(productMovements)
      .sort((a, b) => b.movement_count - a.movement_count)
      .slice(0, 10);

    return {
      ...summary,
      top_products: topProducts
    };
  }
}

module.exports = new InventoryService();
