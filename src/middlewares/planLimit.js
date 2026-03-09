/**
 * Plan Limit Middleware
 * Enforces subscription plan limits on resource creation
 * Checks: max products, max branches, max users, max orders per month
 */

const { systemPrisma } = require('../config/database');
const { AppError } = require('./errorHandler');

/**
 * Check plan limit before creating a resource
 * @param {string} resource - 'products' | 'branches' | 'users' | 'orders'
 */
const checkPlanLimit = (resource) => {
  return async (req, res, next) => {
    try {
      // Master users bypass in dev mode
      if (process.env.NODE_ENV === 'development' && process.env.SKIP_PLAN_LIMITS === 'true') {
        return next();
      }

      const companyId = req.user?.companyId;
      if (!companyId) return next();

      // Get company with plan
      const company = await systemPrisma.company.findUnique({
        where: { id: companyId },
        include: { plan: true }
      });

      if (!company || !company.plan) {
        // No plan assigned - allow (backward compatibility)
        return next();
      }

      const plan = company.plan;
      const tenantPrisma = req.tenantPrisma;

      let currentCount = 0;
      let limit = 0;
      let resourceLabel = resource;

      switch (resource) {
        case 'products': {
          currentCount = await tenantPrisma.product.count();
          limit = plan.maxProducts;
          resourceLabel = 'products';
          break;
        }
        case 'branches': {
          currentCount = await tenantPrisma.branch.count();
          limit = plan.maxBranches;
          resourceLabel = 'branches';
          break;
        }
        case 'users': {
          const users = await systemPrisma.systemUser.count({
            where: { companyId, isDeveloper: false }
          });
          currentCount = users;
          limit = plan.maxUsers;
          resourceLabel = 'users';
          break;
        }
        case 'orders': {
          const now = new Date();
          const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
          currentCount = await tenantPrisma.order.count({
            where: { createdAt: { gte: monthStart } }
          });
          limit = plan.maxOrdersPerMonth;
          resourceLabel = 'orders this month';
          break;
        }
        default:
          return next();
      }

      if (currentCount >= limit) {
        throw new AppError(
          `You have reached the maximum number of ${resourceLabel} (${limit}) allowed on your ${plan.name} plan. Please upgrade your plan to add more.`,
          403,
          'PLAN_LIMIT_EXCEEDED'
        );
      }

      // Attach usage info to request for optional use in response
      req.planUsage = {
        resource,
        used: currentCount,
        limit,
        remaining: limit - currentCount,
      };

      next();
    } catch (error) {
      if (error instanceof AppError) {
        next(error);
      } else {
        console.error('[PlanLimit] Error checking plan limit:', error.message);
        next(); // Don't block on errors
      }
    }
  };
};

/**
 * Check if a specific feature is enabled in the plan
 * @param {string} featureCode - Feature code to check (e.g., 'accounting', 'multi_branch')
 */
const requireFeature = (featureCode) => {
  return async (req, res, next) => {
    try {
      const companyId = req.user?.companyId;
      if (!companyId) return next();

      // Master users bypass
      if (req.user?.isMaster && process.env.NODE_ENV === 'development') {
        return next();
      }

      const company = await systemPrisma.company.findUnique({
        where: { id: companyId },
        include: { plan: true }
      });

      if (!company || !company.plan) {
        return next(); // No plan = allow
      }

      const features = company.plan.features || [];
      if (!features.includes(featureCode)) {
        throw new AppError(
          `The "${featureCode}" feature is not available on your ${company.plan.name} plan. Please upgrade to access this feature.`,
          403,
          'FEATURE_NOT_AVAILABLE'
        );
      }

      next();
    } catch (error) {
      if (error instanceof AppError) {
        next(error);
      } else {
        console.error('[PlanLimit] Error checking feature:', error.message);
        next();
      }
    }
  };
};

module.exports = {
  checkPlanLimit,
  requireFeature,
};
