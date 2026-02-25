const { getCurrentPrisma } = require('../middlewares/requestContext');
const prisma = new Proxy({}, { get: (_, prop) => getCurrentPrisma()[prop] });
const { NotFoundError, AppError } = require('../middlewares/errorHandler');

class TableService {
  // ==================== HALLS ====================

  /**
   * Get all halls for a branch
   */
  async getHalls(branchId) {
    const halls = await prisma.hall.findMany({
      where: { branchId },
      orderBy: { displayOrder: 'asc' },
      include: {
        _count: { select: { tables: true } }
      }
    });

    return halls.map(hall => ({
      id: hall.id,
      name: hall.name,
      description: hall.description,
      
      is_active: hall.isActive,
      sort_order: hall.displayOrder,
      tables_count: hall._count.tables,
      created_at: hall.createdAt
    }));
  }

  /**
   * Get hall by ID
   */
  async getHallById(id, branchId) {
    const hall = await prisma.hall.findFirst({
      where: { id: parseInt(id), branchId },
      include: {
        tables: {
          orderBy: { displayOrder: 'asc' },
          include: {
            _count: { select: { orders: true, heldOrders: true } }
          }
        }
      }
    });

    if (!hall) {
      throw new NotFoundError('Hall');
    }

    return {
      id: hall.id,
      name: hall.name,
      description: hall.description,
      
      is_active: hall.isActive,
      sort_order: hall.displayOrder,
      tables: hall.tables.map(table => this.formatTableResponse(table)),
      created_at: hall.createdAt,
      updated_at: hall.updatedAt
    };
  }

  /**
   * Create new hall
   */
  async createHall(data, branchId) {
    const { name, description, color, sort_order, is_active = true } = data;

    // Check for duplicate name
    const existing = await prisma.hall.findFirst({
      where: { branchId, name }
    });

    if (existing) {
      throw new AppError('Hall with this name already exists', 400, 'HALL_EXISTS');
    }

    // Get max sort order if not provided
    let displayOrder = sort_order;
    if (displayOrder === undefined) {
      const maxSort = await prisma.hall.aggregate({
        where: { branchId },
        _max: { displayOrder: true }
      });
      displayOrder = (maxSort._max.displayOrder || 0) + 1;
    }

    const hall = await prisma.hall.create({
      data: {
        branchId,
        name,
        description,
        color,
        displayOrder,
        isActive: is_active
      }
    });

    return {
      id: hall.id,
      name: hall.name,
      description: hall.description,
      
      is_active: hall.isActive,
      sort_order: hall.displayOrder,
      created_at: hall.createdAt
    };
  }

  /**
   * Update hall
   */
  async updateHall(id, data, branchId) {
    const hall = await prisma.hall.findFirst({
      where: { id: parseInt(id), branchId }
    });

    if (!hall) {
      throw new NotFoundError('Hall');
    }

    const { name, description, color, sort_order, is_active } = data;

    // Check for duplicate name
    if (name && name !== hall.name) {
      const existing = await prisma.hall.findFirst({
        where: { branchId, name, id: { not: parseInt(id) } }
      });

      if (existing) {
        throw new AppError('Hall with this name already exists', 400, 'HALL_EXISTS');
      }
    }

    const updatedHall = await prisma.hall.update({
      where: { id: parseInt(id) },
      data: {
        name,
        description,
        color,
        displayOrder: sort_order,
        isActive: is_active
      }
    });

    return {
      id: updatedHall.id,
      name: updatedHall.name,
      description: updatedHall.description,
      
      is_active: updatedHall.isActive,
      sort_order: updatedHall.displayOrder,
      updated_at: updatedHall.updatedAt
    };
  }

  /**
   * Delete hall
   */
  async deleteHall(id, branchId) {
    const hall = await prisma.hall.findFirst({
      where: { id: parseInt(id), branchId },
      include: { _count: { select: { tables: true } } }
    });

    if (!hall) {
      throw new NotFoundError('Hall');
    }

    if (hall._count.tables > 0) {
      throw new AppError('Cannot delete hall with tables. Move or delete tables first.', 400, 'HALL_HAS_TABLES');
    }

    await prisma.hall.delete({
      where: { id: parseInt(id) }
    });

    return { message: 'Hall deleted successfully' };
  }

  /**
   * Reorder halls
   */
  async reorderHalls(hallOrders, branchId) {
    // hallOrders: [{ id: 1, sort_order: 1 }, { id: 2, sort_order: 2 }]
    await prisma.$transaction(
      hallOrders.map(item =>
        prisma.hall.update({
          where: { id: item.id },
          data: { displayOrder: item.sort_order }
        })
      )
    );

    return { message: 'Halls reordered successfully' };
  }

  // ==================== TABLES ====================

  /**
   * Get all tables for a branch
   */
  async getTables(query, branchId, tenantPrisma = prisma) {
    const { hall_id, status, is_active } = query;

    const where = {}; // Don't filter by branchId for now due to data integrity issues

    if (hall_id) {
      where.hallId = parseInt(hall_id);
    }

    if (status) {
      where.status = status;
    }

    if (is_active !== undefined) {
      where.isActive = is_active === 'true' || is_active === true;
    }

    const tables = await tenantPrisma.table.findMany({
      where,
      orderBy: [
        { hall: { displayOrder: 'asc' } },
        { displayOrder: 'asc' }
      ],
      include: {
        hall: { select: { id: true, name: true } },
        heldOrders: {
          select: { id: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
          take: 1
        },
        _count: { select: { orders: true, heldOrders: true } }
      }
    });

    // Filter out tables with null branchId (data integrity issue)
    const validTables = tables.filter(table => table.branchId !== null);

    // Auto-fix: if a table is occupied without a valid reason, free it.
    // Valid reasons:
    // - occupied with currentOrderId pointing to a non-terminal order
    // - occupied because it has a held order
    const occupiedTables = validTables.filter(t => t.status === 'occupied');
    if (occupiedTables.length > 0) {
      const orderIds = occupiedTables
        .map(t => t.currentOrderId)
        .filter(id => id !== null);

      const orders = orderIds.length
        ? await tenantPrisma.order.findMany({
            where: { id: { in: orderIds } },
            select: { id: true, status: true }
          })
        : [];

      const orderStatusById = new Map(orders.map(o => [o.id, o.status]));
      const terminalStatuses = new Set(['completed', 'cancelled', 'invoiced', 'refunded']);

      const inconsistentIds = [];
      for (const table of occupiedTables) {
        const heldOrdersCount =
          table?._count?.heldOrders ?? (Array.isArray(table.heldOrders) ? table.heldOrders.length : 0);

        // Held table (no current order) is VALID
        if (!table.currentOrderId) {
          if (heldOrdersCount === 0) inconsistentIds.push(table.id);
          continue;
        }

        // Has currentOrderId: must exist and be non-terminal
        const st = orderStatusById.get(table.currentOrderId);
        if (!st || terminalStatuses.has(st)) {
          inconsistentIds.push(table.id);
        }
      }

      if (inconsistentIds.length > 0) {
        await tenantPrisma.table.updateMany({
          where: { id: { in: inconsistentIds }, status: 'occupied' },
          data: { status: 'available', currentOrderId: null }
        });

        // Keep response consistent even if caller caches the result
        for (const t of validTables) {
          if (inconsistentIds.includes(t.id)) {
            t.status = 'available';
            t.currentOrderId = null;
          }
        }
      }
    }

    return validTables.map(table => this.formatTableResponse(table));
  }

  /**
   * Get tables for POS floor plan
   */
  async getTablesForPOS(branchId) {
    const halls = await prisma.hall.findMany({
      where: { branchId, isActive: true },
      orderBy: { displayOrder: 'asc' },
      include: {
        tables: {
          where: { isActive: true },
          orderBy: { displayOrder: 'asc' },
          include: {
            orders: {
              where: { status: { in: ['pending', 'confirmed', 'preparing', 'ready'] } },
              select: { id: true, orderNumber: true, total: true, status: true }
            },
            heldOrders: {
              select: { id: true, name: true, subtotal: true }
            }
          }
        }
      }
    });

    return halls.map(hall => ({
      id: hall.id,
      name: hall.name,
      
      tables: hall.tables.map(table => ({
        id: table.id,
        name: table.name,
        capacity: table.capacity,
        status: table.status,
        shape: table.shape,
        position_x: table.positionX,
        position_y: table.positionY,
        active_orders: table.orders.map(o => ({
          id: o.id,
          order_number: o.orderNumber,
          total: Number(o.total),
          status: o.status
        })),
        held_orders: table.heldOrders.map(h => ({
          id: h.id,
          name: h.name,
          subtotal: Number(h.subtotal)
        }))
      }))
    }));
  }

  /**
   * Get table by ID
   */
  async getTableById(id, branchId) {
    const table = await prisma.table.findFirst({
      where: { id: parseInt(id), branchId },
      include: {
        hall: { select: { id: true, name: true } },
        orders: {
          where: { status: { in: ['pending', 'confirmed', 'preparing', 'ready'] } },
          include: {
            items: true,
            customer: { select: { id: true, name: true } }
          }
        },
        heldOrders: {
          include: {
            customer: { select: { id: true, name: true } }
          }
        }
      }
    });

    if (!table) {
      throw new NotFoundError('Table');
    }

    return {
      ...this.formatTableResponse(table),
      active_orders: table.orders.map(o => ({
        id: o.id,
        order_number: o.orderNumber,
        customer: o.customer,
        total: Number(o.total),
        status: o.status,
        items: o.items.map(i => ({
          id: i.id,
          product_name: i.productName,
          quantity: i.quantity,
          status: i.status
        }))
      })),
      held_orders: table.heldOrders.map(h => ({
        id: h.id,
        name: h.name,
        customer: h.customer,
        subtotal: Number(h.subtotal)
      }))
    };
  }

  /**
   * Create new table
   */
  async createTable(data, branchId) {
    const {
      hall_id,
      name,
      capacity = 4,
      shape = 'rectangle',
      position_x,
      position_y,
      sort_order,
      is_active = true
    } = data;

    // Validate hall exists
    const hall = await prisma.hall.findFirst({
      where: { id: hall_id, branchId }
    });

    if (!hall) {
      throw new NotFoundError('Hall');
    }

    // Get max sort order if not provided
    let displayOrder = sort_order;
    if (displayOrder === undefined) {
      const maxSort = await prisma.table.aggregate({
        where: { hallId: hall_id },
        _max: { displayOrder: true }
      });
      displayOrder = (maxSort._max.displayOrder || 0) + 1;
    }

    const table = await prisma.table.create({
      data: {
        branchId,
        hallId: hall_id,
        name,
        capacity,
        status: 'available',
        shape,
        positionX: position_x,
        positionY: position_y,
        displayOrder,
        isActive: is_active
      },
      include: {
        hall: { select: { id: true, name: true } }
      }
    });

    return this.formatTableResponse(table);
  }

  /**
   * Update table
   */
  async updateTable(id, data, branchId) {
    const table = await prisma.table.findFirst({
      where: { id: parseInt(id), branchId }
    });

    if (!table) {
      throw new NotFoundError('Table');
    }

    const {
      hall_id,
      name,
      capacity,
      shape,
      position_x,
      position_y,
      sort_order,
      is_active
    } = data;

    // Validate hall if changing
    if (hall_id && hall_id !== table.hallId) {
      const hall = await prisma.hall.findFirst({
        where: { id: hall_id, branchId }
      });

      if (!hall) {
        throw new NotFoundError('Hall');
      }
    }

    const updatedTable = await prisma.table.update({
      where: { id: parseInt(id) },
      data: {
        hallId: hall_id,
        name,
        capacity,
        shape,
        positionX: position_x,
        positionY: position_y,
        displayOrder: sort_order,
        isActive: is_active
      },
      include: {
        hall: { select: { id: true, name: true } }
      }
    });

    return this.formatTableResponse(updatedTable);
  }

  /**
   * Update table status
   */
  async updateTableStatus(id, status, branchId) {
    const table = await prisma.table.findFirst({
      where: { id: parseInt(id), branchId }
    });

    if (!table) {
      throw new NotFoundError('Table');
    }

    const validStatuses = ['available', 'occupied', 'reserved', 'cleaning', 'unavailable'];
    if (!validStatuses.includes(status)) {
      throw new AppError('Invalid table status', 400, 'INVALID_STATUS');
    }

    const updatedTable = await prisma.table.update({
      where: { id: parseInt(id) },
      data: { status }
    });

    return {
      id: updatedTable.id,
      status: updatedTable.status
    };
  }

  /**
   * Delete table
   */
  async deleteTable(id, branchId) {
    const table = await prisma.table.findFirst({
      where: { id: parseInt(id), branchId },
      include: {
        _count: { select: { orders: true } }
      }
    });

    if (!table) {
      throw new NotFoundError('Table');
    }

    // Check for active orders
    const activeOrders = await prisma.order.count({
      where: {
        tableId: parseInt(id),
        status: { in: ['pending', 'confirmed', 'preparing', 'ready'] }
      }
    });

    if (activeOrders > 0) {
      throw new AppError('Cannot delete table with active orders', 400, 'TABLE_HAS_ORDERS');
    }

    await prisma.table.delete({
      where: { id: parseInt(id) }
    });

    return { message: 'Table deleted successfully' };
  }

  /**
   * Bulk update table positions (for floor plan editor)
   */
  async updateTablePositions(positions, branchId) {
    // positions: [{ id: 1, position_x: 100, position_y: 200, rotation: 45 }, ...]
    await prisma.$transaction(
      positions.map(item =>
        prisma.table.update({
          where: { id: item.id },
          data: {
            positionX: item.position_x,
            positionY: item.position_y,
            rotation: item.rotation
          }
        })
      )
    );

    return { message: 'Table positions updated successfully' };
  }

  /**
   * Merge tables (link multiple tables for large party)
   */
  async mergeTables(tableIds, branchId) {
    // Validate all tables exist and are available
    const tables = await prisma.table.findMany({
      where: {
        id: { in: tableIds },
        branchId
      }
    });

    if (tables.length !== tableIds.length) {
      throw new AppError('One or more tables not found', 400, 'TABLES_NOT_FOUND');
    }

    const unavailable = tables.filter(t => t.status !== 'available');
    if (unavailable.length > 0) {
      throw new AppError(`Tables ${unavailable.map(t => t.number).join(', ')} are not available`, 400, 'TABLES_UNAVAILABLE');
    }

    // Mark all as occupied
    await prisma.table.updateMany({
      where: { id: { in: tableIds } },
      data: { status: 'occupied' }
    });

    return {
      message: 'Tables merged successfully',
      tables: tables.map(t => ({ id: t.id, number: t.number }))
    };
  }

  /**
   * Free multiple tables
   */
  async freeTables(tableIds, branchId) {
    await prisma.table.updateMany({
      where: {
        id: { in: tableIds },
        branchId
      },
      data: { status: 'available' }
    });

    return { message: 'Tables freed successfully' };
  }

  /**
   * Get table statistics
   */
  async getTableStats(branchId) {
    const tables = await prisma.table.findMany({
      where: { branchId, isActive: true }
    });

    const stats = {
      total: tables.length,
      available: tables.filter(t => t.status === 'available').length,
      occupied: tables.filter(t => t.status === 'occupied').length,
      reserved: tables.filter(t => t.status === 'reserved').length,
      cleaning: tables.filter(t => t.status === 'cleaning').length,
      unavailable: tables.filter(t => t.status === 'unavailable').length,
      total_capacity: tables.reduce((sum, t) => sum + t.capacity, 0),
      available_capacity: tables
        .filter(t => t.status === 'available')
        .reduce((sum, t) => sum + t.capacity, 0)
    };

    return stats;
  }

  /**
   * Format table response
   */
  formatTableResponse(table) {
    const heldOrdersCount =
      table?._count?.heldOrders ?? (Array.isArray(table.heldOrders) ? table.heldOrders.length : 0);

    const latestHeldOrderId = Array.isArray(table.heldOrders) && table.heldOrders.length > 0
      ? table.heldOrders[0].id
      : null;

    let occupiedReason = null;
    if (table.status === 'occupied') {
      if (table.currentOrderId) occupiedReason = 'order';
      else if (heldOrdersCount > 0) occupiedReason = 'hold';
      else occupiedReason = 'unknown';
    }

    return {
      id: table.id,
      hall: table.hall,
      name: table.name,
      capacity: table.capacity,
      status: table.status,
      shape: table.shape,
      position_x: table.positionX,
      position_y: table.positionY,
      is_active: table.isActive,
      sort_order: table.displayOrder,
      orders_count: table._count?.orders || 0,
      current_order_id: table.currentOrderId,
      held_orders_count: heldOrdersCount,
      held_order_id: latestHeldOrderId,
      occupied_reason: occupiedReason,
      created_at: table.createdAt,
      updated_at: table.updatedAt
    };
  }

  /**
   * Fix table status inconsistencies
   * Tables marked as occupied but with no currentOrderId or pointing to completed/cancelled orders should be available
   */
  async fixTableStatusInconsistencies(branchId, tenantPrisma = prisma) {
    // Find ALL tables with occupied status
    const allOccupiedTables = await tenantPrisma.table.findMany({
      where: { status: 'occupied' }
    });

    console.log('All occupied tables:', allOccupiedTables.length, allOccupiedTables.map(t => ({ id: t.id, status: t.status, currentOrderId: t.currentOrderId })));

    if (allOccupiedTables.length === 0) {
      return { 
        message: 'No occupied tables found',
        found: 0,
        totalOccupied: 0,
        fixed: 0,
        tables: []
      };
    }

    const occupiedTableIds = allOccupiedTables.map(t => t.id);

    // Held orders reserve a table without setting currentOrderId.
    const heldOrders = await tenantPrisma.heldOrder.findMany({
      where: {
        tableId: { in: occupiedTableIds }
      },
      select: { id: true, tableId: true }
    });
    const heldTableIdSet = new Set(heldOrders.map(h => h.tableId).filter(Boolean));

    // Get all currentOrderIds that are not null
    const orderIds = allOccupiedTables
      .map(t => t.currentOrderId)
      .filter(id => id !== null);

    // Query orders to check their status
    const orders = orderIds.length
      ? await tenantPrisma.order.findMany({
          where: { id: { in: orderIds } },
          select: { id: true, status: true }
        })
      : [];

    const orderStatusMap = new Map(orders.map(o => [o.id, o.status]));

    // Find tables that are occupied but should be available
    const inconsistentTables = allOccupiedTables.filter(table => {
      // No currentOrderId: only inconsistent if there is ALSO no held order for this table
      if (!table.currentOrderId) {
        return !heldTableIdSet.has(table.id);
      }

      // Has currentOrderId: inconsistent if order is missing or in a terminal state
      const orderStatus = orderStatusMap.get(table.currentOrderId);
      if (!orderStatus) return true;
      if (['completed', 'cancelled', 'invoiced', 'refunded'].includes(orderStatus)) return true;

      return false;
    });

    console.log('Found inconsistent tables:', inconsistentTables.length, inconsistentTables.map(t => ({ id: t.id, status: t.status, currentOrderId: t.currentOrderId, orderStatus: orderStatusMap.get(t.currentOrderId) })));

    // Actually fix the inconsistencies
    if (inconsistentTables.length > 0) {
      // Update these tables to available status
      await tenantPrisma.table.updateMany({
        where: {
          id: { in: inconsistentTables.map(t => t.id) }
        },
        data: { status: 'available', currentOrderId: null }
      });
    }

    return { 
      message: `Found ${inconsistentTables.length} inconsistent table(s) out of ${allOccupiedTables.length} occupied tables`,
      found: inconsistentTables.length,
      totalOccupied: allOccupiedTables.length,
      fixed: inconsistentTables.length,
      tables: inconsistentTables.map(t => ({ id: t.id, number: t.number }))
    };

    // Update these tables to available status
    await prisma.table.updateMany({
      where: {
        id: { in: inconsistentTables.map(t => t.id) },
        branchId
      },
      data: { status: 'available' }
    });

    return {
      message: `Fixed ${inconsistentTables.length} inconsistent table(s)`,
      fixed: inconsistentTables.length,
      tables: inconsistentTables.map(t => ({ id: t.id, number: t.number }))
    };
  }

  /**
   * Get table statistics with consistency check
   */
  async getTableStatsWithConsistency(branchId, tenantPrisma = prisma) {
    const stats = await this.getTableStats(branchId);

    // Check for inconsistencies using the same rules as fixTableStatusInconsistencies.
    const occupiedTables = await tenantPrisma.table.findMany({
      where: { status: 'occupied' },
      select: { id: true, currentOrderId: true }
    });

    if (occupiedTables.length === 0) {
      return {
        ...stats,
        inconsistencies: 0,
        needsCleanup: false
      };
    }

    const occupiedTableIds = occupiedTables.map(t => t.id);
    const heldOrders = await tenantPrisma.heldOrder.findMany({
      where: { tableId: { in: occupiedTableIds } },
      select: { tableId: true }
    });
    const heldTableIdSet = new Set(heldOrders.map(h => h.tableId).filter(Boolean));

    const orderIds = occupiedTables
      .map(t => t.currentOrderId)
      .filter(id => id !== null);

    const orders = orderIds.length
      ? await tenantPrisma.order.findMany({
          where: { id: { in: orderIds } },
          select: { id: true, status: true }
        })
      : [];

    const orderStatusMap = new Map(orders.map(o => [o.id, o.status]));

    const inconsistentCount = occupiedTables.reduce((count, table) => {
      if (!table.currentOrderId) {
        return count + (heldTableIdSet.has(table.id) ? 0 : 1);
      }
      const status = orderStatusMap.get(table.currentOrderId);
      if (!status) return count + 1;
      if (['completed', 'cancelled', 'invoiced', 'refunded'].includes(status)) return count + 1;
      return count;
    }, 0);

    return {
      ...stats,
      inconsistencies: inconsistentCount,
      needsCleanup: inconsistentCount > 0
    };
  }
}

module.exports = new TableService();
