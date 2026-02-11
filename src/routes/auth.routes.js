const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller.new');
const { authenticate } = require('../middlewares/auth.new');
const validate = require('../middlewares/validate');
const authValidation = require('../validations/auth.validation');

/**
 * @route POST /api/v1/auth/register
 * @desc Register new user
 * @access Public
 */
router.post(
  '/register',
  validate(authValidation.register),
  authController.register
);

/**
 * @route POST /api/v1/auth/verify-otp
 * @desc Verify OTP and provision tenant DB
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
 * @desc Logout user
 * @access Private
 */
router.post(
  '/logout',
  authenticate,
  authController.logout
);

/**
 * @route GET /api/v1/auth/me
 * @desc Get current user
 * @access Private
 */
router.get(
  '/me',
  authenticate,
  authController.me
);

/**
 * @route POST /api/v1/auth/refresh
 * @desc Refresh token
 * @access Private
 */
router.post(
  '/refresh',
  authenticate,
  authController.refresh
);

/**
 * @route POST /api/v1/auth/select-branch
 * @desc Select branch for session
 * @access Private
 */
router.post(
  '/select-branch',
  authenticate,
  authController.selectBranch
);

/**
 * @route GET /api/v1/auth/branches
 * @desc Get public branches (for login page)
 * @access Public
 */
router.get(
  '/branches',
  authController.getBranches
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

module.exports = router;
