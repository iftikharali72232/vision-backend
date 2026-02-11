const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notification.controller');
const { authenticate, authorize, requireBranch } = require('../middlewares/auth');

// All routes require authentication
router.use(authenticate);

// Frontend expects branch-scoped notifications in many flows
router.use(requireBranch);

// Get notifications
router.get('/', notificationController.getNotifications);

// Get unread count
router.get('/unread-count', notificationController.getUnreadCount);

// Notification settings (optional but used by frontend)
router.get('/settings', notificationController.getSettings);
router.put('/settings', notificationController.updateSettings);

// Mark all notifications as read (frontend alias)
router.post('/read-all', notificationController.markAllAsRead);

// Delete all read notifications (must come before /:id)
router.delete('/read/all', notificationController.deleteReadNotifications);

// Mark notification as read (PATCH + POST alias)
router.patch('/:id/read', notificationController.markAsRead);
router.post('/:id/read', notificationController.markAsRead);

// Mark all notifications as read (legacy path)
router.post('/mark-all-read', notificationController.markAllAsRead);

// Get notification by ID
router.get('/:id', notificationController.getNotificationById);

// Delete notification
router.delete('/:id', notificationController.deleteNotification);

// Admin routes
// Check low stock alerts (run periodically)
router.post('/check-low-stock', authorize('admin'), notificationController.checkLowStockAlerts);

// Clean old notifications
router.post('/clean', authorize('admin'), notificationController.cleanOldNotifications);

module.exports = router;
