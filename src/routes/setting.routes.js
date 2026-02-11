const express = require('express');
const router = express.Router();
const settingController = require('../controllers/setting.controller');
const { authenticate, authorize } = require('../middlewares/auth');
const validate = require('../middlewares/validate');
const settingValidation = require('../validations/setting.validation');

// All routes require authentication
router.use(authenticate);

/**
 * @route GET /api/v1/settings
 * @desc Get settings
 * @access Private - Admin/Owner
 */
router.get(
  '/',
  authorize('admin', 'owner', 'super_admin'),
  settingController.index
);

/**
 * @route PUT /api/v1/settings
 * @desc Update settings
 * @access Private - Admin/Owner
 */
router.put(
  '/',
  authorize('admin', 'owner', 'super_admin'),
  validate(settingValidation.updateSettings),
  settingController.update
);

module.exports = router;
