const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');

const uploadController = require('../controllers/upload.controller');
const { authenticate, requireBranch } = require('../middlewares/auth');
const { AuthorizationError } = require('../middlewares/errorHandler');

const router = express.Router();

const uploadRoot = path.join(__dirname, '../../uploads');
const productsDir = path.join(uploadRoot, 'products');

fs.mkdirSync(productsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, productsDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname || '').toLowerCase();
    cb(null, `${Date.now()}-${uuidv4()}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (!allowed.includes(file.mimetype)) {
    return cb(new Error('Only image files are allowed'), false);
  }
  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }
});

const canUploadProductImages = (req, res, next) => {
  // Master users bypass permission check
  if (req.user?.isMaster) return next();
  const perms = req.user?.permissions || [];
  if (perms.includes('products.create') || perms.includes('products.edit') || perms.includes('products.update')) {
    return next();
  }
  return next(new AuthorizationError('Insufficient permissions'));
};

// All routes require authentication
router.use(authenticate);

/**
 * @route POST /api/v1/uploads/products
 * @desc Upload a product image
 * @access Private - Admin, Manager
 */
router.post(
  '/products',
  canUploadProductImages,
  requireBranch,
  upload.single('file'),
  uploadController.uploadProductImage
);

module.exports = router;
