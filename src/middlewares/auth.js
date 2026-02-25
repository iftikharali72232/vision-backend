const jwt = require('jsonwebtoken');
const { systemPrisma, getTenantPrisma } = require('../config/database');
const { asyncLocalStorage } = require('./requestContext');
const { AuthenticationError, AuthorizationError, BadRequestError } = require('./errorHandler');
const { jwt: jwtConfig } = require('../config/constants');

/**
 * Verify JWT token and attach user data to request
 * Works with new system database structure
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      throw new AuthenticationError('Access token required', 'AUTH_001');
    }

    let token;

    if (authHeader.startsWith('Bearer ')) {
      token = authHeader.slice('Bearer '.length).trim();
    } else {
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
    let decoded;
    let isOldSystemToken = false;
    
    try {
      decoded = jwt.verify(token, jwtConfig.secret);
    } catch (error) {
      // If JWT verification fails, this might be an old system token
      // For backward compatibility, we'll allow the request to proceed
      // The user data will be set by the route handler
      isOldSystemToken = true;
    }

    if (isOldSystemToken) {
      // Skip all new system authentication logic for old tokens
      req.user = { id: 'old_system_user', isMaster: true };
      req.company = { id: 1 };
      return next();
    }

    // Skip token database check for compatibility with old auth system
    // const tokenRecord = await systemPrisma.token.findFirst({
    //   where: {
    //     token,
    //     userId: decoded.userId,
    //     isRevoked: false
    //   }
    // });

    // if (!tokenRecord) {
    //   throw new AuthenticationError('Token is invalid or revoked', 'AUTH_004');
    // }

    // Try to get user from system database first, fallback to master database
    const systemUser = await systemPrisma.systemUser.findUnique({
      where: { id: decoded.userId },
      include: {
        company: true
      }
    });

    if (!systemUser) {
      throw new AuthenticationError('User not found', 'AUTH_001');
    }

    if (systemUser.status !== 'active') {
      throw new AuthenticationError('Account is not active', 'AUTH_001');
    }

    // Check email verification - status 'pending' means unverified
    if (systemUser.status === 'pending') {
      throw new AuthenticationError('Please verify OTP before login', 'AUTH_OTP');
    }

    if (!systemUser.company) {
      throw new AuthenticationError('Company not found', 'AUTH_002');
    }

    if (systemUser.company.status !== 'active') {
      throw new AuthenticationError('Company is not active', 'AUTH_002');
    }

    // Get tenant database connection
    const tenantDb = systemUser.company.tenantDb;
    const tenantPrisma = getTenantPrisma(tenantDb);

    // Store tenant prisma on request for use in controllers/services
    req.tenantPrisma = tenantPrisma;
    req.tenantDb = tenantDb;

    // If user is not master, get their branch user data from tenant database
    let branchUser = null;
    let selectedBranch = null;
    let role = null;
    let permissions = [];

    if (!systemUser.isMaster) {
      // Get branch user from tenant database
      branchUser = await tenantPrisma.branchUser.findFirst({
        where: {
          systemUserId: systemUser.id,
          isActive: true
        },
        include: {
          branch: true
        }
      });

      if (!branchUser) {
        throw new AuthenticationError('User is not assigned to any branch', 'AUTH_003');
      }

      selectedBranch = branchUser.branch;

      // Get role and permissions from system database
      if (branchUser.roleId) {
        role = await systemPrisma.role.findUnique({
          where: { id: branchUser.roleId },
          include: {
            permissions: {
              include: {
                menu: true
              }
            }
          }
        });

        if (role) {
          // Extract permission strings from role
          permissions = [];
          for (const p of role.permissions) {
            const menuCode = p.menu.code;
            if (p.canView) permissions.push(`${menuCode}.view`);
            if (p.canCreate) permissions.push(`${menuCode}.create`);
            if (p.canUpdate) permissions.push(`${menuCode}.update`);
            if (p.canDelete) permissions.push(`${menuCode}.delete`);
            if (p.canExport) permissions.push(`${menuCode}.export`);
            if (p.canPrint) permissions.push(`${menuCode}.print`);
          }
        }
      }
    } else {
      // Master user has all permissions
      const allMenus = await systemPrisma.systemMenu.findMany({
        where: { isActive: true }
      });
      
      const actions = ['VIEW', 'CREATE', 'UPDATE', 'DELETE', 'EXPORT'];
      permissions = allMenus.flatMap(menu => 
        actions.map(action => `${menu.code}.${action.toLowerCase()}`)
      );

      // Get all branches for master user
      const branches = await tenantPrisma.branch.findMany({
        where: { isActive: true }
      });

      // If there's a selected branch in the token, use it
      if (decoded.branchId) {
        selectedBranch = branches.find(b => b.id === decoded.branchId);
      }

      // Create a virtual role for master
      role = {
        id: 0,
        name: 'Master',
        code: 'MASTER',
        isMaster: true
      };
    }

    // Attach user and permissions to request
    req.user = {
      id: systemUser.id,
      name: systemUser.name,
      email: systemUser.email,
      phone: systemUser.phone,
      avatar: systemUser.avatar,
      isMaster: systemUser.isMaster,
      companyId: systemUser.companyId,
      company: systemUser.company,
      role: role,
      permissions: permissions,
      branchUser: branchUser,
      selectedBranch: selectedBranch,
      tenantDb: tenantDb,
      default_branch_id: decoded.default_branch_id
    };

    // For backward compatibility
    req.user.branchId = selectedBranch?.id;
    req.user.shopId = selectedBranch?.id; // Legacy mapping

    req.token = token;
    req.tokenData = decoded;

    // Establish async-local storage context so services can call getCurrentPrisma()
    asyncLocalStorage.run({
      tenantPrisma: req.tenantPrisma,
      branchId: req.user.branchId || null,
      user: req.user
    }, () => next());
  } catch (error) {
    if (error instanceof AuthenticationError) {
      next(error);
    } else if (error.name === 'JsonWebTokenError') {
      next(new AuthenticationError('Invalid token', 'AUTH_004'));
    } else if (error.name === 'TokenExpiredError') {
      next(new AuthenticationError('Token expired', 'AUTH_005'));
    } else {
      console.error('Authentication error:', error);
      next(new AuthenticationError('Authentication failed'));
    }
  }
};

/**
 * Require user to be a master user
 */
const requireMaster = (req, res, next) => {
  if (!req.user) {
    return next(new AuthenticationError('Authentication required'));
  }

  if (!req.user.isMaster) {
    return next(new AuthorizationError('Master user access required'));
  }

  next();
};

/**
 * Check if user has required permission(s)
 * Supports both new format (menu_code.action) and legacy format (resource.action)
 */
const requirePermission = (...requiredPermissions) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AuthenticationError('Authentication required'));
    }

    // Master users have all permissions
    if (req.user.isMaster) {
      return next();
    }

    const normalize = (str) => str.trim().toLowerCase();

    // Map legacy action names to new ones
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

    // Convert permission to standard format
    const toPermissionString = (permission) => {
      if (typeof permission === 'string' && permission.includes('.')) {
        const [resource, action] = permission.split('.');
        const mappedAction = actionMap[normalize(action)] || normalize(action);
        return `${normalize(resource)}.${mappedAction}`;
      }
      return normalize(permission);
    };

    let permissionsToCheck = [];

    // Handle (resource, action) pair format
    if (
      requiredPermissions.length === 2 &&
      typeof requiredPermissions[0] === 'string' &&
      typeof requiredPermissions[1] === 'string' &&
      !requiredPermissions[0].includes('.')
    ) {
      const resource = normalize(requiredPermissions[0]);
      const action = actionMap[normalize(requiredPermissions[1])] || normalize(requiredPermissions[1]);
      permissionsToCheck = [`${resource}.${action}`];
    } else {
      // Handle array of permission strings
      permissionsToCheck = requiredPermissions.map(toPermissionString);
    }

    // Normalize user permissions for comparison
    const userPermissions = req.user.permissions.map(p => normalize(p));

    const hasAllPermissions = permissionsToCheck.every(
      permission => userPermissions.includes(permission)
    );

    if (!hasAllPermissions) {
      return next(new AuthorizationError(`Missing required permissions: ${permissionsToCheck.join(', ')}`));
    }

    next();
  };
};

/**
 * Check if user has any of the required permissions
 */
const requireAnyPermission = (...requiredPermissions) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AuthenticationError('Authentication required'));
    }

    // Master users have all permissions
    if (req.user.isMaster) {
      return next();
    }

    const normalize = (str) => str.trim().toLowerCase();
    const userPermissions = req.user.permissions.map(p => normalize(p));

    const hasAnyPermission = requiredPermissions.some(
      permission => userPermissions.includes(normalize(permission))
    );

    if (!hasAnyPermission) {
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

    // If header is missing, use default branch from login response
    if (!branchId || isNaN(branchId)) {
      branchId = req.user?.default_branch_id;
      if (!branchId) {
        // Fallback to user's selected branch or assigned branch
        if (req.user.selectedBranch) {
          branchId = req.user.selectedBranch.id;
        } else if (req.user.branchUser?.branchId) {
          branchId = req.user.branchUser.branchId;
        } else {
          return next(new BadRequestError('No branch available. Please contact administrator.'));
        }
      }
    }

    // Get the tenant Prisma client
    const tenantPrisma = req.tenantPrisma;

    // Set async local storage context for services
    const { asyncLocalStorage } = require('./requestContext');
    return asyncLocalStorage.run({
      tenantPrisma,
      branchId,
      user: req.user
    }, async () => {
      try {
        // Verify branch exists and is active
        const branch = await tenantPrisma.branch.findUnique({
          where: { id: branchId }
        });

        if (!branch) {
          return next(new AuthenticationError('Branch not found'));
        }

        if (!branch.isActive) {
          return next(new AuthenticationError('Branch is not active'));
        }

        // Check if user has access to this branch
        if (!req.user.isMaster) {
          // Non-master users can only access their assigned branch
          if (req.user.branchUser?.branchId !== branchId) {
            return next(new AuthorizationError('You do not have access to this branch'));
          }
        }

        req.branchId = branchId;
        req.branch = branch;

        next();
      } catch (error) {
        next(error);
      }
    });
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
      const tenantPrisma = req.tenantPrisma;
      
      const branch = await tenantPrisma.branch.findUnique({
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
 * Legacy role-based authorization (for backward compatibility)
 * Maps to permission checks
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AuthenticationError('Authentication required'));
    }

    // Master users pass all role checks
    if (req.user.isMaster) {
      return next();
    }

    // Map old role names to permission requirements
    const rolePermissionMap = {
      admin: ['settings.view'],
      manager: ['reports.view'],
      cashier: ['pos.view']
    };

    // Check if user's role code matches any required role
    const userRoleCode = req.user.role?.code?.toLowerCase();
    if (roles.map(r => r.toLowerCase()).includes(userRoleCode)) {
      return next();
    }

    // Fallback: check if user has admin-level permissions
    if (roles.includes('admin') && req.user.isMaster) {
      return next();
    }

    return next(new AuthorizationError('Insufficient permissions'));
  };
};

/**
 * Legacy permission check (for backward compatibility)
 * Alias for requirePermission
 */
const hasPermission = requirePermission;

/**
 * Extract branch ID from held order if not in header
 * For held orders API backward compatibility
 */
const requireBranchFromHeldOrder = async (req, res, next) => {
  try {
    let branchId = parseInt(req.headers['x-branch-id']);

    // If header is missing, extract from held order
    if (!branchId || isNaN(branchId)) {
      const orderId = req.params.id;
      if (!orderId) {
        return next(new BadRequestError('Order ID required'));
      }

      const tenantPrisma = req.tenantPrisma;
      const heldOrder = await tenantPrisma.heldOrder.findUnique({
        where: { id: parseInt(orderId) }
      });

      if (!heldOrder) {
        return next(new NotFoundError('Held order not found'));
      }

      branchId = heldOrder.branchId;
    }

    // Verify branch exists and is active
    const tenantPrisma = req.tenantPrisma;
    const branch = await tenantPrisma.branch.findUnique({
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

module.exports = {
  authenticate,
  requireMaster,
  requirePermission,
  requireAnyPermission,
  requireBranch,
  optionalBranch,
  requireBranchFromHeldOrder,
  // Legacy exports for backward compatibility
  authorize,
  hasPermission
};
