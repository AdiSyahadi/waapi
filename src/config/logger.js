const winston = require('winston');
const path = require('path');
const fs = require('fs');

// Ensure logs directory exists
const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Custom format
const customFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// Console format with colors
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...metadata }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    if (Object.keys(metadata).length > 0) {
      msg += ` ${JSON.stringify(metadata)}`;
    }
    return msg;
  })
);

// Create logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: customFormat,
  defaultMeta: { service: 'whatsapp-api' },
  transports: [
    // Error logs
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    // Combined logs
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 10
    }),
    // Separate file for WhatsApp specific logs
    new winston.transports.File({
      filename: path.join(logsDir, 'whatsapp.log'),
      level: 'info',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    })
  ],
  exceptionHandlers: [
    new winston.transports.File({
      filename: path.join(logsDir, 'exceptions.log')
    })
  ],
  rejectionHandlers: [
    new winston.transports.File({
      filename: path.join(logsDir, 'rejections.log')
    })
  ]
});

// Add console transport in development
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: consoleFormat,
    level: 'debug'
  }));
}

// Create stream for Morgan
logger.stream = {
  write: (message) => {
    logger.info(message.trim());
  }
};

// Utility logging functions
const logWhatsApp = (sessionId, action, data = {}) => {
  logger.info('WhatsApp Event', {
    sessionId,
    action,
    ...data,
    timestamp: new Date().toISOString()
  });
};

const logAPI = (method, path, statusCode, duration, userId = null) => {
  logger.info('API Request', {
    method,
    path,
    statusCode,
    duration: `${duration}ms`,
    userId,
    timestamp: new Date().toISOString()
  });
};

const logError = (error, context = {}) => {
  logger.error('Error occurred', {
    message: error.message,
    stack: error.stack,
    ...context,
    timestamp: new Date().toISOString()
  });
};

const logWebhook = (url, status, attempt, error = null) => {
  const level = status >= 200 && status < 300 ? 'info' : 'warn';
  logger.log(level, 'Webhook Delivery', {
    url,
    status,
    attempt,
    error: error ? error.message : null,
    timestamp: new Date().toISOString()
  });
};

module.exports = {
  logger,
  logWhatsApp,
  logAPI,
  logError,
  logWebhook
};
