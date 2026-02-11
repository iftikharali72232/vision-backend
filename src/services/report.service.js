const { Prisma } = require('@prisma/client');
const prisma = require('../config/database');

class ReportService {
  /**
   * Sales Report
   */
  async getSalesReport(query, branchId = null) {
    const { date_from, date_to, group_by = 'day', user_id, payment_method } = query;

    const startDate = new Date(date_from);
    startDate.setHours(0, 0, 0, 0);
    
    const endDate = new Date(date_to);
    endDate.setHours(23, 59, 59, 999);

    const where = {
      status: 'completed',
      createdAt: {
        gte: startDate,
        lte: endDate
      }
    };

    if (branchId) where.branchId = branchId;
    if (user_id) where.userId = parseInt(user_id);
    if (payment_method) where.paymentMethod = payment_method;

    // Get summary
    const summary = await prisma.order.aggregate({
      where,
      _sum: {
        total: true,
        taxAmount: true,
        discountAmount: true
      },
      _count: true
    });

    // Get items sold count
    const itemsSold = await prisma.orderItem.aggregate({
      where: { order: where },
      _sum: { quantity: true }
    });

    // Get payment breakdown
    const paymentBreakdown = await prisma.order.groupBy({
      by: ['paymentMethod'],
      where,
      _sum: { total: true }
    });

    const paymentStats = {
      cash: 0,
      card: 0,
      split: 0
    };
    paymentBreakdown.forEach(p => {
      paymentStats[p.paymentMethod] = Number(p._sum.total);
    });

    // Get daily/weekly/monthly breakdown
    const orders = await prisma.order.findMany({
      where,
      select: {
        total: true,
        taxAmount: true,
        discountAmount: true,
        createdAt: true
      },
      orderBy: { createdAt: 'asc' }
    });

    const groupedData = this.groupOrdersByPeriod(orders, group_by);

    const totalSales = Number(summary._sum.total || 0);
    const totalTax = Number(summary._sum.taxAmount || 0);
    const totalDiscounts = Number(summary._sum.discountAmount || 0);

    return {
      summary: {
        total_sales: totalSales,
        total_orders: summary._count,
        total_items_sold: Number(itemsSold._sum.quantity || 0),
        average_order_value: summary._count > 0 ? totalSales / summary._count : 0,
        total_tax: totalTax,
        total_discounts: totalDiscounts,
        net_sales: totalSales - totalTax,
        payment_breakdown: paymentStats
      },
      data: groupedData
    };
  }

  /**
   * Product Sales Report
   */
  async getProductReport(query, branchId = null) {
    const { date_from, date_to, category_id, sort_by = 'quantity', sort_order = 'desc' } = query;

    const startDate = new Date(date_from);
    startDate.setHours(0, 0, 0, 0);
    
    const endDate = new Date(date_to);
    endDate.setHours(23, 59, 59, 999);

    const orderWhere = {
      status: 'completed',
      createdAt: {
        gte: startDate,
        lte: endDate
      }
    };

    if (branchId) orderWhere.branchId = branchId;

    let orderByField;
    switch (sort_by) {
      case 'revenue':
        orderByField = 'revenue';
        break;
      case 'profit':
        orderByField = 'profit';
        break;
      default:
        orderByField = 'quantity_sold';
    }

    // Raw query for better performance with complex aggregations
    const products = await prisma.$queryRaw`
      SELECT 
        p.id as product_id,
        p.name as product_name,
        p.sku as product_sku,
        c.name as category,
        SUM(oi.quantity) as quantity_sold,
        SUM(oi.subtotal) as revenue,
        SUM(oi.quantity * p.cost_price) as cost,
        SUM(oi.subtotal) - SUM(oi.quantity * p.cost_price) as profit
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      JOIN products p ON oi.product_id = p.id
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE o.status = 'completed'
      AND o.created_at >= ${startDate}
      AND o.created_at <= ${endDate}
      ${branchId ? Prisma.sql`AND o.branch_id = ${branchId}` : Prisma.empty}
      ${category_id ? Prisma.sql`AND p.category_id = ${parseInt(category_id)}` : Prisma.empty}
      GROUP BY p.id, p.name, p.sku, c.name
      ORDER BY ${Prisma.raw(orderByField)} ${Prisma.raw(sort_order.toUpperCase())}
    `;

    const items = products.map(p => {
      const revenue = Number(p.revenue);
      const cost = Number(p.cost);
      const profit = revenue - cost;
      const profitMargin = revenue > 0 ? (profit / revenue) * 100 : 0;

      return {
        product_id: p.product_id,
        product_name: p.product_name,
        product_sku: p.product_sku,
        category: p.category,
        quantity_sold: Number(p.quantity_sold),
        revenue,
        cost,
        profit,
        profit_margin: Math.round(profitMargin * 100) / 100
      };
    });

    return {
      items,
      pagination: {
        current_page: 1,
        per_page: items.length,
        total_pages: 1,
        total_items: items.length
      }
    };
  }

  /**
   * Cashier Report
   */
  async getCashierReport(query, branchId = null) {
    const { date_from, date_to } = query;

    const startDate = new Date(date_from);
    startDate.setHours(0, 0, 0, 0);
    
    const endDate = new Date(date_to);
    endDate.setHours(23, 59, 59, 999);

    const where = {
      createdAt: {
        gte: startDate,
        lte: endDate
      }
    };

    if (branchId) where.branchId = branchId;

    const cashierStats = await prisma.$queryRaw`
      SELECT 
        u.id as user_id,
        u.name as user_name,
        SUM(CASE WHEN o.status = 'completed' THEN o.total ELSE 0 END) as total_sales,
        COUNT(CASE WHEN o.status = 'completed' THEN 1 END) as total_orders,
        SUM(CASE WHEN o.status = 'completed' THEN o.discount_amount ELSE 0 END) as total_discounts_given,
        COUNT(CASE WHEN o.status = 'cancelled' THEN 1 END) as cancelled_orders,
        COUNT(CASE WHEN o.status = 'refunded' THEN 1 END) as refunded_orders
      FROM users u
      LEFT JOIN orders o ON u.id = o.user_id
        AND o.created_at >= ${startDate}
        AND o.created_at <= ${endDate}
        ${branchId ? Prisma.sql`AND o.branch_id = ${branchId}` : Prisma.empty}
      WHERE u.role IN ('cashier', 'manager', 'admin')
      GROUP BY u.id, u.name
      HAVING COUNT(o.id) > 0
      ORDER BY total_sales DESC
    `;

    return cashierStats.map(stat => {
      const totalSales = Number(stat.total_sales || 0);
      const totalOrders = Number(stat.total_orders || 0);

      return {
        user_id: stat.user_id,
        user_name: stat.user_name,
        total_sales: totalSales,
        total_orders: totalOrders,
        average_order_value: totalOrders > 0 ? totalSales / totalOrders : 0,
        total_discounts_given: Number(stat.total_discounts_given || 0),
        cancelled_orders: Number(stat.cancelled_orders || 0),
        refunded_orders: Number(stat.refunded_orders || 0)
      };
    });
  }

  /**
   * Inventory Report
   */
  async getInventoryReport(query, branchId = null) {
    const { category_id, stock_status = 'all' } = query;

    let products = await prisma.product.findMany({
      where: {
        isActive: true,
        ...(category_id && { categoryId: parseInt(category_id) })
      },
      include: {
        category: { select: { name: true } },
        stocks: branchId ? {
          where: { branchId },
          select: { stockQuantity: true }
        } : {
          select: { stockQuantity: true }
        }
      }
    });

    // Calculate totals and filter
    let items = products.map(p => {
      const stockQuantity = p.stocks.reduce((sum, s) => sum + s.stockQuantity, 0);
      const stockValue = stockQuantity * Number(p.costPrice);
      
      let status = 'in_stock';
      if (stockQuantity === 0) {
        status = 'out_of_stock';
      } else if (stockQuantity <= p.lowStockThreshold) {
        status = 'low_stock';
      }

      return {
        product_id: p.id,
        product_name: p.name,
        product_sku: p.sku,
        category: p.category?.name || 'Uncategorized',
        stock_quantity: stockQuantity,
        low_stock_threshold: p.lowStockThreshold,
        cost_price: Number(p.costPrice),
        stock_value: stockValue,
        status
      };
    });

    // Filter by stock status
    if (stock_status === 'low') {
      items = items.filter(i => i.status === 'low_stock');
    } else if (stock_status === 'out') {
      items = items.filter(i => i.status === 'out_of_stock');
    }

    // Calculate summary
    const summary = {
      total_products: items.length,
      total_stock_value: items.reduce((sum, i) => sum + i.stock_value, 0),
      low_stock_count: items.filter(i => i.status === 'low_stock').length,
      out_of_stock_count: items.filter(i => i.status === 'out_of_stock').length
    };

    return {
      summary,
      items,
      pagination: {
        current_page: 1,
        per_page: items.length,
        total_pages: 1,
        total_items: items.length
      }
    };
  }

  /**
   * Export Report (generates data for export)
   */
  async exportReport(query, branchId = null) {
    const { report_type, format, date_from, date_to } = query;

    let data;
    
    switch (report_type) {
      case 'sales':
        data = await this.getSalesReport({ date_from, date_to }, branchId);
        break;
      case 'products':
        data = await this.getProductReport({ date_from, date_to }, branchId);
        break;
      case 'cashiers':
        data = await this.getCashierReport({ date_from, date_to }, branchId);
        break;
      case 'inventory':
        data = await this.getInventoryReport({}, branchId);
        break;
      default:
        throw new Error('Invalid report type');
    }

    // For now, return JSON - actual file generation would require additional libraries
    return {
      format,
      report_type,
      generated_at: new Date().toISOString(),
      data
    };
  }

  /**
   * Group orders by time period
   */
  groupOrdersByPeriod(orders, groupBy) {
    const grouped = {};

    orders.forEach(order => {
      const date = new Date(order.createdAt);
      let key;

      switch (groupBy) {
        case 'day':
          key = date.toISOString().split('T')[0];
          break;
        case 'week':
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          key = weekStart.toISOString().split('T')[0];
          break;
        case 'month':
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          break;
        default:
          key = date.toISOString().split('T')[0];
      }

      if (!grouped[key]) {
        grouped[key] = {
          date: key,
          sales: 0,
          orders: 0,
          items_sold: 0,
          tax: 0,
          discounts: 0
        };
      }

      grouped[key].sales += Number(order.total);
      grouped[key].orders += 1;
      grouped[key].tax += Number(order.taxAmount);
      grouped[key].discounts += Number(order.discountAmount);
    });

    return Object.values(grouped);
  }

  /**
   * Get Sales Summary
   */
  async getSalesSummary(query, branchId = null) {
    const { date_from, date_to } = query;

    const startDate = new Date(date_from || new Date().setDate(new Date().getDate() - 30));
    startDate.setHours(0, 0, 0, 0);
    
    const endDate = new Date(date_to || new Date());
    endDate.setHours(23, 59, 59, 999);

    const where = {
      status: 'completed',
      createdAt: { gte: startDate, lte: endDate }
    };
    if (branchId) where.branchId = branchId;

    const summary = await prisma.order.aggregate({
      where,
      _sum: { total: true, taxAmount: true, discountAmount: true },
      _count: true
    });

    const itemsSold = await prisma.orderItem.aggregate({
      where: { order: where },
      _sum: { quantity: true }
    });

    const totalSales = Number(summary._sum.total || 0);
    const totalTax = Number(summary._sum.taxAmount || 0);
    const totalDiscounts = Number(summary._sum.discountAmount || 0);

    return {
      total_sales: totalSales,
      total_orders: summary._count,
      total_items_sold: Number(itemsSold._sum.quantity || 0),
      average_order_value: summary._count > 0 ? totalSales / summary._count : 0,
      total_tax: totalTax,
      total_discounts: totalDiscounts,
      net_sales: totalSales - totalTax,
      period: { from: startDate.toISOString(), to: endDate.toISOString() }
    };
  }

  /**
   * Get Daily Sales
   */
  async getDailySales(query, branchId = null) {
    const { date_from, date_to } = query;

    const startDate = new Date(date_from || new Date().setDate(new Date().getDate() - 7));
    startDate.setHours(0, 0, 0, 0);
    
    const endDate = new Date(date_to || new Date());
    endDate.setHours(23, 59, 59, 999);

    const where = {
      status: 'completed',
      createdAt: { gte: startDate, lte: endDate }
    };
    if (branchId) where.branchId = branchId;

    const orders = await prisma.order.findMany({
      where,
      select: { total: true, taxAmount: true, discountAmount: true, createdAt: true }
    });

    return this.groupOrdersByPeriod(orders, 'day');
  }

  /**
   * Get Category Sales
   */
  async getCategorySales(query, branchId = null) {
    const { date_from, date_to } = query;

    const startDate = new Date(date_from || new Date().setDate(new Date().getDate() - 30));
    startDate.setHours(0, 0, 0, 0);
    
    const endDate = new Date(date_to || new Date());
    endDate.setHours(23, 59, 59, 999);

    const orderWhere = {
      status: 'completed',
      createdAt: { gte: startDate, lte: endDate }
    };
    if (branchId) orderWhere.branchId = branchId;

    const categories = await prisma.$queryRaw`
      SELECT 
        c.id as category_id,
        c.name as category_name,
        SUM(oi.quantity) as quantity_sold,
        SUM(oi.subtotal) as revenue
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      JOIN products p ON oi.product_id = p.id
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE o.status = 'completed'
      AND o.created_at >= ${startDate}
      AND o.created_at <= ${endDate}
      ${branchId ? Prisma.sql`AND o.branch_id = ${branchId}` : Prisma.empty}
      GROUP BY c.id, c.name
      ORDER BY revenue DESC
    `;

    return categories.map(c => ({
      category_id: c.category_id,
      category_name: c.category_name || 'Uncategorized',
      quantity_sold: Number(c.quantity_sold || 0),
      revenue: Number(c.revenue || 0)
    }));
  }

  /**
   * Get Hourly Sales
   */
  async getHourlySales(query, branchId = null) {
    const { date } = query;

    const targetDate = new Date(date || new Date());
    const startDate = new Date(targetDate);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(targetDate);
    endDate.setHours(23, 59, 59, 999);

    const where = {
      status: 'completed',
      createdAt: { gte: startDate, lte: endDate }
    };
    if (branchId) where.branchId = branchId;

    const orders = await prisma.order.findMany({
      where,
      select: { total: true, createdAt: true }
    });

    // Group by hour
    const hourlyData = {};
    for (let i = 0; i < 24; i++) {
      hourlyData[i] = { hour: i, sales: 0, orders: 0 };
    }

    orders.forEach(order => {
      const hour = new Date(order.createdAt).getHours();
      hourlyData[hour].sales += Number(order.total);
      hourlyData[hour].orders += 1;
    });

    return Object.values(hourlyData);
  }

  /**
   * Get Payment Methods Report
   */
  async getPaymentMethodsReport(query, branchId = null) {
    const { date_from, date_to } = query;

    const startDate = new Date(date_from || new Date().setDate(new Date().getDate() - 30));
    startDate.setHours(0, 0, 0, 0);
    
    const endDate = new Date(date_to || new Date());
    endDate.setHours(23, 59, 59, 999);

    const where = {
      status: 'completed',
      createdAt: { gte: startDate, lte: endDate }
    };
    if (branchId) where.branchId = branchId;

    const payments = await prisma.order.groupBy({
      by: ['paymentMethod'],
      where,
      _sum: { total: true },
      _count: true
    });

    const totalSales = payments.reduce((sum, p) => sum + Number(p._sum.total || 0), 0);

    return payments.map(p => ({
      payment_method: p.paymentMethod,
      total_amount: Number(p._sum.total || 0),
      transaction_count: p._count,
      percentage: totalSales > 0 ? (Number(p._sum.total || 0) / totalSales) * 100 : 0
    }));
  }

  /**
   * Get Tax Report
   */
  async getTaxReport(query, branchId = null) {
    const { date_from, date_to } = query;

    const startDate = new Date(date_from || new Date().setDate(new Date().getDate() - 30));
    startDate.setHours(0, 0, 0, 0);
    
    const endDate = new Date(date_to || new Date());
    endDate.setHours(23, 59, 59, 999);

    const where = {
      status: 'completed',
      createdAt: { gte: startDate, lte: endDate }
    };
    if (branchId) where.branchId = branchId;

    const taxData = await prisma.order.aggregate({
      where,
      _sum: { total: true, taxAmount: true, subtotal: true },
      _count: true
    });

    const totalTax = Number(taxData._sum.taxAmount || 0);
    const totalSales = Number(taxData._sum.total || 0);
    const subtotal = Number(taxData._sum.subtotal || 0);

    return {
      total_tax_collected: totalTax,
      taxable_sales: subtotal,
      total_sales: totalSales,
      effective_tax_rate: subtotal > 0 ? (totalTax / subtotal) * 100 : 0,
      order_count: taxData._count,
      period: { from: startDate.toISOString(), to: endDate.toISOString() }
    };
  }

  /**
   * Get Profit & Loss Report
   */
  async getProfitLossReport(query, branchId = null) {
    const { date_from, date_to } = query;

    const startDate = new Date(date_from || new Date().setDate(new Date().getDate() - 30));
    startDate.setHours(0, 0, 0, 0);
    
    const endDate = new Date(date_to || new Date());
    endDate.setHours(23, 59, 59, 999);

    const orderWhere = {
      status: 'completed',
      createdAt: { gte: startDate, lte: endDate }
    };
    if (branchId) orderWhere.branchId = branchId;

    // Revenue
    const salesData = await prisma.order.aggregate({
      where: orderWhere,
      _sum: { total: true, taxAmount: true, discountAmount: true }
    });

    // Cost of goods sold
    const cogs = await prisma.$queryRaw`
      SELECT SUM(oi.quantity * p.cost_price) as total_cost
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      JOIN products p ON oi.product_id = p.id
      WHERE o.status = 'completed'
      AND o.created_at >= ${startDate}
      AND o.created_at <= ${endDate}
      ${branchId ? Prisma.sql`AND o.branch_id = ${branchId}` : Prisma.empty}
    `;

    const totalRevenue = Number(salesData._sum.total || 0);
    const totalCost = Number(cogs[0]?.total_cost || 0);
    const grossProfit = totalRevenue - totalCost;
    const totalDiscounts = Number(salesData._sum.discountAmount || 0);

    return {
      revenue: {
        total_sales: totalRevenue,
        discounts: totalDiscounts,
        net_revenue: totalRevenue - totalDiscounts
      },
      costs: {
        cost_of_goods_sold: totalCost
      },
      gross_profit: grossProfit,
      gross_margin: totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0,
      period: { from: startDate.toISOString(), to: endDate.toISOString() }
    };
  }

  /**
   * Get Balance Sheet
   */
  async getBalanceSheet(query, branchId = null) {
    // Get inventory value
    let productWhere = { isActive: true };
    
    const products = await prisma.product.findMany({
      where: productWhere,
      include: {
        stocks: branchId ? { where: { branchId } } : true
      }
    });

    const inventoryValue = products.reduce((sum, p) => {
      const stockQty = p.stocks.reduce((s, st) => s + st.stockQuantity, 0);
      return sum + (stockQty * Number(p.costPrice));
    }, 0);

    // Get accounts receivable (unpaid invoices)
    const receivables = await prisma.invoice.aggregate({
      where: {
        status: { in: ['pending', 'partial'] },
        ...(branchId && { branchId })
      },
      _sum: { dueAmount: true }
    });

    // Get accounts payable (if you have supplier invoices)
    const payables = 0; // Placeholder - implement if supplier invoices exist

    // Get cash on hand from accounting (simplified)
    const accounts = await prisma.account.findMany({
      where: {
        type: 'asset',
        ...(branchId && { branchId })
      }
    });

    const cashOnHand = accounts.reduce((sum, a) => sum + Number(a.balance || 0), 0);

    return {
      assets: {
        current_assets: {
          cash_on_hand: cashOnHand,
          accounts_receivable: Number(receivables._sum.dueAmount || 0),
          inventory: inventoryValue
        },
        total_current_assets: cashOnHand + Number(receivables._sum.dueAmount || 0) + inventoryValue
      },
      liabilities: {
        current_liabilities: {
          accounts_payable: payables
        },
        total_current_liabilities: payables
      },
      equity: cashOnHand + Number(receivables._sum.dueAmount || 0) + inventoryValue - payables,
      generated_at: new Date().toISOString()
    };
  }

  /**
   * Wastage Report
   */
  async getWastageReport(query, branchId = null) {
    const { date_from, date_to, product_id, category_id } = query;

    const startDate = new Date(date_from || new Date().toISOString().split('T')[0]);
    startDate.setHours(0, 0, 0, 0);
    
    const endDate = new Date(date_to || new Date().toISOString().split('T')[0]);
    endDate.setHours(23, 59, 59, 999);

    const where = {
      type: 'wastage',
      createdAt: {
        gte: startDate,
        lte: endDate
      }
    };

    if (branchId) where.branchId = branchId;
    if (product_id) where.productId = parseInt(product_id);

    // Get wastage movements
    const wastageMovements = await prisma.stockMovement.findMany({
      where,
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
            category: {
              select: { id: true, name: true }
            }
          }
        },
        user: {
          select: { id: true, name: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Calculate totals
    const totalWastage = wastageMovements.reduce((sum, movement) => sum + Math.abs(movement.quantity), 0);
    const totalValue = wastageMovements.reduce((sum, movement) => {
      return sum + (Math.abs(movement.quantity) * Number(movement.costPrice || 0));
    }, 0);

    // Group by product
    const byProduct = wastageMovements.reduce((acc, movement) => {
      const productId = movement.productId;
      if (!acc[productId]) {
        acc[productId] = {
          product_id: productId,
          product_name: movement.product.name,
          sku: movement.product.sku,
          category: movement.product.category?.name,
          total_quantity: 0,
          total_value: 0,
          movements: []
        };
      }
      acc[productId].total_quantity += Math.abs(movement.quantity);
      acc[productId].total_value += Math.abs(movement.quantity) * Number(movement.costPrice || 0);
      acc[productId].movements.push({
        id: movement.id,
        quantity: movement.quantity,
        cost_price: Number(movement.costPrice || 0),
        reason: movement.reason,
        created_at: movement.createdAt,
        created_by: movement.user?.name
      });
      return acc;
    }, {});

    return {
      summary: {
        total_wastage_quantity: totalWastage,
        total_wastage_value: totalValue,
        date_range: {
          from: startDate.toISOString().split('T')[0],
          to: endDate.toISOString().split('T')[0]
        }
      },
      by_product: Object.values(byProduct),
      movements: wastageMovements.map(movement => ({
        id: movement.id,
        product_name: movement.product.name,
        sku: movement.product.sku,
        quantity: movement.quantity,
        cost_price: Number(movement.costPrice || 0),
        total_value: Math.abs(movement.quantity) * Number(movement.costPrice || 0),
        reason: movement.reason,
        created_at: movement.createdAt,
        created_by: movement.user?.name
      }))
    };
  }
}

module.exports = new ReportService();
