const db = require('../models');

/**
 * Check if user has required role
 */
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions'
      });
    }

    next();
  };
};

/**
 * Check if user is admin
 */
const requireAdmin = requireRole('admin');

/**
 * Check if user is developer or admin
 */
const requireDeveloper = requireRole('admin', 'developer');

/**
 * Check subscription limits
 */
const checkSubscriptionLimit = (limitType) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      // Admin bypass all limits
      if (req.user.role === 'admin') {
        return next();
      }

      const subscription = await db.Subscription.findOne({
        where: { user_id: req.user.id, status: 'active' },
        include: [{
          model: db.Plan,
          as: 'plan'
        }]
      });

      if (!subscription || !subscription.plan) {
        return res.status(403).json({
          success: false,
          message: 'No active subscription found'
        });
      }

      const limits = subscription.plan.limits;
      const usage = subscription.usage || {};

      // Check specific limit
      switch (limitType) {
        case 'sessions':
          const sessionCount = await db.Session.count({
            where: { user_id: req.user.id }
          });
          
          if (sessionCount >= limits.max_sessions) {
            return res.status(403).json({
              success: false,
              message: `Session limit reached (${limits.max_sessions})`,
              limit: limits.max_sessions,
              current: sessionCount
            });
          }
          break;

        case 'messages':
          if (usage.messages_today >= limits.max_messages_per_day) {
            return res.status(403).json({
              success: false,
              message: `Daily message limit reached (${limits.max_messages_per_day})`,
              limit: limits.max_messages_per_day,
              current: usage.messages_today
            });
          }
          break;

        case 'webhooks':
          const webhookCount = await db.Webhook.count({
            where: { user_id: req.user.id }
          });
          
          if (webhookCount >= limits.max_webhooks) {
            return res.status(403).json({
              success: false,
              message: `Webhook limit reached (${limits.max_webhooks})`,
              limit: limits.max_webhooks,
              current: webhookCount
            });
          }
          break;

        case 'api_keys':
          const apiKeyCount = await db.ApiKey.count({
            where: { user_id: req.user.id }
          });
          
          if (apiKeyCount >= limits.max_api_keys) {
            return res.status(403).json({
              success: false,
              message: `API key limit reached (${limits.max_api_keys})`,
              limit: limits.max_api_keys,
              current: apiKeyCount
            });
          }
          break;

        default:
          break;
      }

      req.subscription = subscription;
      next();
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Error checking subscription limits',
        error: error.message
      });
    }
  };
};

/**
 * Verify email is verified
 * Skip this check if authenticated via API key
 */
const requireVerifiedEmail = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  // Skip email verification check if using API key
  if (req.apiKey) {
    return next();
  }

  if (!req.user.email_verified) {
    return res.status(403).json({
      success: false,
      message: 'Email verification required'
    });
  }

  next();
};

module.exports = {
  requireRole,
  requireAdmin,
  requireDeveloper,
  checkSubscriptionLimit,
  requireVerifiedEmail
};
