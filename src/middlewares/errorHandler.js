class AppError extends Error {
  constructor(message, statusCode, code = null, errors = null) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.errors = errors;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message, errors = null) {
    super(message, 400, 'VAL_001', errors);
  }
}

class BadRequestError extends AppError {
  constructor(message) {
    super(message, 400, 'REQ_001');
  }
}

class AuthenticationError extends AppError {
  constructor(message = 'Authentication required', code = 'AUTH_004') {
    super(message, 401, code);
  }
}

class AuthorizationError extends AppError {
  constructor(message = 'Insufficient permissions') {
    super(message, 403, 'AUTH_003');
  }
}

class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404, 'RES_001');
  }
}

class ConflictError extends AppError {
  constructor(message = 'Resource already exists') {
    super(message, 409, 'RES_002');
  }
}

class InsufficientStockError extends AppError {
  constructor(productName) {
    super(`Insufficient stock for ${productName}`, 400, 'INV_001');
  }
}

// Error handler middleware
const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log error for development
  if (process.env.NODE_ENV === 'development') {
    console.error('Error:', err);
  }

  // Prisma errors
  if (err.code === 'P2002') {
    const field = err.meta?.target?.[0] || 'field';
    error = new ConflictError(`A record with this ${field} already exists`);
  }

  if (err.code === 'P2025') {
    error = new NotFoundError('Record');
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    error = new AuthenticationError('Invalid token', 'AUTH_004');
  }

  if (err.name === 'TokenExpiredError') {
    error = new AuthenticationError('Token expired', 'AUTH_002');
  }

  // Validation errors from express-validator
  if (err.array && typeof err.array === 'function') {
    const errors = err.array();
    const formattedErrors = {};
    errors.forEach(e => {
      if (!formattedErrors[e.path]) {
        formattedErrors[e.path] = [];
      }
      formattedErrors[e.path].push(e.msg);
    });
    error = new ValidationError('Validation failed', formattedErrors);
  }

  res.status(error.statusCode || 500).json({
    success: false,
    message: error.message || 'Internal server error',
    code: error.code || 'SYS_001',
    ...(error.errors && { errors: error.errors }),
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

// 404 handler
const notFound = (req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
    code: 'RES_001'
  });
};

module.exports = {
  AppError,
  ValidationError,
  BadRequestError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  InsufficientStockError,
  errorHandler,
  notFound
};
