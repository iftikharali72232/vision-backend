const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { masterPrisma, getTenantPrismaByDbName } = require('../config/prismaManager');
const userService = require('../services/user.service');
const { jwt: jwtConfig, bcrypt: bcryptConfig, permissions: rolePermissions } = require('../config/constants');
const { AuthenticationError, NotFoundError, AppError } = require('../middlewares/errorHandler');
const tenantService = require('./tenant.service');
const { buildTenantDatabaseUrl, parseMysqlUrl } = require('../utils/mysqlUrl');

class AuthService {
  /**
   * Login user and return tokens
   */
  async login(email, password) {
    // Master user is the source of truth for credentials and tenant mapping
    const masterUser = await masterPrisma.user.findUnique({
      where: { email }
    });

    if (!masterUser) {
      throw new AuthenticationError('Invalid credentials', 'AUTH_001');
    }

    if (!masterUser.isActive) {
      throw new AuthenticationError('Account is deactivated', 'AUTH_001');
    }

    if (!masterUser.isVerified) {
      throw new AuthenticationError('Please verify OTP before login', 'AUTH_OTP');
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, masterUser.password);
    if (!isValidPassword) {
      throw new AuthenticationError('Invalid credentials', 'AUTH_001');
    }

    // Resolve tenant DB (fallback to master DB for existing/demo users)
    const masterUrl = process.env.DATABASE_URL;
    const masterDbName = parseMysqlUrl(masterUrl).database;
    const tenantDbName = masterUser.tenantDb || masterDbName;
    const tenantUrl = buildTenantDatabaseUrl(masterUrl, tenantDbName);

    const tenantPrisma = getTenantPrismaByDbName(tenantDbName);

    // Find tenant user with branch access and shop info
    const user = await tenantPrisma.user.findUnique({
      where: { email },
      include: {
        branchAccess: {
          where: { isActive: true },
          include: {
            branch: {
              include: {
                shop: true
              }
            }
          }
        },
        ownedShops: true
      }
    });

    if (!user) {
      // Tenant DB not provisioned correctly
      throw new AuthenticationError('Account tenant is not ready', 'AUTH_002');
    }

    if (!user.isActive) {
      throw new AuthenticationError('Account is deactivated', 'AUTH_001');
    }

    // Generate token
    const accessToken = this.generateToken(user.id);
    const expiresIn = this.getExpiresInSeconds();

    // Save token
    await masterPrisma.token.create({
      data: {
        userId: user.id,
        token: accessToken,
        type: 'access',
        expiresAt: new Date(Date.now() + expiresIn * 1000)
      }
    });

    // Update last login
    await Promise.all([
      masterPrisma.user.update({
        where: { id: masterUser.id },
        data: { lastLoginAt: new Date() }
      }),
      tenantPrisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() }
      })
    ]);

    // Group branches by shop
    const shopMap = new Map();
    
    // Add owned shops first
    for (const shop of user.ownedShops) {
      shopMap.set(shop.id, {
        id: shop.id,
        name: shop.name,
        slug: shop.slug,
        logo: shop.logo,
        is_active: shop.isActive,
        is_ecom_enabled: shop.isEcomEnabled,
        branches: []
      });
    }
    
    // Add branches with access
    for (const access of user.branchAccess) {
      const shop = access.branch.shop;
      if (!shopMap.has(shop.id)) {
        shopMap.set(shop.id, {
          id: shop.id,
          name: shop.name,
          slug: shop.slug,
          logo: shop.logo,
          is_active: shop.isActive,
          is_ecom_enabled: shop.isEcomEnabled,
          branches: []
        });
      }
      
      shopMap.get(shop.id).branches.push({
        id: access.branch.id,
        name: access.branch.name,
        code: access.branch.code,
        address: access.branch.address,
        city: access.branch.city,
        phone: access.branch.phone,
        is_active: access.branch.isActive,
        is_main: access.branch.isMain,
        role: access.role
      });
    }

    // Get permissions based on first branch role (or owner if owns shops)
    const primaryRole = user.ownedShops.length > 0 ? 'owner' : 
      (user.branchAccess[0]?.role || 'cashier');
    const permissions = rolePermissions[primaryRole] || [];

    // Structure response as per master contract with shops array
    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        avatar: user.avatar,
        is_active: user.isActive
      },
      token: accessToken,
      token_type: 'Bearer',
      expires_in: expiresIn,
      shops: Array.from(shopMap.values()),
      permissions
    };
  }

  /**
   * Register new user and create OTP (no tenant provisioning here)
   */
  async register(userData) {
    // masterPrisma already imported at top level
    const { email, password, name, phone } = userData;

    // Create user in master (not verified)
    const hashedPassword = await bcrypt.hash(password, bcryptConfig.saltRounds);

    const existing = await masterPrisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new AppError('Email already exists', 409, 'AUTH_003');
    }

    const user = await masterPrisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        phone: phone || null,
        isActive: true,
        isVerified: false
      }
    });

    const otp = this.generateOtp();
    await masterPrisma.userOtp.create({
      data: {
        userId: user.id,
        code: otp,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
      }
    });

    // TODO: integrate SMS/email provider. For now, log OTP in dev.
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[OTP] user=${user.id} email=${user.email} otp=${otp}`);
    }

    return { user_id: user.id, otp_sent_to: 'email' };
  }

  /**
   * Generate a 6-digit OTP
   */
  generateOtp() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Verify OTP and provision tenant DB
   */
  async verifyOtp(userId, otp) {
    // masterPrisma already imported at top level
    const id = parseInt(userId);

    const user = await masterPrisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundError('User');
    }

    const latestOtp = await masterPrisma.userOtp.findFirst({
      where: { userId: id, consumedAt: null },
      orderBy: { createdAt: 'desc' }
    });

    if (!latestOtp) {
      throw new AppError('OTP not found', 422, 'AUTH_OTP');
    }

    if (latestOtp.expiresAt.getTime() < Date.now()) {
      throw new AppError('OTP expired', 422, 'AUTH_OTP');
    }

    if (latestOtp.attempts >= 5) {
      throw new AppError('Too many OTP attempts', 429, 'AUTH_OTP');
    }

    if (String(latestOtp.code) !== String(otp)) {
      await masterPrisma.userOtp.update({
        where: { id: latestOtp.id },
        data: { attempts: latestOtp.attempts + 1 }
      });
      throw new AppError('Invalid OTP', 422, 'AUTH_OTP');
    }

    // Consume OTP
    await masterPrisma.userOtp.update({
      where: { id: latestOtp.id },
      data: { consumedAt: new Date() }
    });

    // Provision tenant DB only once
    let tenantDb = user.tenantDb;
    if (!tenantDb) {
      const provisioned = await tenantService.provisionTenantForUser(user);
      tenantDb = provisioned.dbName;
    }

    await masterPrisma.user.update({
      where: { id: user.id },
      data: {
        isVerified: true,
        tenantDb,
        emailVerifiedAt: new Date()
      }
    });

    return { verified: true, tenant: { db: tenantDb } };
  }

  /**
   * Resend OTP
   */
  async resendOtp(userId) {
    // masterPrisma already imported at top level
    const id = parseInt(userId);

    const user = await masterPrisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundError('User');
    }

    const otp = this.generateOtp();
    await masterPrisma.userOtp.create({
      data: {
        userId: user.id,
        code: otp,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000)
      }
    });

    if (process.env.NODE_ENV !== 'production') {
      console.log(`[OTP] RESEND user=${user.id} email=${user.email} otp=${otp}`);
    }

    return { sent: true };
  }

  /**
   * Logout user and revoke token
   */
  async logout(token) {
    // masterPrisma already imported at top level
    await masterPrisma.token.updateMany({
      where: { token },
      data: { isRevoked: true }
    });

    return { message: 'Logged out successfully' };
  }

  /**
   * Get current user details
   */
  async getCurrentUser(userId) {
    // masterPrisma already imported at top level
    const masterUser = await masterPrisma.user.findUnique({ where: { id: userId } });
    if (!masterUser) {
      throw new NotFoundError('User');
    }

    const masterUrl = process.env.DATABASE_URL;
    const masterDbName = parseMysqlUrl(masterUrl).database;
    const tenantDbName = masterUser.tenantDb || masterDbName;
    const tenantPrisma = getTenantPrismaByDbName(tenantDbName);

    const user = await tenantPrisma.user.findUnique({
      where: { id: userId },
      include: {
        branchAccess: {
          where: { isActive: true },
          include: {
            branch: {
              include: {
                shop: true
              }
            }
          }
        },
        ownedShops: true
      }
    });

    if (!user) {
      throw new NotFoundError('User');
    }

    const primaryRole = user.ownedShops.length > 0 ? 'owner' : 
      (user.branchAccess[0]?.role || 'cashier');
    const permissions = rolePermissions[primaryRole] || [];
    const currentAccess = user.branchAccess[0];
    const currentBranch = currentAccess?.branch || null;

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: primaryRole,
        avatar: user.avatar,
        phone: user.phone,
        is_active: user.isActive,
        created_at: user.createdAt
      },
      current_branch: currentBranch ? {
        id: currentBranch.id,
        shop_id: currentBranch.shopId,
        name: currentBranch.name,
        code: currentBranch.code,
        address: currentBranch.address,
        city: currentBranch.city,
        phone: currentBranch.phone,
        is_active: currentBranch.isActive,
        is_main: currentBranch.isMain,
        settings: currentBranch.settings || {
          currency: 'PKR',
          currency_symbol: 'Rs.',
          tax_rate: 16,
          receipt_header: 'Welcome!',
          receipt_footer: 'Thank you!'
        }
      } : null,
      permissions
    };
  }

  /**
   * Refresh access token
   */
  async refreshToken(userId, oldToken) {
    // masterPrisma already imported at top level
    // Revoke old token
    await masterPrisma.token.updateMany({
      where: { token: oldToken },
      data: { isRevoked: true }
    });

    // Generate new token
    const accessToken = this.generateToken(userId);
    const expiresIn = this.getExpiresInSeconds();

    // Save new token
    await masterPrisma.token.create({
      data: {
        userId,
        token: accessToken,
        type: 'access',
        expiresAt: new Date(Date.now() + expiresIn * 1000)
      }
    });

    return {
      // Keep both snake_case and camelCase for frontend compatibility
      access_token: accessToken,
      accessToken,
      token: accessToken,
      token_type: 'Bearer',
      expires_in: expiresIn
    };
  }

  /**
   * Select branch for current session
   */
  async selectBranch(userId, branchId) {
    // masterPrisma already imported at top level
    const masterUser = await masterPrisma.user.findUnique({ where: { id: userId } });
    if (!masterUser) throw new NotFoundError('User');

    const masterUrl = process.env.DATABASE_URL;
    const masterDbName = parseMysqlUrl(masterUrl).database;
    const tenantDbName = masterUser.tenantDb || masterDbName;
    const prisma = getTenantPrismaByDbName(tenantDbName);

    // Verify user has access to this branch
    const userAccess = await prisma.userBranchAccess.findFirst({
      where: {
        userId,
        branchId: parseInt(branchId),
        isActive: true
      },
      include: {
        branch: {
          include: {
            shop: true
          }
        }
      }
    });

    if (!userAccess) {
      throw new NotFoundError('Branch access not found');
    }

    if (!userAccess.branch.isActive) {
      throw new AppError('Branch is inactive', 400, 'BRANCH_INACTIVE');
    }

    return {
      branch: {
        id: userAccess.branch.id,
        shop_id: userAccess.branch.shopId,
        name: userAccess.branch.name,
        code: userAccess.branch.code,
        address: userAccess.branch.address,
        city: userAccess.branch.city,
        phone: userAccess.branch.phone,
        is_active: userAccess.branch.isActive,
        is_main: userAccess.branch.isMain,
        settings: userAccess.branch.settings || {
          currency: 'PKR',
          currency_symbol: 'Rs.',
          tax_rate: 16,
          receipt_header: 'Welcome!',
          receipt_footer: 'Thank you!'
        }
      },
      role: userAccess.role
    };
  }

  /**
   * Get public branches list for login page
   */
  async getPublicBranches() {
    const branches = await masterPrisma.branch.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        address: true
      },
      orderBy: { name: 'asc' }
    });

    return {
      items: branches
    };
  }

  /**
   * Change password
   */
  async changePassword(userId, currentPassword, newPassword) {
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new NotFoundError('User');
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, user.password);
    if (!isValidPassword) {
      throw new AuthenticationError('Current password is incorrect', 'AUTH_001');
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, bcryptConfig.saltRounds);

    // Update password
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword }
    });

    // Revoke all existing tokens
    await prisma.token.updateMany({
      where: { userId },
      data: { isRevoked: true }
    });

    return { message: 'Password changed successfully' };
  }

  /**
   * Generate JWT token
   */
  generateToken(userId) {
    return jwt.sign(
      { userId },
      jwtConfig.secret,
      { expiresIn: jwtConfig.expiresIn }
    );
  }

  /**
   * Get expiration time in seconds
   */
  getExpiresInSeconds() {
    const expiresIn = jwtConfig.expiresIn;
    if (expiresIn.endsWith('h')) {
      return parseInt(expiresIn) * 3600;
    }
    if (expiresIn.endsWith('d')) {
      return parseInt(expiresIn) * 86400;
    }
    return parseInt(expiresIn);
  }
}

module.exports = new AuthService();
