const settingService = require('../services/setting.service');

class SettingController {
  /**
   * Get settings
   * GET /settings
   */
  async index(req, res, next) {
    try {
      const data = await settingService.getSettings();

      res.json({
        success: true,
        data
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update settings
   * PUT /settings
   */
  async update(req, res, next) {
    try {
      const data = await settingService.updateSettings(req.body);

      res.json({
        success: true,
        message: 'Settings updated successfully',
        data
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new SettingController();
