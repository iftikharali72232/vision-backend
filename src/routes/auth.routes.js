const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { authenticate, requireMaster } = require('../middlewares/auth');
const validate = require('../middlewares/validate');
const authValidation = require('../validations/auth.validation');

/**
 * @route POST /api/v1/auth/register
 * @desc Register new user (creates master user and company)
 * @access Public
 */
router.post(
  '/register',
  validate(authValidation.register),
  authController.register
);

/**
 * @route POST /api/v1/auth/verify-otp
 * @desc Verify OTP and provision tenant database
 * @access Public
 */
router.post(
  '/verify-otp',
  validate(authValidation.verifyOtp),
  authController.verifyOtp
);

/**
 * @route POST /api/v1/auth/resend-otp
 * @desc Resend OTP for a user
 * @access Public
 */
router.post(
  '/resend-otp',
  validate(authValidation.resendOtp),
  authController.resendOtp
);

/**
 * @route POST /api/v1/auth/login
 * @desc Login user
 * @access Public
 */
router.post(
  '/login',
  validate(authValidation.login),
  authController.login
);

/**
 * @route POST /api/v1/auth/logout
 * @desc Logout user and revoke token
 * @access Private
 */
router.post(
  '/logout',
  authenticate,
  authController.logout
);

/**
 * @route GET /api/v1/auth/me
 * @desc Get current user profile with permissions
 * @access Private
 */
router.get(
  '/me',
  authenticate,
  authController.me
);

/**
 * @route POST /api/v1/auth/refresh
 * @desc Refresh access token
 * @access Private
 */
router.post(
  '/refresh',
  authenticate,
  authController.refresh
);

/**
 * @route POST /api/v1/auth/select-branch
 * @desc Select branch for session (master users)
 * @access Private
 */
router.post(
  '/select-branch',
  authenticate,
  authController.selectBranch
);

/**
 * @route POST /api/v1/auth/change-password
 * @desc Change password
 * @access Private
 */
router.post(
  '/change-password',
  authenticate,
  validate(authValidation.changePassword),
  authController.changePassword
);

/**
 * @route GET /api/v1/auth/permissions
 * @desc Get all system permissions (for role management)
 * @access Private (Master only)
 */
router.get(
  '/permissions',
  authenticate,
  requireMaster,
  authController.getPermissions
);

/**
 * @route GET /api/v1/auth/branches
 * @desc Get user's accessible branches
 * @access Private
 */
router.get(
  '/branches',
  authenticate,
  authController.getBranches
);

module.exports = router;
