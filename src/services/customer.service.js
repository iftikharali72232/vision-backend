const prisma = require('../config/database');
const { pagination: paginationConfig } = require('../config/constants');
const { NotFoundError, ConflictError, BadRequestError } = require('../middlewares/errorHandler');

class CustomerService {
  /**
   * Get paginated list of customers
   */
  async getCustomers(query, branchId) {
    const {
      page = paginationConfig.defaultPage,
      per_page = paginationConfig.defaultPerPage,
      search,
      is_active,
      sort_by = 'created_at',
      sort_order = 'desc'
    } = query;

    const skip = (page - 1) * per_page;
    const take = Math.min(per_page, paginationConfig.maxPerPage);

    const where = { branchId };

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
        { phone: { contains: search } }
      ];
    }

    if (is_active !== undefined) {
      where.isActive = is_active === 'true' || is_active === true;
    }

    // Build order by
    const orderBy = {};
    switch (sort_by) {
      case 'name':
        orderBy.name = sort_order;
        break;
      case 'total_purchases':
      case 'total_spent':
        orderBy.totalSpent = sort_order;
        break;
      case 'loyalty_points':
        orderBy.loyaltyPoints = sort_order;
        break;
      default:
        orderBy.createdAt = sort_order;
    }

    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        skip,
        take,
        orderBy
      }),
      prisma.customer.count({ where })
    ]);

    const items = customers.map(customer => ({
      id: customer.id,
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      address: customer.address,
      city: customer.city,
      tax_number: customer.taxNumber,
      loyalty_points: customer.loyaltyPoints,
      total_orders: customer.totalOrders,
      total_spent: Number(customer.totalSpent),
      is_active: customer.isActive,
      last_order_at: customer.lastOrderAt,
      created_at: customer.createdAt
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
   * Search customers (for POS)
   */
  async searchCustomers(q, branchId, limit = 10) {
    const customers = await prisma.customer.findMany({
      where: {
        branchId,
        isActive: true,
        OR: [
          { name: { contains: q } },
          { email: { contains: q } },
          { phone: { contains: q } }
        ]
      },
      take: limit,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        loyaltyPoints: true
      }
    });

    return customers.map(c => ({
      id: c.id,
      name: c.name,
      email: c.email,
      phone: c.phone,
      loyalty_points: c.loyaltyPoints
    }));
  }

  /**
   * Get customer by ID
   */
  async getCustomerById(id, branchId) {
    const customer = await prisma.customer.findFirst({
      where: { 
        id: parseInt(id),
        branchId 
      },
      include: {
        orders: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            orderNumber: true,
            total: true,
            status: true,
            orderType: true,
            createdAt: true
          }
        }
      }
    });

    if (!customer) {
      throw new NotFoundError('Customer');
    }

    const avgOrderValue = customer.totalOrders > 0 
      ? Number(customer.totalSpent) / customer.totalOrders 
      : 0;

    return {
      id: customer.id,
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      address: customer.address,
      city: customer.city,
      tax_number: customer.taxNumber,
      notes: customer.notes,
      loyalty_points: customer.loyaltyPoints,
      total_orders: customer.totalOrders,
      total_spent: Number(customer.totalSpent),
      average_order_value: avgOrderValue,
      is_active: customer.isActive,
      last_order_at: customer.lastOrderAt,
      recent_orders: customer.orders.map(order => ({
        id: order.id,
        order_number: order.orderNumber,
        total: Number(order.total),
        status: order.status,
        order_type: order.orderType,
        created_at: order.createdAt
      })),
      created_at: customer.createdAt,
      updated_at: customer.updatedAt
    };
  }

  /**
   * Get customer orders
   */
  async getCustomerOrders(customerId, query, branchId) {
    const {
      page = 1,
      per_page = 20
    } = query;

    const skip = (page - 1) * per_page;
    const take = Math.min(per_page, 100);

    // Verify customer belongs to branch
    const customer = await prisma.customer.findFirst({
      where: { id: parseInt(customerId), branchId }
    });

    if (!customer) {
      throw new NotFoundError('Customer');
    }

    const where = { customerId: parseInt(customerId) };

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          branch: { select: { id: true, name: true } },
          _count: { select: { items: true } }
        }
      }),
      prisma.order.count({ where })
    ]);

    const items = orders.map(order => ({
      id: order.id,
      order_number: order.orderNumber,
      order_type: order.orderType,
      subtotal: Number(order.subtotal),
      tax: Number(order.tax),
      discount: Number(order.discount),
      total: Number(order.total),
      payment_status: order.paymentStatus,
      status: order.status,
      branch: order.branch,
      items_count: order._count.items,
      created_at: order.createdAt
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
   * Create new customer
   */
  async createCustomer(data, branchId) {
    const { name, email, phone, address, city, tax_number, notes } = data;

    // Check email uniqueness if provided (within branch)
    if (email) {
      const existingCustomer = await prisma.customer.findFirst({
        where: { branchId, email }
      });
      if (existingCustomer) {
        throw new ConflictError('Customer with this email already exists');
      }
    }

    // Check phone uniqueness if provided (within branch)
    if (phone) {
      const existingCustomer = await prisma.customer.findFirst({
        where: { branchId, phone }
      });
      if (existingCustomer) {
        throw new ConflictError('Customer with this phone already exists');
      }
    }

    const customer = await prisma.customer.create({
      data: {
        branchId,
        name,
        email,
        phone,
        address,
        city,
        taxNumber: tax_number,
        notes
      }
    });

    return {
      id: customer.id,
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      address: customer.address,
      city: customer.city,
      tax_number: customer.taxNumber,
      notes: customer.notes,
      loyalty_points: customer.loyaltyPoints,
      total_orders: customer.totalOrders,
      total_spent: Number(customer.totalSpent),
      is_active: customer.isActive,
      created_at: customer.createdAt
    };
  }

  /**
   * Update customer
   */
  async updateCustomer(id, data, branchId) {
    const customerId = parseInt(id);
    const { name, email, phone, address, city, tax_number, notes, is_active } = data;

    const existingCustomer = await prisma.customer.findFirst({
      where: { id: customerId, branchId }
    });

    if (!existingCustomer) {
      throw new NotFoundError('Customer');
    }

    // Check email uniqueness if changing
    if (email && email !== existingCustomer.email) {
      const emailTaken = await prisma.customer.findFirst({
        where: { branchId, email, NOT: { id: customerId } }
      });
      if (emailTaken) {
        throw new ConflictError('Email is already taken');
      }
    }

    // Check phone uniqueness if changing
    if (phone && phone !== existingCustomer.phone) {
      const phoneTaken = await prisma.customer.findFirst({
        where: { branchId, phone, NOT: { id: customerId } }
      });
      if (phoneTaken) {
        throw new ConflictError('Phone is already taken');
      }
    }

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone;
    if (address !== undefined) updateData.address = address;
    if (city !== undefined) updateData.city = city;
    if (tax_number !== undefined) updateData.taxNumber = tax_number;
    if (notes !== undefined) updateData.notes = notes;
    if (is_active !== undefined) updateData.isActive = is_active;

    const customer = await prisma.customer.update({
      where: { id: customerId },
      data: updateData
    });

    return {
      id: customer.id,
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      address: customer.address,
      city: customer.city,
      tax_number: customer.taxNumber,
      notes: customer.notes,
      loyalty_points: customer.loyaltyPoints,
      is_active: customer.isActive,
      updated_at: customer.updatedAt
    };
  }

  /**
   * Delete customer
   */
  async deleteCustomer(id, branchId) {
    const customerId = parseInt(id);

    const customer = await prisma.customer.findFirst({
      where: { id: customerId, branchId }
    });

    if (!customer) {
      throw new NotFoundError('Customer');
    }

    // Check if customer has orders
    const orderCount = await prisma.order.count({
      where: { customerId }
    });

    if (orderCount > 0) {
      // Soft delete by deactivating
      await prisma.customer.update({
        where: { id: customerId },
        data: { isActive: false }
      });
      return { message: 'Customer deactivated (has order history)' };
    }

    await prisma.customer.delete({
      where: { id: customerId }
    });

    return { message: 'Customer deleted successfully' };
  }

  // ==================== LOYALTY POINTS ====================

  /**
   * Get customer loyalty points
   */
  async getLoyaltyPoints(id, branchId) {
    const customer = await prisma.customer.findFirst({
      where: { id: parseInt(id), branchId },
      select: {
        id: true,
        name: true,
        loyaltyPoints: true,
        totalOrders: true,
        totalSpent: true
      }
    });

    if (!customer) {
      throw new NotFoundError('Customer');
    }

    return {
      customer_id: customer.id,
      customer_name: customer.name,
      loyalty_points: customer.loyaltyPoints,
      total_orders: customer.totalOrders,
      total_spent: Number(customer.totalSpent),
      points_value: customer.loyaltyPoints * 0.01 // 1 point = $0.01
    };
  }

  /**
   * Add loyalty points
   */
  async addLoyaltyPoints(id, data, branchId) {
    const { points, reason } = data;

    if (!points || points <= 0) {
      throw new BadRequestError('Points must be a positive number');
    }

    const customer = await prisma.customer.findFirst({
      where: { id: parseInt(id), branchId }
    });

    if (!customer) {
      throw new NotFoundError('Customer');
    }

    const updated = await prisma.customer.update({
      where: { id: parseInt(id) },
      data: {
        loyaltyPoints: { increment: parseInt(points) }
      }
    });

    return {
      customer_id: updated.id,
      previous_points: customer.loyaltyPoints,
      points_added: parseInt(points),
      new_balance: updated.loyaltyPoints,
      reason
    };
  }

  /**
   * Deduct loyalty points
   */
  async deductLoyaltyPoints(id, data, branchId) {
    const { points, reason } = data;

    if (!points || points <= 0) {
      throw new BadRequestError('Points must be a positive number');
    }

    const customer = await prisma.customer.findFirst({
      where: { id: parseInt(id), branchId }
    });

    if (!customer) {
      throw new NotFoundError('Customer');
    }

    if (customer.loyaltyPoints < points) {
      throw new BadRequestError('Insufficient loyalty points');
    }

    const updated = await prisma.customer.update({
      where: { id: parseInt(id) },
      data: {
        loyaltyPoints: { decrement: parseInt(points) }
      }
    });

    return {
      customer_id: updated.id,
      previous_points: customer.loyaltyPoints,
      points_deducted: parseInt(points),
      new_balance: updated.loyaltyPoints,
      reason
    };
  }

  /**
   * Redeem loyalty points for discount
   */
  async redeemLoyaltyPoints(id, data, branchId) {
    const { points } = data;
    const pointValue = 0.01; // 1 point = $0.01

    if (!points || points <= 0) {
      throw new BadRequestError('Points must be a positive number');
    }

    const customer = await prisma.customer.findFirst({
      where: { id: parseInt(id), branchId }
    });

    if (!customer) {
      throw new NotFoundError('Customer');
    }

    if (customer.loyaltyPoints < points) {
      throw new BadRequestError('Insufficient loyalty points');
    }

    const discountAmount = points * pointValue;

    const updated = await prisma.customer.update({
      where: { id: parseInt(id) },
      data: {
        loyaltyPoints: { decrement: parseInt(points) }
      }
    });

    return {
      customer_id: updated.id,
      points_redeemed: parseInt(points),
      discount_amount: discountAmount,
      remaining_points: updated.loyaltyPoints
    };
  }

  /**
   * Calculate points to earn from order total
   */
  calculateEarnedPoints(orderTotal, pointsPerDollar = 1) {
    return Math.floor(Number(orderTotal) * pointsPerDollar);
  }

  // ==================== STATS UPDATES ====================

  /**
   * Update customer stats after order
   */
  async updateCustomerStats(customerId, orderTotal, earnPoints = true) {
    const customer = await prisma.customer.findUnique({
      where: { id: customerId }
    });

    if (!customer) return;

    const pointsEarned = earnPoints ? this.calculateEarnedPoints(orderTotal) : 0;

    await prisma.customer.update({
      where: { id: customerId },
      data: {
        totalOrders: { increment: 1 },
        totalSpent: { increment: parseFloat(orderTotal) },
        loyaltyPoints: { increment: pointsEarned },
        lastOrderAt: new Date()
      }
    });

    return {
      points_earned: pointsEarned,
      new_total_orders: customer.totalOrders + 1,
      new_total_spent: Number(customer.totalSpent) + parseFloat(orderTotal)
    };
  }

  /**
   * Reverse customer stats on order cancellation
   */
  async reverseCustomerStats(customerId, orderTotal, pointsToDeduct = 0) {
    const customer = await prisma.customer.findUnique({
      where: { id: customerId }
    });

    if (!customer) return;

    await prisma.customer.update({
      where: { id: customerId },
      data: {
        totalOrders: { decrement: 1 },
        totalSpent: { decrement: parseFloat(orderTotal) },
        loyaltyPoints: { decrement: Math.min(pointsToDeduct, customer.loyaltyPoints) }
      }
    });
  }

  // ==================== BULK OPERATIONS ====================

  /**
   * Import customers from CSV data
   */
  async importCustomers(customers, branchId) {
    const results = {
      imported: 0,
      skipped: 0,
      errors: []
    };

    for (const customer of customers) {
      try {
        // Check for existing
        const existing = await prisma.customer.findFirst({
          where: {
            branchId,
            OR: [
              customer.email ? { email: customer.email } : undefined,
              customer.phone ? { phone: customer.phone } : undefined
            ].filter(Boolean)
          }
        });

        if (existing) {
          results.skipped++;
          continue;
        }

        await prisma.customer.create({
          data: {
            branchId,
            name: customer.name,
            email: customer.email,
            phone: customer.phone,
            address: customer.address,
            city: customer.city,
            taxNumber: customer.tax_number,
            notes: customer.notes
          }
        });

        results.imported++;
      } catch (error) {
        results.errors.push({
          customer: customer.name || customer.email,
          error: error.message
        });
      }
    }

    return results;
  }

  /**
   * Export customers
   */
  async exportCustomers(branchId, format = 'json') {
    const customers = await prisma.customer.findMany({
      where: { branchId },
      orderBy: { name: 'asc' }
    });

    return customers.map(c => ({
      name: c.name,
      email: c.email,
      phone: c.phone,
      address: c.address,
      city: c.city,
      tax_number: c.taxNumber,
      loyalty_points: c.loyaltyPoints,
      total_orders: c.totalOrders,
      total_spent: Number(c.totalSpent),
      is_active: c.isActive
    }));
  }

  /**
   * Get customer statistics
   */
  async getCustomerStats(branchId) {
    const [
      totalCustomers,
      activeCustomers,
      customersWithOrders,
      totalLoyaltyPoints,
      topCustomers
    ] = await Promise.all([
      prisma.customer.count({ where: { branchId } }),
      prisma.customer.count({ where: { branchId, isActive: true } }),
      prisma.customer.count({ where: { branchId, totalOrders: { gt: 0 } } }),
      prisma.customer.aggregate({
        where: { branchId },
        _sum: { loyaltyPoints: true }
      }),
      prisma.customer.findMany({
        where: { branchId, totalOrders: { gt: 0 } },
        orderBy: { totalSpent: 'desc' },
        take: 5,
        select: {
          id: true,
          name: true,
          totalOrders: true,
          totalSpent: true
        }
      })
    ]);

    return {
      total_customers: totalCustomers,
      active_customers: activeCustomers,
      customers_with_orders: customersWithOrders,
      total_loyalty_points: totalLoyaltyPoints._sum.loyaltyPoints || 0,
      top_customers: topCustomers.map(c => ({
        id: c.id,
        name: c.name,
        total_orders: c.totalOrders,
        total_spent: Number(c.totalSpent)
      }))
    };
  }
}

module.exports = new CustomerService();
