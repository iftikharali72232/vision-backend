const { Prisma } = require('@prisma/client');
const { getCurrentPrisma } = require('../middlewares/requestContext');
const prisma = new Proxy({}, { get: (_, prop) => getCurrentPrisma()[prop] });

/**
 * DASHBOARD SERVICE
 * 
 * CRITICAL: All sales/revenue data comes from INVOICES only
 * Orders are operational data, Invoices are financial data
 * 
 * Data is:
 * - Branch-based (filtered by branchId)
 * - Role-aware (permissions checked at controller level)
 * - Date-filtered (supports today, week, month, year, custom)
 */

class DashboardService {
  /**
   * Get dashboard summary stats
   * Data comes from INVOICES for financial accuracy
   */
  async getSummary(branchId, period = 'today') {
    const dateRange = this.getDateRange(period);
    const previousRange = this.getPreviousDateRange(period);

    // Invoice-based financial data
    const invoiceWhere = {
      branchId,
      status: { in: ['paid', 'partial'] },
      createdAt: {
        gte: dateRange.start,
        lte: dateRange.end
      }
    };

    const previousInvoiceWhere = {
      ...invoiceWhere,
      createdAt: {
        gte: previousRange.start,
        lte: previousRange.end
      }
    };

    // Get current and previous period sales from INVOICES
    const [currentSales, previousSales] = await Promise.all([
      prisma.invoice.aggregate({
        where: invoiceWhere,
        _sum: { total: true, paidAmount: true },
        _count: true,
        _avg: { total: true }
      }),
      prisma.invoice.aggregate({
        where: previousInvoiceWhere,
        _sum: { total: true }
      })
    ]);

    // Calculate growth
    const currentTotal = Number(currentSales._sum.total || 0);
    const previousTotal = Number(previousSales._sum.total || 0);
    const growth = previousTotal > 0 
      ? ((currentTotal - previousTotal) / previousTotal) * 100 
      : (currentTotal > 0 ? 100 : 0);

    // Order stats (operational view)
    const orderWhere = {
      branchId,
      createdAt: {
        gte: dateRange.start,
        lte: dateRange.end
      }
    };

    const orderStats = await prisma.order.groupBy({
      by: ['status'],
      where: orderWhere,
      _count: true
    });

    const ordersByStatus = {
      total: 0,
      pending: 0,
      confirmed: 0,
      preparing: 0,
      ready: 0,
      completed: 0,
      invoiced: 0,
      cancelled: 0
    };

    orderStats.forEach(stat => {
      ordersByStatus.total += stat._count;
      if (ordersByStatus.hasOwnProperty(stat.status)) {
        ordersByStatus[stat.status] = stat._count;
      }
    });

    // Customer stats
    const [totalCustomers, newCustomers] = await Promise.all([
      prisma.customer.count({ where: { branchId } }),
      prisma.customer.count({
        where: {
          branchId,
          createdAt: {
            gte: dateRange.start,
            lte: dateRange.end
          }
        }
      })
    ]);

    // Product stats
    const [totalProducts, lowStockCount, outOfStockCount] = await Promise.all([
      prisma.product.count({ where: { branchId, isActive: true } }),
      prisma.$queryRaw`
        SELECT COUNT(DISTINCT p.id) as count
        FROM products p
        JOIN product_stocks ps ON p.id = ps.product_id
        WHERE ps.stock_quantity > 0 
        AND ps.stock_quantity <= p.low_stock_threshold
        AND ps.branch_id = ${branchId}
      `,
      prisma.$queryRaw`
        SELECT COUNT(DISTINCT p.id) as count
        FROM products p
        JOIN product_stocks ps ON p.id = ps.product_id
        WHERE ps.stock_quantity = 0
        AND ps.branch_id = ${branchId}
      `
    ]);

    return {
      period,
      date_range: {
        start: dateRange.start,
        end: dateRange.end
      },
      sales: {
        total: currentTotal,
        count: currentSales._count,
        average: Number(currentSales._avg.total || 0),
        collected: Number(currentSales._sum.paidAmount || 0),
        growth: Math.round(growth * 100) / 100
      },
      orders: {
        total: ordersByStatus.total,
        pending: ordersByStatus.pending,
        confirmed: ordersByStatus.confirmed,
        preparing: ordersByStatus.preparing,
        ready: ordersByStatus.ready,
        completed: ordersByStatus.completed,
        invoiced: ordersByStatus.invoiced,
        cancelled: ordersByStatus.cancelled
      },
      customers: {
        total: totalCustomers,
        new: newCustomers
      },
      products: {
        total: totalProducts,
        low_stock: Number(lowStockCount[0]?.count || 0),
        out_of_stock: Number(outOfStockCount[0]?.count || 0)
      }
    };
  }

  /**
   * Get sales chart data (from INVOICES)
   */
  async getSalesChart(branchId, period = 'month', groupBy = 'day') {
    const dateRange = this.getDateRange(period);
    
    const invoices = await prisma.invoice.findMany({
      where: {
        branchId,
        status: { in: ['paid', 'partial'] },
        createdAt: {
          gte: dateRange.start,
          lte: dateRange.end
        }
      },
      select: {
        total: true,
        createdAt: true
      },
      orderBy: { createdAt: 'asc' }
    });

    // Group data
    const groupedData = {};
    
    invoices.forEach(invoice => {
      const key = this.getGroupKey(invoice.createdAt, groupBy);
      if (!groupedData[key]) {
        groupedData[key] = { sales: 0, count: 0 };
      }
      groupedData[key].sales += Number(invoice.total);
      groupedData[key].count += 1;
    });

    // Generate complete date range labels
    const labels = this.generateDateLabels(dateRange.start, dateRange.end, groupBy);
    const sales = labels.map(key => groupedData[key]?.sales || 0);
    const counts = labels.map(key => groupedData[key]?.count || 0);

    return {
      period,
      group_by: groupBy,
      labels,
      datasets: {
        sales,
        invoice_count: counts
      }
    };
  }

  /**
   * Get top selling products (from invoice items via orders)
   */
  async getTopProducts(branchId, period = 'month', limit = 10) {
    const dateRange = this.getDateRange(period);

    const topProducts = await prisma.$queryRaw`
      SELECT 
        p.id,
        p.name,
        p.sku,
        p.image,
        SUM(oi.quantity) as quantity_sold,
        SUM(oi.total) as revenue
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      JOIN invoices i ON o.id = i.order_id
      JOIN products p ON oi.product_id = p.id
      WHERE i.status IN ('paid', 'partial')
      AND i.created_at >= ${dateRange.start}
      AND i.created_at <= ${dateRange.end}
      AND o.branch_id = ${branchId}
      GROUP BY p.id, p.name, p.sku, p.image
      ORDER BY quantity_sold DESC
      LIMIT ${limit}
    `;

    return topProducts.map(p => ({
      id: p.id,
      name: p.name,
      sku: p.sku,
      image: p.image,
      quantity_sold: Number(p.quantity_sold),
      revenue: Number(p.revenue)
    }));
  }

  /**
   * Get recent invoices
   */
  async getRecentInvoices(branchId, limit = 10) {
    const invoices = await prisma.invoice.findMany({
      where: { branchId },
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        customer: { select: { name: true } },
        order: { select: { orderNumber: true, orderType: true } }
      }
    });

    return invoices.map(inv => ({
      id: inv.id,
      invoice_number: inv.invoiceNumber,
      order_number: inv.orderNumber,
      customer_name: inv.customer?.name || 'Walk-in Customer',
      total: Number(inv.total),
      paid_amount: Number(inv.paidAmount),
      status: inv.status,
      created_at: inv.createdAt
    }));
  }

  /**
   * Get recent orders (operational view)
   */
  async getRecentOrders(branchId, limit = 10) {
    const orders = await prisma.order.findMany({
      where: { branchId },
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        customer: { select: { name: true } },
        invoice: { select: { invoiceNumber: true, status: true } }
      }
    });

    return orders.map(order => ({
      id: order.id,
      order_number: order.orderNumber,
      customer_name: order.customer?.name || 'Walk-in Customer',
      total: Number(order.total),
      payment_method: order.paymentMethod,
      status: order.status,
      invoice: order.invoice ? {
        invoice_number: order.invoice.invoiceNumber,
        status: order.invoice.status
      } : null,
      created_at: order.createdAt
    }));
  }

  /**
   * Get payment methods breakdown (from INVOICES)
   */
  async getPaymentMethods(branchId, period = 'today') {
    const dateRange = this.getDateRange(period);

    const payments = await prisma.$queryRaw`
      SELECT 
        o.payment_method,
        COUNT(*) as count,
        SUM(i.total) as total
      FROM invoices i
      JOIN orders o ON i.order_id = o.id
      WHERE i.branch_id = ${branchId}
      AND i.status IN ('paid', 'partial')
      AND i.created_at >= ${dateRange.start}
      AND i.created_at <= ${dateRange.end}
      GROUP BY o.payment_method
    `;

    return payments.map(p => ({
      method: p.payment_method,
      count: Number(p.count),
      total: Number(p.total)
    }));
  }

  /**
   * Get hourly sales distribution
   */
  async getHourlySales(branchId, date = null) {
    const targetDate = date ? new Date(date) : new Date();
    const start = new Date(targetDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(targetDate);
    end.setHours(23, 59, 59, 999);

    const invoices = await prisma.invoice.findMany({
      where: {
        branchId,
        status: { in: ['paid', 'partial'] },
        createdAt: { gte: start, lte: end }
      },
      select: { total: true, createdAt: true }
    });

    // Group by hour
    const hourlyData = Array(24).fill(null).map((_, i) => ({
      hour: i,
      label: `${i.toString().padStart(2, '0')}:00`,
      sales: 0,
      count: 0
    }));

    invoices.forEach(inv => {
      const hour = inv.createdAt.getHours();
      hourlyData[hour].sales += Number(inv.total);
      hourlyData[hour].count += 1;
    });

    return hourlyData;
  }

  /**
   * Legacy: Get stats (for backwards compatibility)
   */
  async getStats(branchId, period = 'today') {
    return this.getSummary(branchId, period);
  }

  /**
   * Get date range based on period
   */
  getDateRange(period) {
    const now = new Date();
    const start = new Date();
    const end = new Date();

    switch (period) {
      case 'today':
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        break;
      case 'yesterday':
        start.setDate(now.getDate() - 1);
        start.setHours(0, 0, 0, 0);
        end.setDate(now.getDate() - 1);
        end.setHours(23, 59, 59, 999);
        break;
      case 'week':
        start.setDate(now.getDate() - 7);
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        break;
      case 'month':
        start.setMonth(now.getMonth() - 1);
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        break;
      case 'year':
        start.setFullYear(now.getFullYear() - 1);
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        break;
      default:
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
    }

    return { start, end };
  }

  /**
   * Get previous date range for comparison
   */
  getPreviousDateRange(period) {
    const current = this.getDateRange(period);
    const diff = current.end.getTime() - current.start.getTime();
    
    return {
      start: new Date(current.start.getTime() - diff - 1),
      end: new Date(current.start.getTime() - 1)
    };
  }

  /**
   * Get group key for date
   */
  getGroupKey(date, groupBy) {
    const d = new Date(date);
    
    switch (groupBy) {
      case 'hour':
        return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric' });
      case 'day':
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      case 'week':
        const weekStart = new Date(d);
        weekStart.setDate(d.getDate() - d.getDay());
        return `Week ${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
      case 'month':
        return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
      default:
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  }

  /**
   * Generate date labels for chart
   */
  generateDateLabels(start, end, groupBy) {
    const labels = [];
    const current = new Date(start);

    while (current <= end) {
      labels.push(this.getGroupKey(current, groupBy));
      
      switch (groupBy) {
        case 'hour':
          current.setHours(current.getHours() + 1);
          break;
        case 'day':
          current.setDate(current.getDate() + 1);
          break;
        case 'week':
          current.setDate(current.getDate() + 7);
          break;
        case 'month':
          current.setMonth(current.getMonth() + 1);
          break;
        default:
          current.setDate(current.getDate() + 1);
      }
    }

    return [...new Set(labels)]; // Remove duplicates
  }

  /**
   * Get sales statistics for API contract
   * GET /dashboard/sales
   */
  async getSalesStats(branchId, dateFrom, dateTo, groupBy = 'day') {
    const startDate = dateFrom ? new Date(dateFrom) : new Date(new Date().setDate(new Date().getDate() - 30));
    startDate.setHours(0, 0, 0, 0);
    
    const endDate = dateTo ? new Date(dateTo) : new Date();
    endDate.setHours(23, 59, 59, 999);

    const invoices = await prisma.invoice.findMany({
      where: {
        branchId,
        status: { in: ['paid', 'partial'] },
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      },
      select: {
        total: true,
        createdAt: true
      },
      orderBy: { createdAt: 'asc' }
    });

    // Group data by date
    const groupedData = {};
    
    invoices.forEach(invoice => {
      const date = new Date(invoice.createdAt);
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

      if (!groupedData[key]) {
        groupedData[key] = { date: key, total: 0, orders: 0 };
      }
      groupedData[key].total += Number(invoice.total);
      groupedData[key].orders += 1;
    });

    return Object.values(groupedData).sort((a, b) => a.date.localeCompare(b.date));
  }
}

module.exports = new DashboardService();
