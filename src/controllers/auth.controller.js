const authService = require('../services/auth.service');

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
        message: 'OTP sent to your email/phone',
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
        message: 'OTP resent successfully',
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
   * Get current user
   * GET /auth/me
   */
  async me(req, res, next) {
    try {
      const data = await authService.getCurrentUser(req.user.id);

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
      const data = await authService.refreshToken(req.user.id, req.token);

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
      const data = await authService.selectBranch(req.user.id, branch_id);

      res.json({
        success: true,
        data
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get public branches (for login page)
   * GET /auth/branches
   */
  async getBranches(req, res, next) {
    try {
      const data = await authService.getPublicBranches();

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
      await authService.changePassword(req.user.id, current_password, new_password);

      res.json({
        success: true,
        message: 'Password changed successfully'
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AuthController();
