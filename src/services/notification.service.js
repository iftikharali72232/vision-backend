const { getCurrentPrisma } = require('../middlewares/requestContext');
const prisma = new Proxy({}, { get: (_, prop) => getCurrentPrisma()[prop] });
const { pagination: paginationConfig } = require('../config/constants');
const { NotFoundError } = require('../middlewares/errorHandler');

class NotificationService {
  /**
   * Get notifications for a user
   */
  async getNotifications(query, userId, branchId) {
    const {
      page = paginationConfig.defaultPage,
      per_page = paginationConfig.defaultPerPage,
      limit,
      type,
      is_read,
      priority
    } = query;

    const pageNum = parseInt(page) || paginationConfig.defaultPage;
    const perPageNum = parseInt(limit || per_page) || paginationConfig.defaultPerPage;

    const skip = (pageNum - 1) * perPageNum;
    const take = Math.min(perPageNum, paginationConfig.maxPerPage);

    const where = {
      OR: [
        { userId },
        { userId: null, branchId }
      ]
    };

    if (type) {
      where.type = type;
    }

    if (is_read !== undefined) {
      where.isRead = is_read === 'true' || is_read === true;
    }

    if (priority) {
      where.priority = priority;
    }

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({
        where: {
          ...where,
          isRead: false
        }
      })
    ]);

    const items = notifications.map(n => ({
      id: n.id,
      type: n.type,
      title: n.title,
      message: n.message,
      data: n.data,
      priority: n.priority,
      channel: n.channel,
      is_read: n.isRead,
      read_at: n.readAt,
      created_at: n.createdAt
    }));

    const totalPages = Math.ceil(total / take);

    return {
      items,
      unread_count: unreadCount,
      pagination: {
        // Frontend guide keys
        page: pageNum,
        limit: take,
        total,
        total_pages: totalPages,

        // Backwards-compatible keys
        current_page: pageNum,
        per_page: take,
        total_items: total
      }
    };
  }

  /**
   * Get single notification
   */
  async getNotificationById(id, userId) {
    const notification = await prisma.notification.findFirst({
      where: {
        id: parseInt(id),
        OR: [
          { userId },
          { userId: null }
        ]
      }
    });

    if (!notification) {
      throw new NotFoundError('Notification');
    }

    return {
      id: notification.id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      data: notification.data,
      priority: notification.priority,
      channel: notification.channel,
      is_read: notification.isRead,
      read_at: notification.readAt,
      created_at: notification.createdAt
    };
  }

  /**
   * Mark notification as read
   */
  async markAsRead(id, userId) {
    const notification = await prisma.notification.findFirst({
      where: {
        id: parseInt(id),
        OR: [
          { userId },
          { userId: null }
        ]
      }
    });

    if (!notification) {
      throw new NotFoundError('Notification');
    }

    await prisma.notification.update({
      where: { id: parseInt(id) },
      data: {
        isRead: true,
        readAt: new Date()
      }
    });

    return { message: 'Notification marked as read' };
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(userId, branchId) {
    await prisma.notification.updateMany({
      where: {
        OR: [
          { userId },
          { userId: null, branchId }
        ],
        isRead: false
      },
      data: {
        isRead: true,
        readAt: new Date()
      }
    });

    return { message: 'All notifications marked as read' };
  }

  /**
   * Delete notification
   */
  async deleteNotification(id, userId) {
    const notification = await prisma.notification.findFirst({
      where: {
        id: parseInt(id),
        OR: [
          { userId },
          { userId: null }
        ]
      }
    });

    if (!notification) {
      throw new NotFoundError('Notification');
    }

    await prisma.notification.delete({
      where: { id: parseInt(id) }
    });

    return { message: 'Notification deleted' };
  }

  /**
   * Delete all read notifications
   */
  async deleteReadNotifications(userId, branchId) {
    const result = await prisma.notification.deleteMany({
      where: {
        OR: [
          { userId },
          { userId: null, branchId }
        ],
        isRead: true
      }
    });

    return {
      message: 'Read notifications deleted',
      count: result.count
    };
  }

  /**
   * Get unread count
   */
  async getUnreadCount(userId, branchId) {
    const count = await prisma.notification.count({
      where: {
        OR: [
          { userId },
          { userId: null, branchId }
        ],
        isRead: false
      }
    });

    // Frontend guide expects data.count
    return { count, unread_count: count };
  }

  /**
   * Get notification settings (stored in Branch.settings.notifications)
   */
  async getSettings(branchId) {
    const branch = await prisma.branch.findUnique({
      where: { id: branchId },
      select: { settings: true }
    });

    const settings = branch?.settings || {};
    const notifications = settings.notifications || {};

    return {
      sound_enabled: notifications.sound_enabled ?? true,
      browser_enabled: notifications.browser_enabled ?? false,
      types: notifications.types || {}
    };
  }

  /**
   * Update notification settings (stored in Branch.settings.notifications)
   */
  async updateSettings(branchId, payload = {}) {
    const current = await prisma.branch.findUnique({
      where: { id: branchId },
      select: { settings: true }
    });

    const settings = current?.settings || {};
    const notifications = settings.notifications || {};

    const nextNotifications = {
      ...notifications,
      ...(payload.sound_enabled !== undefined ? { sound_enabled: payload.sound_enabled } : {}),
      ...(payload.browser_enabled !== undefined ? { browser_enabled: payload.browser_enabled } : {}),
      ...(payload.types ? { types: { ...(notifications.types || {}), ...payload.types } } : {})
    };

    const updated = await prisma.branch.update({
      where: { id: branchId },
      data: {
        settings: {
          ...settings,
          notifications: nextNotifications
        }
      },
      select: { settings: true }
    });

    return {
      sound_enabled: updated.settings?.notifications?.sound_enabled ?? true,
      browser_enabled: updated.settings?.notifications?.browser_enabled ?? false,
      types: updated.settings?.notifications?.types || {}
    };
  }

  // ==================== NOTIFICATION CREATION ====================

  /**
   * Create notification
   */
  async createNotification(data) {
    const {
      user_id,
      branch_id,
      type,
      title,
      message,
      data: notificationData,
      priority = 'normal',
      channel = 'in_app'
    } = data;

    const notification = await prisma.notification.create({
      data: {
        userId: user_id,
        branchId: branch_id,
        type,
        title,
        message,
        data: notificationData,
        priority,
        channel
      }
    });

    return {
      id: notification.id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      created_at: notification.createdAt
    };
  }

  /**
   * Create low stock notification
   */
  async createLowStockNotification(productId, branchId, currentQty, minLevel) {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { name: true, sku: true }
    });

    if (!product) return;

    await this.createNotification({
      branch_id: branchId,
      type: 'low_stock',
      title: 'Low Stock Alert',
      message: `${product.name} (${product.sku}) is running low. Current stock: ${currentQty}, Minimum level: ${minLevel}`,
      data: {
        product_id: productId,
        product_name: product.name,
        current_quantity: currentQty,
        min_level: minLevel
      },
      priority: 'high'
    });
  }

  /**
   * Create out of stock notification
   */
  async createOutOfStockNotification(productId, branchId) {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { name: true, sku: true }
    });

    if (!product) return;

    await this.createNotification({
      branch_id: branchId,
      type: 'out_of_stock',
      title: 'Out of Stock Alert',
      message: `${product.name} (${product.sku}) is out of stock!`,
      data: {
        product_id: productId,
        product_name: product.name
      },
      priority: 'urgent'
    });
  }

  /**
   * Create new order notification
   */
  async createNewOrderNotification(order, branchId) {
    await this.createNotification({
      branch_id: branchId,
      type: 'new_order',
      title: 'New Order',
      message: `New order ${order.orderNumber} received. Total: $${Number(order.total).toFixed(2)}`,
      data: {
        order_id: order.id,
        order_number: order.orderNumber,
        total: Number(order.total),
        order_type: order.orderType
      },
      priority: order.orderType === 'delivery' ? 'high' : 'normal'
    });
  }

  /**
   * Create order status notification (for customer)
   */
  async createOrderStatusNotification(order, newStatus) {
    if (!order.customerId) return;

    const statusMessages = {
      confirmed: 'Your order has been confirmed',
      preparing: 'Your order is being prepared',
      ready: 'Your order is ready for pickup',
      completed: 'Your order has been completed',
      cancelled: 'Your order has been cancelled'
    };

    await this.createNotification({
      user_id: null,
      branch_id: order.branchId,
      type: 'order_status',
      title: 'Order Update',
      message: `Order ${order.orderNumber}: ${statusMessages[newStatus] || `Status changed to ${newStatus}`}`,
      data: {
        order_id: order.id,
        order_number: order.orderNumber,
        new_status: newStatus,
        customer_id: order.customerId
      },
      priority: newStatus === 'ready' ? 'high' : 'normal'
    });
  }

  /**
   * Create system notification (for all users in branch)
   */
  async createSystemNotification(branchId, title, message, data = {}) {
    await this.createNotification({
      branch_id: branchId,
      type: 'system',
      title,
      message,
      data,
      priority: 'normal'
    });
  }

  // ==================== SCHEDULED NOTIFICATIONS ====================

  /**
   * Check and create low stock notifications (called periodically)
   */
  async checkLowStockAlerts(branchId) {
    const products = await prisma.product.findMany({
      where: {
        branchId,
        trackInventory: true
      },
      include: {
        stocks: { where: { branchId } }
      }
    });

    const alerts = [];

    for (const product of products) {
      const stock = product.stocks[0];
      if (!stock) continue;

      const currentQty = stock.stockQuantity;
      const minLevel = stock.minStockLevel || 10;

      if (currentQty === 0) {
        await this.createOutOfStockNotification(product.id, branchId);
        alerts.push({ product_id: product.id, type: 'out_of_stock' });
      } else if (currentQty <= minLevel) {
        await this.createLowStockNotification(product.id, branchId, currentQty, minLevel);
        alerts.push({ product_id: product.id, type: 'low_stock' });
      }
    }

    return {
      checked: products.length,
      alerts_created: alerts.length,
      alerts
    };
  }

  /**
   * Clean old notifications
   */
  async cleanOldNotifications(daysOld = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await prisma.notification.deleteMany({
      where: {
        createdAt: { lt: cutoffDate },
        isRead: true
      }
    });

    return {
      message: `Deleted ${result.count} old notifications`,
      count: result.count
    };
  }
}

module.exports = new NotificationService();
