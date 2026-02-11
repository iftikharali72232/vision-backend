const userService = require('../services/user.service');

class UserController {
  /**
   * List users
   * GET /users
   */
  async index(req, res, next) {
    try {
      const data = await userService.getUsers(req.query);

      res.json({
        success: true,
        data
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get user by ID
   * GET /users/:id
   */
  async show(req, res, next) {
    try {
      const data = await userService.getUserById(req.params.id);

      res.json({
        success: true,
        data
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create user
   * POST /users
   */
  async store(req, res, next) {
    try {
      const data = await userService.createUser(req.body);

      res.status(201).json({
        success: true,
        message: 'User created successfully',
        data
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update user
   * PUT /users/:id
   */
  async update(req, res, next) {
    try {
      const data = await userService.updateUser(req.params.id, req.body);

      res.json({
        success: true,
        message: 'User updated successfully',
        data
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete user
   * DELETE /users/:id
   */
  async destroy(req, res, next) {
    try {
      await userService.deleteUser(req.params.id);

      res.json({
        success: true,
        message: 'User deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Reset user password
   * POST /users/:id/reset-password
   */
  async resetPassword(req, res, next) {
    try {
      const { new_password } = req.body;
      await userService.resetPassword(req.params.id, new_password);

      res.json({
        success: true,
        message: 'Password reset successfully'
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new UserController();
