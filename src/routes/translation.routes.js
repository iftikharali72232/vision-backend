const express = require('express');
const router = express.Router();
const translationController = require('../controllers/translation.controller');
const { authenticate, hasPermission } = require('../middlewares/auth');

/**
 * Translation Routes
 * 
 * Public routes (no auth required for reading translations)
 * Admin routes require authentication and permission
 */

// Public routes - reading translations
router.get('/languages', translationController.getSupportedLanguages);
router.get('/locales', translationController.getAvailableLocales);
router.get('/:locale', translationController.getTranslations);
router.get('/:locale/grouped', translationController.getGroupedTranslations);

// Admin routes - managing translations
router.post('/:locale', 
  authenticate, 
  hasPermission('settings.view'), 
  translationController.upsertTranslation
);

router.post('/:locale/bulk', 
  authenticate, 
  hasPermission('settings.view'), 
  translationController.bulkImport
);

router.delete('/:locale/:key', 
  authenticate, 
  hasPermission('settings.view'), 
  translationController.deleteTranslation
);

router.post('/initialize/defaults', 
  authenticate, 
  hasPermission('settings.view'), 
  translationController.initializeDefaults
);

module.exports = router;
