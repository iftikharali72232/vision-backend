/**
 * Authentication Service
 * Handles user authentication, registration, OTP verification, and session management
 * Uses system database for authentication, tenant database for business data
 */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { 
  systemPrisma, 
  getTenantPrisma, 
  buildTenantDbName 
} = require('../config/database');
const { jwt: jwtConfig, bcrypt: bcryptConfig } = require('../config/constants');
const { AuthenticationError, NotFoundError, AppError } = require('../middlewares/errorHandler');

class AuthService {
  /**
   * Login user with email and password
   * @param {string} email - User email
   * @param {string} password - User password
   * @returns {object} Login response with token, user, company, branches, permissions
   */
  async login(email, password) {
    // Find user in system database
    const systemUser = await systemPrisma.systemUser.findUnique({
      where: { email },
      include: {
        company: true
      }
    });

    if (!systemUser) {
      throw new AuthenticationError('Invalid email or password', 'AUTH_001');
    }

    if (systemUser.status === 'inactive' || systemUser.status === 'suspended') {
      throw new AuthenticationError('Your account has been deactivated', 'AUTH_002');
    }

    if (systemUser.status === 'pending') {
      throw new AuthenticationError('Please verify your account first', 'AUTH_OTP');
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, systemUser.password);
    if (!isValidPassword) {
      throw new AuthenticationError('Invalid email or password', 'AUTH_001');
    }

    // Get company and tenant data
    const company = systemUser.company;
    if (!company) {
      throw new AppError('No company associated with this account', 400, 'AUTH_003');
    }

    if (company.status === 'inactive' || company.status === 'suspended') {
      throw new AppError('Your company account has been suspended', 403, 'AUTH_004');
    }

    // Get tenant database connection
    const tenantPrisma = getTenantPrisma(company.tenantDb);

    // Get branches user has access to
    const branchUsers = await tenantPrisma.branchUser.findMany({
      where: {
        systemUserId: systemUser.id,
        isActive: true
      },
      include: {
        branch: true
      }
    });

    // If master user, get all branches
    let branches = [];
    if (systemUser.isMaster) {
      const allBranches = await tenantPrisma.branch.findMany({
        where: { isActive: true },
        orderBy: { isMain: 'desc' }
      });
      branches = allBranches.map(branch => ({
        id: branch.id,
        name: branch.name,
        code: branch.code,
        address: branch.address,
        city: branch.city,
        phone: branch.phone,
        is_active: branch.isActive,
        is_main: branch.isMain,
        role: 'owner'
      }));
    } else {
      branches = branchUsers.map(bu => ({
        id: bu.branch.id,
        name: bu.branch.name,
        code: bu.branch.code,
        address: bu.branch.address,
        city: bu.branch.city,
        phone: bu.branch.phone,
        is_active: bu.branch.isActive,
        is_main: bu.branch.isMain,
        role_id: bu.roleId
      }));
    }

    // Get user's role and permissions
    let permissions = [];
    let roleId = null;
    
    if (systemUser.isMaster) {
      // Master user has all permissions
      permissions = await this.getAllPermissions();
      roleId = 'master';
    } else if (branchUsers.length > 0) {
      // Get permissions from first branch's role
      roleId = branchUsers[0].roleId;
      permissions = await this.getPermissionsByRoleId(roleId);
    }

    // Generate JWT token
    const accessToken = this.generateToken({
      userId: systemUser.id,
      companyId: company.id,
      tenantDb: company.tenantDb,
      isMaster: systemUser.isMaster
    });
    const expiresIn = this.getExpiresInSeconds();

    // Save token to system database
    await systemPrisma.token.create({
      data: {
        userId: systemUser.id,
        token: accessToken,
        type: 'access',
        expiresAt: new Date(Date.now() + expiresIn * 1000)
      }
    });

    // Update last login
    await systemPrisma.systemUser.update({
      where: { id: systemUser.id },
      data: { lastLoginAt: new Date() }
    });

    return {
      user: {
        id: systemUser.id,
        name: systemUser.name,
        email: systemUser.email,
        phone: systemUser.phone,
        avatar: systemUser.avatar,
        is_master: systemUser.isMaster,
        status: systemUser.status
      },
      company: {
        id: company.id,
        name: company.name,
        slug: company.slug,
        logo: company.logo,
        status: company.status
      },
      branches,
      permissions,
      role_id: roleId,
      token: accessToken,
      token_type: 'Bearer',
      expires_in: expiresIn
    };
  }

  /**
   * Register new user and company
   * @param {object} userData - Registration data
   * @returns {object} Registration response
   */
  async register(userData) {
    const { email, password, name, phone, company_name } = userData;

    // Check if email already exists
    const existingUser = await systemPrisma.systemUser.findUnique({
      where: { email }
    });

    if (existingUser) {
      throw new AppError('Email already registered', 409, 'AUTH_005');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, bcryptConfig.saltRounds);

    // Generate company slug
    const slug = this.generateSlug(company_name || name);

    // Check if slug exists
    const existingCompany = await systemPrisma.company.findUnique({
      where: { slug }
    });

    if (existingCompany) {
      throw new AppError('Company name already taken', 409, 'AUTH_006');
    }

    // Create user and company in transaction
    const result = await systemPrisma.$transaction(async (tx) => {
      // Create company first (without tenant_db, will be set after OTP verification)
      const tempTenantDb = `pending_${Date.now()}`;
      const company = await tx.company.create({
        data: {
          name: company_name || `${name}'s Company`,
          slug,
          email,
          phone,
          tenantDb: tempTenantDb,
          status: 'trial',
          trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) // 14 days trial
        }
      });

      // Create user
      const user = await tx.systemUser.create({
        data: {
          companyId: company.id,
          email,
          password: hashedPassword,
          name,
          phone,
          status: 'pending',
          isMaster: true // First user is always master
        }
      });

      // Generate OTP
      const otp = this.generateOtp();
      await tx.userOtp.create({
        data: {
          userId: user.id,
          code: otp,
          expiresAt: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
        }
      });

      // TODO: Send OTP via email/SMS
      if (process.env.NODE_ENV !== 'production') {
        console.log(`[OTP] user=${user.id} email=${user.email} otp=${otp}`);
      }

      return { user, company, otp };
    });

    return {
      user_id: result.user.id,
      email: result.user.email,
      otp_sent_to: 'email',
      message: 'Please verify your email with the OTP sent'
    };
  }

  /**
   * Verify OTP and provision tenant database
   * @param {number} userId - User ID
   * @param {string} otp - OTP code
   * @returns {object} Verification response
   */
  async verifyOtp(userId, otp) {
    const id = parseInt(userId);

    // Get user with company
    const user = await systemPrisma.systemUser.findUnique({
      where: { id },
      include: { company: true }
    });

    if (!user) {
      throw new NotFoundError('User');
    }

    // Get latest OTP
    const latestOtp = await systemPrisma.userOtp.findFirst({
      where: { userId: id, consumedAt: null },
      orderBy: { createdAt: 'desc' }
    });

    if (!latestOtp) {
      throw new AppError('OTP not found. Please request a new one.', 422, 'AUTH_OTP_01');
    }

    if (latestOtp.expiresAt.getTime() < Date.now()) {
      throw new AppError('OTP has expired. Please request a new one.', 422, 'AUTH_OTP_02');
    }

    if (latestOtp.attempts >= 5) {
      throw new AppError('Too many failed attempts. Please request a new OTP.', 429, 'AUTH_OTP_03');
    }

    if (String(latestOtp.code) !== String(otp)) {
      await systemPrisma.userOtp.update({
        where: { id: latestOtp.id },
        data: { attempts: latestOtp.attempts + 1 }
      });
      throw new AppError('Invalid OTP', 422, 'AUTH_OTP_04');
    }

    // Consume OTP
    await systemPrisma.userOtp.update({
      where: { id: latestOtp.id },
      data: { consumedAt: new Date() }
    });

    // Provision tenant database
    const tenantDbName = buildTenantDbName(user.companyId);
    await this.provisionTenantDatabase(user, tenantDbName);

    // Update user and company status
    await systemPrisma.$transaction([
      systemPrisma.systemUser.update({
        where: { id: user.id },
        data: {
          status: 'active',
          emailVerifiedAt: new Date()
        }
      }),
      systemPrisma.company.update({
        where: { id: user.companyId },
        data: {
          tenantDb: tenantDbName,
          status: 'active'
        }
      })
    ]);

    return {
      verified: true,
      message: 'Account verified successfully. You can now login.',
      company: {
        id: user.companyId,
        tenant_db: tenantDbName
      }
    };
  }

  /**
   * Resend OTP
   * @param {number} userId - User ID
   * @returns {object} Response
   */
  async resendOtp(userId) {
    const id = parseInt(userId);

    const user = await systemPrisma.systemUser.findUnique({
      where: { id }
    });

    if (!user) {
      throw new NotFoundError('User');
    }

    // Generate new OTP
    const otp = this.generateOtp();
    await systemPrisma.userOtp.create({
      data: {
        userId: user.id,
        code: otp,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000)
      }
    });

    // TODO: Send OTP via email/SMS
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[OTP RESEND] user=${user.id} email=${user.email} otp=${otp}`);
    }

    return {
      sent: true,
      message: 'New OTP sent successfully'
    };
  }

  /**
   * Logout user
   * @param {string} token - Access token
   * @returns {object} Response
   */
  async logout(token) {
    await systemPrisma.token.updateMany({
      where: { token },
      data: { isRevoked: true }
    });

    return { message: 'Logged out successfully' };
  }

  /**
   * Get current user profile
   * @param {object} tokenData - Decoded token data
   * @returns {object} User profile
   */
  async getCurrentUser(tokenData) {
    const { userId, companyId, tenantDb } = tokenData;

    // Get system user
    const systemUser = await systemPrisma.systemUser.findUnique({
      where: { id: userId },
      include: { company: true }
    });

    if (!systemUser) {
      throw new NotFoundError('User');
    }

    // Get tenant data
    const tenantPrisma = getTenantPrisma(tenantDb);
    
    // Get branch access
    let branches = [];
    let currentBranch = null;
    let permissions = [];

    if (systemUser.isMaster) {
      const allBranches = await tenantPrisma.branch.findMany({
        where: { isActive: true },
        orderBy: { isMain: 'desc' }
      });
      branches = allBranches.map(b => ({
        id: b.id,
        name: b.name,
        code: b.code,
        is_main: b.isMain,
        role: 'owner'
      }));
      currentBranch = branches.find(b => b.is_main) || branches[0];
      permissions = await this.getAllPermissions();
    } else {
      const branchUsers = await tenantPrisma.branchUser.findMany({
        where: {
          systemUserId: userId,
          isActive: true
        },
        include: { branch: true }
      });
      branches = branchUsers.map(bu => ({
        id: bu.branch.id,
        name: bu.branch.name,
        code: bu.branch.code,
        is_main: bu.branch.isMain,
        role_id: bu.roleId
      }));
      if (branchUsers.length > 0) {
        const mainBranch = branchUsers.find(bu => bu.branch.isMain) || branchUsers[0];
        currentBranch = branches.find(b => b.id === mainBranch.branchId);
        permissions = await this.getPermissionsByRoleId(mainBranch.roleId);
      }
    }

    return {
      user: {
        id: systemUser.id,
        name: systemUser.name,
        email: systemUser.email,
        phone: systemUser.phone,
        avatar: systemUser.avatar,
        is_master: systemUser.isMaster,
        status: systemUser.status
      },
      company: {
        id: systemUser.company.id,
        name: systemUser.company.name,
        logo: systemUser.company.logo
      },
      branches,
      current_branch: currentBranch,
      permissions
    };
  }

  /**
   * Select branch for current session
   * @param {object} tokenData - Decoded token data
   * @param {number} branchId - Branch ID
   * @returns {object} Branch data with settings
   */
  async selectBranch(tokenData, branchId) {
    const { userId, tenantDb } = tokenData;
    const tenantPrisma = getTenantPrisma(tenantDb);

    // Get branch
    const branch = await tenantPrisma.branch.findUnique({
      where: { id: parseInt(branchId) }
    });

    if (!branch) {
      throw new NotFoundError('Branch');
    }

    if (!branch.isActive) {
      throw new AppError('Branch is inactive', 400, 'BRANCH_001');
    }

    // Check access (skip for master users)
    const systemUser = await systemPrisma.systemUser.findUnique({
      where: { id: userId }
    });

    if (!systemUser.isMaster) {
      const branchAccess = await tenantPrisma.branchUser.findFirst({
        where: {
          systemUserId: userId,
          branchId: branch.id,
          isActive: true
        }
      });

      if (!branchAccess) {
        throw new AppError('You do not have access to this branch', 403, 'BRANCH_002');
      }
    }

    // Get branch settings
    const settings = branch.settings || {
      currency: 'PKR',
      currency_symbol: 'Rs.',
      tax_rate: 16,
      tax_type: 'exclusive',
      receipt_header: branch.name,
      receipt_footer: 'Thank you for your visit!'
    };

    return {
      branch: {
        id: branch.id,
        name: branch.name,
        code: branch.code,
        address: branch.address,
        city: branch.city,
        phone: branch.phone,
        email: branch.email,
        is_active: branch.isActive,
        is_main: branch.isMain,
        settings
      }
    };
  }

  /**
   * Change password
   * @param {number} userId - User ID
   * @param {string} currentPassword - Current password
   * @param {string} newPassword - New password
   * @returns {object} Response
   */
  async changePassword(userId, currentPassword, newPassword) {
    const user = await systemPrisma.systemUser.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new NotFoundError('User');
    }

    // Verify current password
    const isValid = await bcrypt.compare(currentPassword, user.password);
    if (!isValid) {
      throw new AuthenticationError('Current password is incorrect', 'AUTH_007');
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, bcryptConfig.saltRounds);

    // Update password and revoke all tokens
    await systemPrisma.$transaction([
      systemPrisma.systemUser.update({
        where: { id: userId },
        data: { password: hashedPassword }
      }),
      systemPrisma.token.updateMany({
        where: { userId },
        data: { isRevoked: true }
      })
    ]);

    return { message: 'Password changed successfully' };
  }

  /**
   * Refresh access token
   * @param {object} tokenData - Current token data
   * @param {string} oldToken - Current token
   * @returns {object} New token data
   */
  async refreshToken(tokenData, oldToken) {
    const { userId, companyId, tenantDb, isMaster } = tokenData;

    // Revoke old token
    await systemPrisma.token.updateMany({
      where: { token: oldToken },
      data: { isRevoked: true }
    });

    // Generate new token
    const accessToken = this.generateToken({
      userId,
      companyId,
      tenantDb,
      isMaster
    });
    const expiresIn = this.getExpiresInSeconds();

    // Save new token
    await systemPrisma.token.create({
      data: {
        userId,
        token: accessToken,
        type: 'access',
        expiresAt: new Date(Date.now() + expiresIn * 1000)
      }
    });

    return {
      token: accessToken,
      token_type: 'Bearer',
      expires_in: expiresIn
    };
  }

  // ================== HELPER METHODS ==================

  /**
   * Generate JWT token
   */
  generateToken(payload) {
    return jwt.sign(payload, jwtConfig.secret, { expiresIn: jwtConfig.expiresIn });
  }

  /**
   * Get token expiration in seconds
   */
  getExpiresInSeconds() {
    const expiresIn = jwtConfig.expiresIn;
    if (expiresIn.endsWith('h')) return parseInt(expiresIn) * 3600;
    if (expiresIn.endsWith('d')) return parseInt(expiresIn) * 86400;
    return parseInt(expiresIn);
  }

  /**
   * Generate 6-digit OTP
   */
  generateOtp() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Generate URL-safe slug
   */
  generateSlug(text) {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      + '-' + Date.now().toString(36);
  }

  /**
   * Get all permissions (for master users)
   */
  async getAllPermissions() {
    const menus = await systemPrisma.systemMenu.findMany({
      where: { isActive: true },
      select: { code: true }
    });

    const permissions = [];
    for (const menu of menus) {
      permissions.push(
        `${menu.code}.view`,
        `${menu.code}.create`,
        `${menu.code}.update`,
        `${menu.code}.delete`,
        `${menu.code}.export`,
        `${menu.code}.print`
      );
    }
    return permissions;
  }

  /**
   * Get permissions by role ID
   */
  async getPermissionsByRoleId(roleId) {
    const rolePermissions = await systemPrisma.rolePermission.findMany({
      where: { roleId: parseInt(roleId) },
      include: { menu: true }
    });

    const permissions = [];
    for (const rp of rolePermissions) {
      if (rp.canView) permissions.push(`${rp.menu.code}.view`);
      if (rp.canCreate) permissions.push(`${rp.menu.code}.create`);
      if (rp.canUpdate) permissions.push(`${rp.menu.code}.update`);
      if (rp.canDelete) permissions.push(`${rp.menu.code}.delete`);
      if (rp.canExport) permissions.push(`${rp.menu.code}.export`);
      if (rp.canPrint) permissions.push(`${rp.menu.code}.print`);
    }
    return permissions;
  }

  /**
   * Provision tenant database
   */
  async provisionTenantDatabase(user, tenantDbName) {
    const tenantService = require('./tenant.service');
    await tenantService.provisionTenantForCompany(user.companyId, tenantDbName, {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone
    });
  }
}

module.exports = new AuthService();
