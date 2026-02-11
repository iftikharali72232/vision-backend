const categoryService = require('../services/category.service');

class CategoryController {
  /**
   * List categories
   * GET /categories
   */
  async index(req, res, next) {
    try {
      const data = await categoryService.getCategories(req.query, req.branchId);

      res.json({
        success: true,
        data
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get category by ID
   * GET /categories/:id
   */
  async show(req, res, next) {
    try {
      const data = await categoryService.getCategoryById(req.params.id, req.branchId);

      res.json({
        success: true,
        data
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create category
   * POST /categories
   */
  async store(req, res, next) {
    try {
      const data = await categoryService.createCategory(req.body, req.branchId);

      res.status(201).json({
        success: true,
        message: 'Category created successfully',
        data
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update category
   * PUT /categories/:id
   */
  async update(req, res, next) {
    try {
      const data = await categoryService.updateCategory(req.params.id, req.body, req.branchId);

      res.json({
        success: true,
        message: 'Category updated successfully',
        data
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete category
   * DELETE /categories/:id
   */
  async destroy(req, res, next) {
    try {
      await categoryService.deleteCategory(req.params.id, req.branchId);

      res.json({
        success: true,
        message: 'Category deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new CategoryController();
