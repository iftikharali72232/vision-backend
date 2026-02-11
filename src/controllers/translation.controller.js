const translationService = require('../services/translation.service');

/**
 * Get translations for a locale
 */
const getTranslations = async (req, res, next) => {
  try {
    const { locale } = req.params;
    const { group } = req.query;
    
    const result = await translationService.getTranslations(locale, group);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * Get grouped translations
 */
const getGroupedTranslations = async (req, res, next) => {
  try {
    const { locale } = req.params;
    const result = await translationService.getGroupedTranslations(locale);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * Get available locales
 */
const getAvailableLocales = async (req, res, next) => {
  try {
    const locales = await translationService.getAvailableLocales();
    res.json({ locales });
  } catch (error) {
    next(error);
  }
};

/**
 * Get supported languages
 */
const getSupportedLanguages = async (req, res, next) => {
  try {
    const languages = translationService.getSupportedLanguages();
    res.json({ languages });
  } catch (error) {
    next(error);
  }
};

/**
 * Create or update translation
 */
const upsertTranslation = async (req, res, next) => {
  try {
    const { locale } = req.params;
    const { key, value, group } = req.body;
    
    const result = await translationService.upsertTranslation(locale, key, value, group);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * Bulk import translations
 */
const bulkImport = async (req, res, next) => {
  try {
    const { locale } = req.params;
    const { translations, group } = req.body;
    
    const result = await translationService.bulkImport(locale, translations, group);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * Delete translation
 */
const deleteTranslation = async (req, res, next) => {
  try {
    const { locale, key } = req.params;
    
    const result = await translationService.deleteTranslation(locale, key);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * Initialize default translations
 */
const initializeDefaults = async (req, res, next) => {
  try {
    const result = await translationService.initializeDefaultTranslations();
    res.json(result);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getTranslations,
  getGroupedTranslations,
  getAvailableLocales,
  getSupportedLanguages,
  upsertTranslation,
  bulkImport,
  deleteTranslation,
  initializeDefaults
};
