/**
 * Authentication Controller
 * Handles all authentication-related HTTP requests
 */

const authService = require('../services/auth.service.new');

class AuthController {
  /**
   * Login
   * POST /auth/login
   */
  async login(req, res, next) {
    try {
      const { email, password } = req.body;
      const data = await authService.login(email, password);

      res.json({
        success: true,
        message: 'Login successful',
        data
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Register
   * POST /auth/register
   */
  async register(req, res, next) {
    try {
      const data = await authService.register(req.body);

      res.status(201).json({
        success: true,
        message: 'Registration successful. Please verify OTP.',
        data
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Verify OTP
   * POST /auth/verify-otp
   */
  async verifyOtp(req, res, next) {
    try {
      const { user_id, otp } = req.body;
      const data = await authService.verifyOtp(user_id, otp);

      res.json({
        success: true,
        message: 'Account verified successfully',
        data
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Resend OTP
   * POST /auth/resend-otp
   */
  async resendOtp(req, res, next) {
    try {
      const { user_id } = req.body;
      const data = await authService.resendOtp(user_id);

      res.json({
        success: true,
        message: 'OTP sent successfully',
        data
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Logout
   * POST /auth/logout
   */
  async logout(req, res, next) {
    try {
      await authService.logout(req.token);

      res.json({
        success: true,
        message: 'Logged out successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get current user profile
   * GET /auth/me
   */
  async me(req, res, next) {
    try {
      const data = await authService.getCurrentUser(req.tokenData);

      res.json({
        success: true,
        data
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Refresh token
   * POST /auth/refresh
   */
  async refresh(req, res, next) {
    try {
      const data = await authService.refreshToken(req.tokenData, req.token);

      res.json({
        success: true,
        data
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Select branch
   * POST /auth/select-branch
   */
  async selectBranch(req, res, next) {
    try {
      const { branch_id } = req.body;
      const data = await authService.selectBranch(req.tokenData, branch_id);

      res.json({
        success: true,
        data
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Change password
   * POST /auth/change-password
   */
  async changePassword(req, res, next) {
    try {
      const { current_password, new_password } = req.body;
      await authService.changePassword(req.tokenData.userId, current_password, new_password);

      res.json({
        success: true,
        message: 'Password changed successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all system permissions
   * GET /auth/permissions
   */
  async getPermissions(req, res, next) {
    try {
      const permissions = await authService.getAllPermissions();

      res.json({
        success: true,
        data: permissions
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get user's accessible branches
   * GET /auth/branches
   * Public: returns empty (branches come after login)
   * Authenticated: returns user's branches
   */
  async getBranches(req, res, next) {
    try {
      // If not authenticated, return empty (branches come after login in multi-tenant)
      if (!req.user || !req.user.tenantDb) {
        return res.json({
          success: true,
          data: []
        });
      }

      const { getTenantPrisma } = require('../config/database');
      const tenantDb = req.user.tenantDb;
      const tenantPrisma = getTenantPrisma(tenantDb);

      let branches;

      if (req.user.isMaster) {
        // Master users can access all branches
        branches = await tenantPrisma.branch.findMany({
          where: { isActive: true },
          orderBy: { name: 'asc' }
        });
      } else {
        // Non-master users can only access their assigned branch
        if (req.user.branchUser) {
          const branch = await tenantPrisma.branch.findUnique({
            where: { id: req.user.branchUser.branchId }
          });
          branches = branch ? [branch] : [];
        } else {
          branches = [];
        }
      }

      res.json({
        success: true,
        data: branches.map(branch => ({
          id: branch.id,
          name: branch.name,
          address: branch.address,
          phone: branch.phone,
          isActive: branch.isActive
        }))
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AuthController();
