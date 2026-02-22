const path = require('path');

class UploadController {
  /**
   * Upload a product image
   * POST /uploads/products
   */
  async uploadProductImage(req, res, next) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No file uploaded'
        });
      }

      const relativePath = `/uploads/products/${path.basename(req.file.filename)}`;

      res.status(201).json({
        success: true,
        message: 'File uploaded successfully',
        data: {
          path: relativePath
        }
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new UploadController();
