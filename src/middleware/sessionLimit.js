const db = require('../models');
const { logger } = require('../config/logger');

/**
 * Check if user has reached session limit based on their subscription plan
 */
const checkSessionLimit = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Get user's active subscription
    const subscription = await db.Subscription.findOne({
      where: {
        user_id: userId,
        status: 'active'
      },
      include: [{
        model: db.Plan,
        as: 'plan'
      }]
    });

    // If no active subscription, use Free plan limits
    let sessionLimit = 1; // Free plan default
    if (subscription && subscription.plan) {
      sessionLimit = subscription.plan.max_sessions || 1;
    }

    // Count user's active sessions
    const activeSessionsCount = await db.Session.count({
      where: {
        user_id: userId,
        status: ['connected', 'connecting', 'disconnected']
      }
    });

    // Check if limit reached
    if (activeSessionsCount >= sessionLimit) {
      return res.status(403).json({
        success: false,
        message: 'Session limit reached for your plan',
        data: {
          current_sessions: activeSessionsCount,
          max_sessions: sessionLimit,
          plan: subscription?.plan?.name || 'Free'
        },
        upgrade_required: true
      });
    }

    // Add session info to request for use in controller
    req.sessionLimit = {
      current: activeSessionsCount,
      max: sessionLimit,
      remaining: sessionLimit - activeSessionsCount
    };

    next();
  } catch (error) {
    logger.error('Session limit check failed:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check session limit',
      error: error.message
    });
  }
};

/**
 * Check message limit per day
 */
const checkMessageLimit = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Get user's active subscription
    const subscription = await db.Subscription.findOne({
      where: {
        user_id: userId,
        status: 'active'
      },
      include: [{
        model: db.Plan,
        as: 'plan'
      }]
    });

    // If no active subscription, use Free plan limits
    let messageLimit = 100; // Free plan default: 100 messages per day
    if (subscription && subscription.plan) {
      messageLimit = subscription.plan.max_messages_per_day || 100;
    }

    // Count messages sent today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayMessagesCount = await db.Message.count({
      where: {
        from_me: true,
        sent_at: {
          [db.Sequelize.Op.gte]: today
        }
      },
      include: [{
        model: db.Session,
        as: 'session',
        where: {
          user_id: userId
        },
        attributes: []
      }]
    });

    // Check if limit reached
    if (todayMessagesCount >= messageLimit) {
      return res.status(403).json({
        success: false,
        message: 'Daily message limit reached for your plan',
        data: {
          messages_today: todayMessagesCount,
          max_messages: messageLimit,
          plan: subscription?.plan?.name || 'Free',
          reset_at: new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString()
        },
        upgrade_required: true
      });
    }

    // Add message info to request
    req.messageLimit = {
      today: todayMessagesCount,
      max: messageLimit,
      remaining: messageLimit - todayMessagesCount
    };

    next();
  } catch (error) {
    logger.error('Message limit check failed:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check message limit',
      error: error.message
    });
  }
};

/**
 * Check if user can send bulk messages
 */
const checkBulkMessageLimit = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const recipientCount = req.body.recipients?.length || 0;

    if (recipientCount === 0) {
      return res.status(400).json({
        success: false,
        message: 'No recipients provided'
      });
    }

    // Get user's active subscription
    const subscription = await db.Subscription.findOne({
      where: {
        user_id: userId,
        status: 'active'
      },
      include: [{
        model: db.Plan,
        as: 'plan'
      }]
    });

    // Check if bulk messaging is allowed
    const plan = subscription?.plan;
    if (!plan || !plan.features?.bulk_messaging) {
      return res.status(403).json({
        success: false,
        message: 'Bulk messaging not available in your plan',
        upgrade_required: true
      });
    }

    // Check bulk limit per request
    const bulkLimit = plan.features.bulk_limit || 100;
    if (recipientCount > bulkLimit) {
      return res.status(403).json({
        success: false,
        message: `Bulk message limit exceeded. Maximum ${bulkLimit} recipients per request`,
        data: {
          requested: recipientCount,
          max_allowed: bulkLimit
        }
      });
    }

    // Check daily message limit including bulk
    const messageLimit = plan.max_messages_per_day || 100;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayMessagesCount = await db.Message.count({
      where: {
        from_me: true,
        sent_at: {
          [db.Sequelize.Op.gte]: today
        }
      },
      include: [{
        model: db.Session,
        as: 'session',
        where: {
          user_id: userId
        },
        attributes: []
      }]
    });

    if (todayMessagesCount + recipientCount > messageLimit) {
      return res.status(403).json({
        success: false,
        message: 'Daily message limit will be exceeded with this bulk send',
        data: {
          messages_today: todayMessagesCount,
          requested: recipientCount,
          max_messages: messageLimit,
          available: messageLimit - todayMessagesCount
        },
        upgrade_required: true
      });
    }

    next();
  } catch (error) {
    logger.error('Bulk message limit check failed:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check bulk message limit',
      error: error.message
    });
  }
};

/**
 * Check webhook feature access
 */
const checkWebhookAccess = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Get user's active subscription
    const subscription = await db.Subscription.findOne({
      where: {
        user_id: userId,
        status: 'active'
      },
      include: [{
        model: db.Plan,
        as: 'plan'
      }]
    });

    // Check if webhooks are allowed
    const plan = subscription?.plan;
    if (!plan || !plan.features?.webhooks) {
      return res.status(403).json({
        success: false,
        message: 'Webhooks not available in your plan',
        upgrade_required: true
      });
    }

    next();
  } catch (error) {
    logger.error('Webhook access check failed:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check webhook access',
      error: error.message
    });
  }
};

/**
 * Generic feature access check
 */
const checkFeatureAccess = (featureName) => {
  return async (req, res, next) => {
    try {
      const userId = req.user.id;

      // Get user's active subscription
      const subscription = await db.Subscription.findOne({
        where: {
          user_id: userId,
          status: 'active'
        },
        include: [{
          model: db.Plan,
          as: 'plan'
        }]
      });

      // Check if feature is available
      const plan = subscription?.plan;
      if (!plan || !plan.features?.[featureName]) {
        return res.status(403).json({
          success: false,
          message: `Feature "${featureName}" not available in your plan`,
          current_plan: plan?.name || 'Free',
          upgrade_required: true
        });
      }

      next();
    } catch (error) {
      logger.error(`Feature access check failed for ${featureName}:`, error);
      res.status(500).json({
        success: false,
        message: 'Failed to check feature access',
        error: error.message
      });
    }
  };
};

module.exports = {
  checkSessionLimit,
  checkMessageLimit,
  checkBulkMessageLimit,
  checkWebhookAccess,
  checkFeatureAccess
};
