require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');

const { errorHandler, notFound } = require('./middlewares/errorHandler');
const routes = require('./routes');
const maintenanceRoutes = require('./routes/maintenance.routes');
const developerRoutes = require('./routes/developer.routes');
const subscriptionRoutes = require('./routes/subscription.routes');
const cronService = require('./services/cron.service');

const app = express();

// Trust proxy (for rate limiting behind reverse proxy)
app.set('trust proxy', 1);

// Security middleware - configure helmet to allow cross-origin resource loading
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
  contentSecurityPolicy: false, // Disable CSP in development for easier debugging
}));

// CORS configuration
// app.use(cors({
//   origin: true,
//   credentials: true,
//   methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
//   allowedHeaders: ['Content-Type', 'Authorization', 'X-Branch-Id']
// }));
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Allow localhost origins in development
    if (origin.startsWith('http://localhost:')) return callback(null, true);
    
    // Allow the configured CORS_ORIGIN
    if (process.env.CORS_ORIGIN && origin === process.env.CORS_ORIGIN) return callback(null, true);
    
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));

// Stripe webhook needs raw body (must be before json parser)
app.post('/api/subscription/webhook', express.raw({ type: 'application/json' }));
app.post('/api/v1/subscription/webhook', express.raw({ type: 'application/json' }));

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Static files (for uploads)
app.use('/uploads', (req, res, next) => {
  // Allow localhost origins in development
  if (!req.headers.origin || req.headers.origin.startsWith('http://localhost:')) {
    res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  } else if (process.env.CORS_ORIGIN && req.headers.origin === process.env.CORS_ORIGIN) {
    res.header('Access-Control-Allow-Origin', process.env.CORS_ORIGIN);
  }
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Default rate limiter
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: {
    success: false,
    message: 'Too many requests, please try again later.',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false
});

app.use('/api', limiter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'POS Backend API is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Maintenance routes (secret-key protected, no login required, no rate limit)
// Access via: /maintenance/* with header X-Maintenance-Key
app.use('/maintenance', maintenanceRoutes);

// Developer panel API (JWT-protected, developer role only)
app.use('/dev-api', developerRoutes);

// API Routes
// Frontend compatibility: the Vite app defaults to base URL '/api'
// Keep versioned routes for existing clients.
app.use('/api', routes);
app.use('/api/v1', routes);

// Handle 404
app.use(notFound);

// Global error handler
app.use(errorHandler);

// Start cron jobs
cronService.start();

// Start server
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`
  ╔════════════════════════════════════════════════════╗
  ║                                                    ║
  ║   🚀 POS Backend Server is running!                ║
  ║                                                    ║
  ║   📍 URL: http://localhost:${PORT}                   ║
  ║   📍 API: http://localhost:${PORT}/api/v1            ║
  ║   📍 ENV: ${process.env.NODE_ENV || 'development'}                       ║
  ║                                                    ║
  ╚════════════════════════════════════════════════════╝
  `);
});

module.exports = app;
