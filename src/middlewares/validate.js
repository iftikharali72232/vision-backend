const { validationResult } = require('express-validator');
const { ValidationError } = require('./errorHandler');

/**
 * Middleware factory that takes validation rules and returns middleware
 * @param {Array} validations - Array of express-validator validation chains
 */
const validate = (validations) => {
  return async (req, res, next) => {
    // Run all validations
    await Promise.all(validations.map(validation => validation.run(req)));

    const errors = validationResult(req);
    
    if (!errors.isEmpty()) {
      const formattedErrors = {};
      
      errors.array().forEach(error => {
        const field = error.path || error.param;
        if (!formattedErrors[field]) {
          formattedErrors[field] = [];
        }
        formattedErrors[field].push(error.msg);
      });

      return next(new ValidationError('Validation failed', formattedErrors));
    }
    
    next();
  };
};

module.exports = validate;
