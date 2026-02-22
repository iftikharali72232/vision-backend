const productService = require('../services/product.service');

class ProductController {
  /**
   * List products
   * GET /products
   */
  async index(req, res, next) {
    try {
      const data = await productService.getProducts(req.query, req.branchId);

      res.json({
        success: true,
        data
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get products for POS
   * GET /products/pos
   */
  async pos(req, res, next) {
    try {
      const data = await productService.getProductsForPOS(req.query, req.branchId);

      res.json({
        success: true,
        data
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get product by barcode
   * GET /products/barcode/:barcode
   */
  async byBarcode(req, res, next) {
    try {
      const data = await productService.getProductByBarcode(req.params.barcode, req.branchId);

      res.json({
        success: true,
        data
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get low stock products
   * GET /products/low-stock
   */
  async lowStock(req, res, next) {
    try {
      const limit = parseInt(req.query.limit) || 10;
      const data = await productService.getLowStockProducts(req.branchId, limit);

      res.json({
        success: true,
        data
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get product by ID
   * GET /products/:id
   */
  async show(req, res, next) {
    try {
      const data = await productService.getProductById(req.params.id, req.branchId);

      res.json({
        success: true,
        data
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create product
   * POST /products
   */
  async store(req, res, next) {
    try {
      const data = await productService.createProduct(req.body, req.branchId);

      res.status(201).json({
        success: true,
        message: 'Product created successfully',
        data
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update product
   * PUT /products/:id
   */
  async update(req, res, next) {
    try {
      const data = await productService.updateProduct(req.params.id, req.body, req.branchId);

      res.json({
        success: true,
        message: 'Product updated successfully',
        data
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete product
   * DELETE /products/:id
   */
  async destroy(req, res, next) {
    try {
      const result = await productService.deleteProduct(req.params.id, req.branchId);

      res.json({
        success: true,
        message: result.message
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update product stock
   * PUT /products/:id/stock
   */
  async updateStock(req, res, next) {
    try {
      const data = await productService.updateStock(
        req.params.id,
        req.body,
        req.branchId,
        req.user.id
      );

      res.json({
        success: true,
        message: 'Stock updated successfully',
        data
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Add product variation
   * POST /products/:id/variations
   */
  async addVariation(req, res, next) {
    try {
      const data = await productService.addVariation(req.params.id, req.body, req.branchId);

      res.status(201).json({
        success: true,
        message: 'Variation created successfully',
        data
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update product variation
   * PUT /products/:id/variations/:variationId
   */
  async updateVariation(req, res, next) {
    try {
      const data = await productService.updateVariation(
        req.params.id,
        req.params.variationId,
        req.body,
        req.branchId
      );

      res.json({
        success: true,
        message: 'Variation updated successfully',
        data
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete product variation
   * DELETE /products/:id/variations/:variationId
   */
  async deleteVariation(req, res, next) {
    try {
      const result = await productService.deleteVariation(req.params.id, req.params.variationId, req.branchId);

      res.json({
        success: true,
        message: result.message
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ProductController();
