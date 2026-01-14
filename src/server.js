const app = require('./app');
const { testConnection, sequelize } = require('./config/database');
const { logger } = require('./config/logger');
const { redisClient } = require('./config/redis');
const whatsappService = require('./services/whatsappService');
const db = require('./models');

const PORT = process.env.PORT || 3000;

/**
 * Auto-restore WhatsApp sessions on startup
 * Reconnects all sessions that have status 'connected' in the database
 */
const restoreWhatsAppSessions = async () => {
  try {
    logger.info('🔄 Checking for WhatsApp sessions to restore...');
    
    // Find all sessions with 'connected' status
    const connectedSessions = await db.Session.findAll({
      where: {
        status: 'connected'
      }
    });
    
    if (connectedSessions.length === 0) {
      logger.info('✅ No connected sessions to restore');
      return;
    }
    
    logger.info(`📱 Found ${connectedSessions.length} session(s) to restore`);
    
    // Restore each session
    for (const session of connectedSessions) {
      try {
        logger.info(`🔄 Restoring session: ${session.name} (${session.session_id})`);
        
        // Update status to connecting
        await session.update({ status: 'connecting' });
        
        // Create session (will use existing auth state if available)
        whatsappService.createSession(session.session_id, session).catch(error => {
          logger.error(`❌ Failed to restore session ${session.name}:`, error.message);
          session.update({ status: 'disconnected' }).catch(() => {});
        });
        
        // Small delay between session restores to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        logger.info(`✅ Restore initiated for: ${session.name}`);
      } catch (sessionError) {
        logger.error(`❌ Error restoring session ${session.name}:`, sessionError.message);
        await session.update({ status: 'disconnected' }).catch(() => {});
      }
    }
    
    logger.info('✅ Session restoration process completed');
  } catch (error) {
    logger.error('❌ Error during session restoration:', error.message, error.stack);
  }
};

// Start server
const startServer = async () => {
  try {
    // Test database connection
    await testConnection();
    logger.info('Database connection established');

    // Test Redis connection (optional for now)
    try {
      await redisClient.ping();
      logger.info('Redis connection established');
    } catch (error) {
      logger.warn('Redis connection failed - continuing without Redis:', error.message);
    }

    // Sync database (in development only)
    if (process.env.NODE_ENV === 'development') {
      await sequelize.sync({ alter: false });
      logger.info('Database synchronized');
    }

    // Start Express server
    app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`API URL: ${process.env.APP_URL}/api/v1`);
      
      // Auto-restore WhatsApp sessions after server is ready
      // Use setImmediate to ensure it runs after server is fully ready
      setImmediate(() => {
        restoreWhatsAppSessions().catch(err => {
          logger.error('Session restoration failed:', err);
        });
      });
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  try {
    await sequelize.close();
    if (redisClient && typeof redisClient.quit === 'function') {
      await redisClient.quit();
    }
  } catch (e) {
    logger.error('Error during shutdown:', e);
  }
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  try {
    await sequelize.close();
    if (redisClient && typeof redisClient.quit === 'function') {
      await redisClient.quit();
    }
  } catch (e) {
    logger.error('Error during shutdown:', e);
  }
  process.exit(0);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit - just log
});

// Handle uncaught exceptions - DON'T EXIT
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  logger.error('Stack:', error.stack);
  // Don't exit - just log and continue
  // This allows server to stay running even if WhatsApp socket has issues
});

// Start the server
startServer();
