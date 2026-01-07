const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const swaggerUi = require('swagger-ui-express');
const swaggerPublicSpec = require('./config/swagger');
require('dotenv').config();

// Global error handlers - MUST be before any other code
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

// Import configurations
const { validateEnv } = require('./config/env');
const { testConnection } = require('./config/database');
const { logger } = require('./config/logger');

// Validate environment variables
validateEnv();

const app = express();

// Middleware
app.use(helmet({
  contentSecurityPolicy: false // Disable for Swagger UI
}));
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('combined', { stream: logger.stream }));

// Import auth middleware
const { authenticate } = require('./middleware/auth');
const { requireAdmin } = require('./middleware/permissions');

// Swagger API Documentation - Single public documentation (admin endpoints excluded)
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerPublicSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'WhatsApp API Documentation',
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    filter: true,
    showExtensions: true
  }
}));

// Swagger JSON endpoints
app.get('/api/docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerPublicSpec);
});

app.get('/api/admin/docs.json', authenticate, requireAdmin, (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerAdminSpec);
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

console.log('🔍 [DEBUG] Loading route files...');

// Import routes
const authRoutes = require('./routes/auth');
console.log('✅ [DEBUG] Auth routes loaded');
const sessionRoutes = require('./routes/sessions');
console.log('✅ [DEBUG] Session routes loaded');
const messageRoutes = require('./routes/messages');
console.log('✅ [DEBUG] Message routes loaded');
const templateRoutes = require('./routes/templates');
console.log('✅ [DEBUG] Template routes loaded');
const broadcastRoutes = require('./routes/broadcast');
console.log('✅ [DEBUG] Broadcast routes loaded');
const chatRoutes = require('./routes/chat');
console.log('✅ [DEBUG] Chat routes loaded');
const groupRoutes = require('./routes/groupRoutes');
console.log('✅ [DEBUG] Group routes loaded');
const contactRoutes = require('./routes/contactRoutes');
console.log('✅ [DEBUG] Contact routes loaded');
const webhookRoutes = require('./routes/webhookRoutes');
console.log('✅ [DEBUG] Webhook routes loaded');
const scheduleRoutes = require('./routes/scheduleRoutes');
console.log('✅ [DEBUG] Schedule routes loaded');
const adminRoutes = require('./routes/adminRoutes');
console.log('✅ [DEBUG] Admin routes loaded');
const billingRoutes = require('./routes/billingRoutes');
console.log('✅ [DEBUG] Billing routes loaded');
const analyticsRoutes = require('./routes/analyticsRoutes');
console.log('✅ [DEBUG] Analytics routes loaded');
const apiKeyRoutes = require('./routes/apiKeyRoutes');
console.log('✅ [DEBUG] API Key routes loaded');
console.log('🎉 [DEBUG] All routes loaded successfully!');

// Import analytics middleware
console.log('🔍 [DEBUG] Loading analytics middleware...');
const { trackApiRequest } = require('./middleware/analytics');
console.log('✅ [DEBUG] Analytics middleware loaded');

// API Routes
const apiVersion = process.env.API_VERSION || 'v1';
console.log('🔍 [DEBUG] Setting up analytics tracking...');

// Track API requests for analytics
app.use(trackApiRequest);
console.log('✅ [DEBUG] Analytics tracking registered');

app.get(`/api/${apiVersion}`, (req, res) => {
  res.json({
    message: 'WhatsApp API Server',
    version: apiVersion,
    docs: `${process.env.APP_URL}/api/docs`
  });
});

// Mount routes
app.use(`/api/${apiVersion}/auth`, authRoutes);
app.use(`/api/${apiVersion}/sessions`, sessionRoutes);
app.use(`/api/${apiVersion}/messages`, messageRoutes);
app.use(`/api/${apiVersion}/templates`, templateRoutes);
app.use(`/api/${apiVersion}/broadcast`, broadcastRoutes);
app.use(`/api/${apiVersion}/chat`, chatRoutes);
app.use(`/api/${apiVersion}/groups`, groupRoutes);
app.use(`/api/${apiVersion}/contacts`, contactRoutes);
app.use(`/api/${apiVersion}/webhooks`, webhookRoutes);
app.use(`/api/${apiVersion}/schedule`, scheduleRoutes);
app.use(`/api/${apiVersion}/admin`, adminRoutes);
app.use(`/api/${apiVersion}/billing`, billingRoutes);
app.use(`/api/${apiVersion}/analytics`, analyticsRoutes);
app.use(`/api/${apiVersion}/api-keys`, apiKeyRoutes);
app.use(`/api/${apiVersion}/billing`, billingRoutes);
console.log(`🚀 [APP] Billing routes mounted at: /api/${apiVersion}/billing`);
app.use(`/api/${apiVersion}/analytics`, analyticsRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found'
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('❌ [Global Error Handler] Error:', err.message);
  console.error('❌ [Global Error Handler] Stack:', err.stack);
  console.error('❌ [Global Error Handler] URL:', req.method, req.url);
  console.error('❌ [Global Error Handler] Body:', JSON.stringify(req.body));
  
  logger.error('Error occurred:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    body: req.body
  });
  
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

const PORT = process.env.PORT || 3000;

// Initialize server with database connection
const startServer = async () => {
  try {
    console.log('🔍 [DEBUG] Starting server initialization...');
    // Test database connection
    console.log('🔍 [DEBUG] Testing database connection...');
    await testConnection();
    console.log('✅ [DEBUG] Database connection successful!');
    
    console.log('🔍 [DEBUG] Starting Express server...');
    app.listen(PORT, () => {
      logger.info(`🚀 Server running on port ${PORT}`);
      logger.info(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`🔗 API URL: ${process.env.APP_URL}/api/${process.env.API_VERSION || 'v1'}`);
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

console.log('🔍 [DEBUG] Calling startServer()...');
startServer();
console.log('✅ [DEBUG] startServer() called (async)');

module.exports = app;
