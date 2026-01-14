const rateLimit = require('express-rate-limit');
const { logger } = require('../config/logger');

/**
 * Rate Limiter Middleware
 * Menggunakan memory store (simple) atau bisa diganti dengan Redis store
 */

// Store untuk track rate limits (memory-based untuk simplicity)
const rateLimitStore = new Map();

// Cleanup old entries setiap 1 menit
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of rateLimitStore.entries()) {
    if (now - value.resetTime > 0) {
      rateLimitStore.delete(key);
    }
  }
}, 60000);

/**
 * Custom key generator - gunakan API key ID atau IP
 */
const keyGenerator = (req) => {
  if (req.apiKey?.id) {
    return `api_${req.apiKey.id}`;
  }
  if (req.user?.id) {
    return `user_${req.user.id}`;
  }
  return req.ip || req.connection.remoteAddress || 'unknown';
};

/**
 * Global API Rate Limiter
 * 1000 requests per 15 menit per user/API key (increased for development)
 */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // 1000 requests per window (increased from 100)
  standardHeaders: true, // Return rate limit info in headers
  legacyHeaders: false,
  keyGenerator,
  handler: (req, res) => {
    logger.warn('Rate limit exceeded', {
      ip: req.ip,
      userId: req.user?.id,
      apiKeyId: req.apiKey?.id,
      path: req.path
    });
    res.status(429).json({
      success: false,
      message: 'Too many requests, please try again later',
      retryAfter: Math.ceil(15 * 60), // seconds
      limit: 1000,
      window: '15 minutes'
    });
  },
  skip: (req) => {
    // Skip rate limiting for health check and read-only operations
    if (req.path === '/health') return true;
    // Skip for authenticated GET requests (dashboard reads)
    if (req.method === 'GET' && (req.user || req.apiKey)) return true;
    return false;
  }
});

/**
 * Stricter rate limiter for message sending
 * 30 messages per menit per session
 */
const messageLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 messages per minute
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const sessionId = req.params.sessionId;
    const baseKey = keyGenerator(req);
    return `msg_${baseKey}_${sessionId}`;
  },
  handler: (req, res) => {
    logger.warn('Message rate limit exceeded', {
      ip: req.ip,
      userId: req.user?.id,
      sessionId: req.params.sessionId,
      path: req.path
    });
    res.status(429).json({
      success: false,
      message: 'Message rate limit exceeded. Please slow down to avoid WhatsApp ban.',
      retryAfter: 60, // seconds
      limit: 30,
      window: '1 minute',
      warning: 'Sending too many messages can get your number banned by WhatsApp'
    });
  }
});

/**
 * Stricter rate limiter for broadcast
 * 5 broadcasts per hour
 */
const broadcastLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 broadcasts per hour
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator,
  handler: (req, res) => {
    logger.warn('Broadcast rate limit exceeded', {
      ip: req.ip,
      userId: req.user?.id,
      path: req.path
    });
    res.status(429).json({
      success: false,
      message: 'Broadcast rate limit exceeded. You can send 5 broadcasts per hour.',
      retryAfter: 3600, // seconds
      limit: 5,
      window: '1 hour'
    });
  }
});

/**
 * Auth rate limiter (login attempts)
 * 10 attempts per 15 menit per IP
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 login attempts
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `auth_${req.ip}`,
  handler: (req, res) => {
    logger.warn('Auth rate limit exceeded', {
      ip: req.ip,
      path: req.path
    });
    res.status(429).json({
      success: false,
      message: 'Too many login attempts. Please try again in 15 minutes.',
      retryAfter: 900, // seconds
      limit: 10,
      window: '15 minutes'
    });
  }
});

/**
 * Session creation rate limiter
 * 5 sessions per hour per user
 */
const sessionCreationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 session creations per hour
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator,
  handler: (req, res) => {
    logger.warn('Session creation rate limit exceeded', {
      ip: req.ip,
      userId: req.user?.id
    });
    res.status(429).json({
      success: false,
      message: 'Too many session creation attempts. Please try again later.',
      retryAfter: 3600,
      limit: 5,
      window: '1 hour'
    });
  }
});

/**
 * Webhook creation rate limiter
 * 20 webhooks per hour
 */
const webhookLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: 'Webhook rate limit exceeded.',
      retryAfter: 3600,
      limit: 20,
      window: '1 hour'
    });
  }
});

module.exports = {
  apiLimiter,
  messageLimiter,
  broadcastLimiter,
  authLimiter,
  sessionCreationLimiter,
  webhookLimiter
};
