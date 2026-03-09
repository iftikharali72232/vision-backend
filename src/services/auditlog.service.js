/**
 * Audit Log Service
 * Logs all create/update/delete operations for compliance and tracking
 */

class AuditLogService {
  /**
   * Log an action to the audit trail
   * @param {object} tenantPrisma - Prisma client for tenant DB
   * @param {object} params - Audit log parameters
   */
  async log(tenantPrisma, { branchId, userId, action, entity, entityId, changes, metadata, req }) {
    try {
      await tenantPrisma.auditLog.create({
        data: {
          branchId: branchId || null,
          userId: userId,
          action: action,       // create, update, delete
          entity: entity,       // product, order, customer, etc.
          entityId: entityId || null,
          changes: changes || null,
          metadata: metadata || null,
          ipAddress: req?.ip || req?.connection?.remoteAddress || null,
          userAgent: req?.headers?.['user-agent']?.substring(0, 500) || null,
        }
      });
    } catch (error) {
      // Audit logging should never break the main flow
      console.error('[AuditLog] Error logging:', error.message);
    }
  }

  /**
   * Create a middleware that auto-logs after successful responses
   * @param {string} entity - Entity name (e.g., 'product')
   * @param {string} action - Action type (e.g., 'create')
   */
  middleware(entity, action) {
    return (req, res, next) => {
      // Store original json method
      const originalJson = res.json.bind(res);

      // Override json to log after successful response
      res.json = (body) => {
        // Only log on success (2xx and success: true)
        if (res.statusCode >= 200 && res.statusCode < 300 && body?.success !== false) {
          const entityId = req.params?.id || body?.data?.id || null;
          
          // Async log - don't await
          if (req.tenantPrisma && req.user?.id) {
            this.log(req.tenantPrisma, {
              branchId: req.branchId || null,
              userId: req.user.id,
              action,
              entity,
              entityId: entityId ? parseInt(entityId) : null,
              changes: action === 'create' ? { created: req.body } : 
                       action === 'update' ? { updated: req.body } : 
                       action === 'delete' ? { deleted: { id: entityId } } : null,
              req,
            });
          }
        }

        return originalJson(body);
      };

      next();
    };
  }

  /**
   * Get audit logs with filtering
   */
  async getLogs(tenantPrisma, { branchId, userId, entity, action, startDate, endDate, page = 1, perPage = 50 }) {
    const where = {};
    if (branchId) where.branchId = parseInt(branchId);
    if (userId) where.userId = parseInt(userId);
    if (entity) where.entity = entity;
    if (action) where.action = action;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const [logs, total] = await Promise.all([
      tenantPrisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * perPage,
        take: perPage,
      }),
      tenantPrisma.auditLog.count({ where }),
    ]);

    return {
      data: logs,
      pagination: {
        total,
        page,
        per_page: perPage,
        total_pages: Math.ceil(total / perPage),
      }
    };
  }
}

module.exports = new AuditLogService();
