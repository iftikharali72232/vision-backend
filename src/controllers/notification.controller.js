const notificationService = require('../services/notification.service');

class NotificationController {
  async getNotifications(req, res, next) {
    try {
      const userId = req.user?.id || req.userId;
      const branchId = req.user?.branchId || req.branchId;
      const result = await notificationService.getNotifications(req.query, userId, branchId);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async getNotificationById(req, res, next) {
    try {
      const userId = req.user?.id || req.userId;
      const result = await notificationService.getNotificationById(req.params.id, userId);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async markAsRead(req, res, next) {
    try {
      const userId = req.user?.id || req.userId;
      await notificationService.markAsRead(req.params.id, userId);
      res.json({ success: true, message: 'Marked as read' });
    } catch (error) {
      next(error);
    }
  }

  async markAllAsRead(req, res, next) {
    try {
      const userId = req.user?.id || req.userId;
      const branchId = req.user?.branchId || req.branchId;
      await notificationService.markAllAsRead(userId, branchId);
      res.json({ success: true, message: 'Marked all as read' });
    } catch (error) {
      next(error);
    }
  }

  async deleteNotification(req, res, next) {
    try {
      const userId = req.user?.id || req.userId;
      await notificationService.deleteNotification(req.params.id, userId);
      res.json({ success: true, message: 'Deleted' });
    } catch (error) {
      next(error);
    }
  }

  async deleteReadNotifications(req, res, next) {
    try {
      const userId = req.user?.id || req.userId;
      const branchId = req.user?.branchId || req.branchId;
      const result = await notificationService.deleteReadNotifications(userId, branchId);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async getUnreadCount(req, res, next) {
    try {
      const userId = req.user?.id || req.userId;
      const branchId = req.user?.branchId || req.branchId;
      const result = await notificationService.getUnreadCount(userId, branchId);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async checkLowStockAlerts(req, res, next) {
    try {
      const branchId = req.user?.branchId || req.branchId;
      const result = await notificationService.checkLowStockAlerts(branchId);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async cleanOldNotifications(req, res, next) {
    try {
      const daysOld = req.query.days || 30;
      const result = await notificationService.cleanOldNotifications(parseInt(daysOld));
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async getSettings(req, res, next) {
    try {
      const branchId = req.branchId || req.user?.branchId;
      const result = await notificationService.getSettings(branchId);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async updateSettings(req, res, next) {
    try {
      const branchId = req.branchId || req.user?.branchId;
      const result = await notificationService.updateSettings(branchId, req.body);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new NotificationController();
