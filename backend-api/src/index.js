PORT=4000

const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 8080;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Database connection
let pool;
if (process.env.DATABASE_URL) {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: false  // Disable SSL if database doesn't support it
  });

  // Test database connection
  pool.on('connect', () => {
    console.log('Database connected successfully');
  });

  pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
    // Don't exit on error - allow app to continue without DB for testing
  });
} else {
  console.warn('WARNING: DATABASE_URL not set. Database operations will fail.');
  pool = null;
}

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    if (pool) {
      try {
        await pool.query('SELECT 1');
        res.json({ status: 'healthy', service: 'backend-api', database: 'connected', timestamp: new Date().toISOString() });
      } catch (dbError) {
        res.json({ status: 'healthy', service: 'backend-api', database: 'connection_failed', error: dbError.message, timestamp: new Date().toISOString() });
      }
    } else {
      res.json({ status: 'healthy', service: 'backend-api', database: 'not_configured', timestamp: new Date().toISOString() });
    }
  } catch (error) {
    res.status(500).json({ status: 'unhealthy', error: error.message });
  }
});

// Routes
app.use('/orders', require('./routes/orders'));
app.use('/integrations', require('./routes/integrations'));
app.use('/workflows', require('./routes/workflows'));
app.use('/analytics', require('./routes/analytics'));

// API v1 routes
app.use('/api/v1/cart', require('./routes/cart'));
app.use('/api/v1/cart/checkout', require('./routes/checkout'));
app.use('/api/v1/deposit-sessions', require('./routes/deposit-sessions'));
app.use('/api/v1/deposit-plans', require('./routes/deposit-plans'));
app.use('/api/v1/orders', require('./routes/orders'));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Debug: Log all requests (development only)
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
  });
}

// 404 handler
app.use((req, res) => {
  console.log(`404 - Endpoint not found: ${req.method} ${req.path}`);
  res.status(404).json({ 
    error: 'Endpoint not found',
    method: req.method,
    path: req.path,
    availableRoutes: [
      'GET /health',
      'GET /orders/:id/details',
      'POST /orders',
      'POST /orders/calculate',
      'GET /api/v1/cart/:cartId',
      'POST /api/v1/cart/items',
      'PUT /api/v1/cart/items',
      'DELETE /api/v1/cart/items',
      'POST /api/v1/cart/checkout',
      'GET /api/v1/deposit-sessions/:sessionId',
      'POST /api/v1/deposit-sessions',
      'POST /api/v1/deposit-sessions/:sessionId/checkout',
      'POST /api/v1/deposit-sessions/:sessionId/complete',
      'GET /api/v1/orders/:orderId',
      'POST /api/v1/orders/:orderId/complete-remaining',
      'GET /api/v1/orders/:orderId/details (legacy)',
      'POST /api/v1/orders (legacy)',
      'POST /api/v1/orders/calculate (legacy)'
    ]
  });
});

// Start server
app.listen(port, '0.0.0.0', () => {
  console.log(`Backend API server running on port ${port}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM signal received: closing HTTP server');
  await pool.end();
  process.exit(0);
});

module.exports = app;

