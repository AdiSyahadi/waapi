const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');
require('dotenv').config();

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

// Swagger API Documentation
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'WhatsApp API Documentation',
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    filter: true,
    showExtensions: true
  }
}));

// Swagger JSON endpoint
app.get('/api/docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
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

// Import routes
const authRoutes = require('./routes/auth');
const sessionRoutes = require('./routes/sessions');
const messageRoutes = require('./routes/messages');
const templateRoutes = require('./routes/templates');
const broadcastRoutes = require('./routes/broadcast');
const chatRoutes = require('./routes/chat');
const groupRoutes = require('./routes/groupRoutes');
const contactRoutes = require('./routes/contactRoutes');
const webhookRoutes = require('./routes/webhookRoutes');
const scheduleRoutes = require('./routes/scheduleRoutes');
const adminRoutes = require('./routes/adminRoutes');
const billingRoutes = require('./routes/billingRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const apiKeyRoutes = require('./routes/apiKeyRoutes');

// Import analytics middleware
const { trackApiRequest } = require('./middleware/analytics');

// API Routes
const apiVersion = process.env.API_VERSION || 'v1';

// Track API requests for analytics
app.use(trackApiRequest);

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
  logger.error('Error occurred:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method
  });
  
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

const PORT = process.env.PORT || 3000;

// Initialize server with database connection
const startServer = async () => {
  try {
    // Test database connection
    await testConnection();
    
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

startServer();

module.exports = app;

module.exports = app;
