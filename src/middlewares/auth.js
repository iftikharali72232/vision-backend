const jwt = require('jsonwebtoken');
const db = require('../config/database');
const { AuthenticationError, AuthorizationError, BadRequestError } = require('./errorHandler');
const { jwt: jwtConfig, permissions: rolePermissions } = require('../config/constants');
const { parseMysqlUrl } = require('../utils/mysqlUrl');

// Import prisma directly to use in requireBranch
const prisma = require('../config/database');

/**
 * Verify JWT token and attach user to request
 */
const authenticate = async (req, res, next) => {
  try {
    const masterPrisma = db.masterPrisma;
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      throw new AuthenticationError('Access token required', 'AUTH_001');
    }

    let token;

    if (authHeader.startsWith('Bearer ')) {
      token = authHeader.slice('Bearer '.length).trim();
    } else {
      // Some clients send the raw JWT without the Bearer prefix
      token = authHeader.trim();
    }

    // Guard against common frontend mistakes
    if (!token || token === 'undefined' || token === 'null' || token === '[object Object]') {
      throw new AuthenticationError('Access token required', 'AUTH_001');
    }

    // Basic JWT shape check (header.payload.signature)
    if (token.split('.').length !== 3) {
      throw new AuthenticationError('Invalid token', 'AUTH_004');
    }

    // Verify token
    const decoded = jwt.verify(token, jwtConfig.secret);

    // Check if token is revoked
    const tokenRecord = await masterPrisma.token.findFirst({
      where: {
        token,
        userId: decoded.userId,
        isRevoked: false
      }
    });

    if (!tokenRecord) {
      throw new AuthenticationError('Token is invalid or revoked', 'AUTH_004');
    }

    // Master user for tenant mapping
    const masterUser = await masterPrisma.user.findUnique({
      where: { id: decoded.userId }
    });

    if (!masterUser) {
      throw new AuthenticationError('User not found', 'AUTH_001');
    }

    if (!masterUser.isActive) {
      throw new AuthenticationError('Account is deactivated', 'AUTH_001');
    }

    if (!masterUser.isVerified) {
      throw new AuthenticationError('Please verify OTP before login', 'AUTH_OTP');
    }

    // Resolve tenant DB (fallback to master DB for legacy/demo users)
    const masterUrl = process.env.DATABASE_URL;
    const masterDbName = parseMysqlUrl(masterUrl).database;
    const tenantDbName = masterUser.tenantDb || masterDbName;

    // Get the appropriate Prisma client for this tenant
    const tenantPrisma = db.getTenantPrismaByDbName(tenantDbName);

    // Store tenant prisma on request for use in controllers/services
    req.tenantPrisma = tenantPrisma;
    req.tenantDb = tenantDbName;

    // Tenant user for branch access/permissions
    const user = await tenantPrisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        branchAccess: {
          where: { isActive: true },
          include: {
            branch: true
          }
        }
      }
    });

    if (!user) {
      throw new AuthenticationError('Account tenant is not ready', 'AUTH_002');
    }

    // Get the first active branch access to determine role and branch
    const primaryAccess = user.branchAccess[0];
    // Use actual role from branch access, fallback to cashier
    const role = primaryAccess?.role || 'cashier';
    const branchId = primaryAccess?.branchId;
    const shopId = primaryAccess?.branch?.shopId;

    // Attach user and permissions to request
    req.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: role,
      phone: user.phone,
      avatar: user.avatar,
      branches: user.branchAccess.map(ub => ub.branch),
      branchId: branchId,
      shopId: shopId,
      permissions: rolePermissions[role] || []
    };

    req.user.tenantDb = tenantDbName;

    req.token = token;

    // Continue to next middleware - tenant prisma is stored on req.tenantPrisma
    next();
  } catch (error) {
    if (error instanceof AuthenticationError) {
      next(error);
    } else if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      next(error);
    } else {
      next(new AuthenticationError('Authentication failed'));
    }
  }
};

/**
 * Check if user has required role(s)
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AuthenticationError('Authentication required'));
    }

    if (!roles.includes(req.user.role)) {
      return next(new AuthorizationError('Insufficient permissions'));
    }

    next();
  };
};

/**
 * Check if user has required permission(s)
 */
const hasPermission = (...requiredPermissions) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AuthenticationError('Authentication required'));
    }

    const normalize = (v) => (typeof v === 'string' ? v.trim().toLowerCase() : v);

    const toPermissionString = (resource, action) => {
      const res = normalize(resource);
      const act = normalize(action);

      // Allow passing explicit permission strings like "dashboard.view"
      if (typeof resource === 'string' && resource.includes('.')) {
        return resource;
      }

      // Compatibility: many routes use (resource, action) like ('dashboard', 'read')
      const actionMap = {
        read: 'view',
        list: 'view',
        show: 'view',
        view: 'view',
        create: 'create',
        update: 'update',
        delete: 'delete',
        export: 'export',
        stock: 'stock'
      };

      // Inventory permissions are represented as "products.stock" in this codebase
      if (res === 'inventory') {
        return 'products.stock';
      }

      const mappedAction = actionMap[act] || act;
      return `${res}.${mappedAction}`;
    };

    let permissionsToCheck = [];

    if (
      requiredPermissions.length === 2 &&
      typeof requiredPermissions[0] === 'string' &&
      typeof requiredPermissions[1] === 'string' &&
      !requiredPermissions[0].includes('.')
    ) {
      // Pair form: (resource, action)
      permissionsToCheck = [toPermissionString(requiredPermissions[0], requiredPermissions[1])];
    } else {
      // Explicit permissions list
      permissionsToCheck = requiredPermissions.map(p => {
        if (typeof p === 'string' && p.includes('.')) return p;
        return p;
      });
    }

    const hasAllPermissions = permissionsToCheck.every(
      permission => req.user.permissions.includes(permission)
    );

    if (!hasAllPermissions) {
      return next(new AuthorizationError('Insufficient permissions'));
    }

    next();
  };
};

/**
 * Extract and validate branch ID from header
 */
const requireBranch = async (req, res, next) => {
  try {
    let branchId = parseInt(req.headers['x-branch-id']);

    // Frontend compatibility: if header is missing, fall back to user's first branch
    if (!branchId || isNaN(branchId)) {
      const fallbackBranchId = req.user?.branches?.[0]?.id;
      if (fallbackBranchId) {
        branchId = fallbackBranchId;
      } else {
        return next(new BadRequestError('Branch ID required in X-Branch-Id header'));
      }
    }

    // Check if user has access to this branch
    const userHasAccess = req.user.branches.some(b => b.id === branchId);
    
    // Admins can access all branches
    if (!userHasAccess && req.user.role !== 'admin') {
      return next(new AuthorizationError('You do not have access to this branch'));
    }

    // Verify branch exists and is active
    const branch = await prisma.branch.findUnique({
      where: { id: branchId }
    });

    if (!branch) {
      return next(new AuthenticationError('Branch not found'));
    }

    if (!branch.isActive) {
      return next(new AuthenticationError('Branch is not active'));
    }

    req.branchId = branchId;
    req.branch = branch;

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Optional branch extraction (doesn't fail if not provided)
 */
const optionalBranch = async (req, res, next) => {
  try {
    const branchId = parseInt(req.headers['x-branch-id']);

    if (branchId && !isNaN(branchId)) {
      const branch = await prisma.branch.findUnique({
        where: { id: branchId }
      });

      if (branch && branch.isActive) {
        req.branchId = branchId;
        req.branch = branch;
      }
    }

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Extract branch from held order resource
 * Used for endpoints like POST /held-orders/:id/resume
 * If X-Branch-Id header is missing, extracts it from the held order
 */
const requireBranchFromHeldOrder = async (req, res, next) => {
  try {
    let branchId = parseInt(req.headers['x-branch-id']);

    // If header is missing, try to extract from held order
    if (!branchId || isNaN(branchId)) {
      const heldOrderId = parseInt(req.params.id);
      
      if (heldOrderId && !isNaN(heldOrderId)) {
        const heldOrder = await prisma.heldOrder.findUnique({
          where: { id: heldOrderId },
          select: { branchId: true }
        });

        if (heldOrder) {
          branchId = heldOrder.branchId;
        }
      }
    }

    // Fallback to user's selected/assigned branch
    if (!branchId || isNaN(branchId)) {
      const fallbackBranchId =
        req.user?.selectedBranch?.id ||
        req.user?.branchUser?.branchId ||
        req.user?.branchId;

      if (fallbackBranchId) {
        branchId = Number(fallbackBranchId);
      } else {
        return next(new BadRequestError('Branch ID required in X-Branch-Id header or provide a valid held order ID'));
      }
    }

    const tenantPrisma = req.tenantPrisma;
    if (!tenantPrisma) {
      return next(new AuthenticationError('Tenant context not initialized'));
    }

    // Verify branch exists and is active (tenant DB)
    const branch = await tenantPrisma.branch.findUnique({
      where: { id: branchId }
    });

    if (!branch) {
      return next(new AuthenticationError('Branch not found'));
    }

    if (!branch.isActive) {
      return next(new AuthenticationError('Branch is not active'));
    }

    // Enforce access for non-master users
    if (!req.user?.isMaster) {
      const assignedBranchId = req.user?.branchUser?.branchId || req.user?.branchId;
      if (assignedBranchId && Number(assignedBranchId) !== Number(branchId)) {
        return next(new AuthorizationError('You do not have access to this branch'));
      }
    }

    req.branchId = branchId;
    req.branch = branch;

    next();
  } catch (error) {
    next(error);
  }
};

const authNew = require('./auth.new');

module.exports = {
  ...authNew,
  // Keep this extra middleware for older routes
  requireBranchFromHeldOrder
};
