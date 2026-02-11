const { body, query } = require('express-validator');

const updateSettings = [
  body('general')
    .optional()
    .isObject().withMessage('General settings must be an object'),
  body('general.business_name')
    .optional()
    .isLength({ min: 1, max: 255 }).withMessage('Business name must be 1-255 characters'),
  body('general.currency')
    .optional()
    .isLength({ min: 1, max: 10 }).withMessage('Currency must be 1-10 characters'),
  body('tax')
    .optional()
    .isObject().withMessage('Tax settings must be an object'),
  body('tax.enabled')
    .optional()
    .isBoolean().withMessage('Tax enabled must be a boolean'),
  body('tax.default_rate')
    .optional()
    .isFloat({ min: 0, max: 100 }).withMessage('Tax rate must be between 0 and 100'),
  body('receipt')
    .optional()
    .isObject().withMessage('Receipt settings must be an object'),
  body('pos')
    .optional()
    .isObject().withMessage('POS settings must be an object')
];

module.exports = {
  updateSettings
};
