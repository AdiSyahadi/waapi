const db = require('../models');
const webhookService = require('../services/webhookService');
const { generateWebhookSecret } = require('../utils/webhookSigner');

/**
 * Test webhook URL
 */
const testWebhook = async (req, res) => {
  try {
    const { webhook_url, webhook_secret } = req.body;

    if (!webhook_url) {
      return res.status(400).json({
        success: false,
        message: 'Webhook URL is required'
      });
    }

    // Validate URL format
    try {
      new URL(webhook_url);
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: 'Invalid webhook URL format'
      });
    }

    const result = await webhookService.testWebhook(webhook_url, webhook_secret);

    if (result.success) {
      res.json({
        success: true,
        message: 'Webhook test successful',
        status_code: result.status,
        response: result.data
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Webhook test failed',
        error: result.error,
        status_code: result.statusCode
      });
    }
  } catch (error) {
    console.error('Test webhook error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to test webhook',
      error: error.message
    });
  }
};

/**
 * Update session webhook configuration
 */
const updateWebhook = async (req, res) => {
  try {
    const { session_id, webhook_url, webhook_events, generate_secret } = req.body;
    let { webhook_secret } = req.body;

    if (!session_id) {
      return res.status(400).json({
        success: false,
        message: 'Session ID is required'
      });
    }

    // Verify session belongs to user
    const session = await db.Session.findOne({
      where: {
        session_id,
        user_id: req.user.id
      }
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    // Validate webhook URL if provided
    if (webhook_url) {
      try {
        new URL(webhook_url);
      } catch (error) {
        return res.status(400).json({
          success: false,
          message: 'Invalid webhook URL format'
        });
      }
    }

    // Generate secret if requested
    if (generate_secret) {
      webhook_secret = generateWebhookSecret();
    }

    // Update session
    const updateData = {};
    if (webhook_url !== undefined) updateData.webhook_url = webhook_url;
    if (webhook_events !== undefined) updateData.webhook_events = webhook_events;
    if (webhook_secret !== undefined) updateData.webhook_secret = webhook_secret;

    await session.update(updateData);

    res.json({
      success: true,
      message: 'Webhook configuration updated',
      webhook: {
        url: session.webhook_url,
        events: session.webhook_events,
        secret_configured: !!session.webhook_secret,
        ...(generate_secret && { secret: webhook_secret })
      }
    });
  } catch (error) {
    console.error('Update webhook error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update webhook configuration',
      error: error.message
    });
  }
};

/**
 * Get webhook configuration
 */
const getWebhookConfig = async (req, res) => {
  try {
    const { session_id } = req.query;

    if (!session_id) {
      return res.status(400).json({
        success: false,
        message: 'Session ID is required'
      });
    }

    const session = await db.Session.findOne({
      where: {
        session_id,
        user_id: req.user.id
      }
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    res.json({
      success: true,
      webhook: {
        url: session.webhook_url,
        events: session.webhook_events || [],
        secret_configured: !!session.webhook_secret
      }
    });
  } catch (error) {
    console.error('Get webhook config error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get webhook configuration',
      error: error.message
    });
  }
};

/**
 * Delete webhook configuration
 */
const deleteWebhook = async (req, res) => {
  try {
    const { session_id } = req.body;

    if (!session_id) {
      return res.status(400).json({
        success: false,
        message: 'Session ID is required'
      });
    }

    const session = await db.Session.findOne({
      where: {
        session_id,
        user_id: req.user.id
      }
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    await session.update({
      webhook_url: null,
      webhook_events: [],
      webhook_secret: null
    });

    res.json({
      success: true,
      message: 'Webhook configuration deleted'
    });
  } catch (error) {
    console.error('Delete webhook error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete webhook configuration',
      error: error.message
    });
  }
};

/**
 * Get webhook logs
 */
const getWebhookLogs = async (req, res) => {
  try {
    const { 
      session_id, 
      event, 
      status, 
      start_date, 
      end_date,
      limit = 100,
      offset = 0
    } = req.query;

    // If session_id provided, get webhook URL from session
    let webhookUrl = null;
    if (session_id) {
      const session = await db.Session.findOne({
        where: {
          session_id,
          user_id: req.user.id
        }
      });

      if (!session) {
        return res.status(404).json({
          success: false,
          message: 'Session not found'
        });
      }

      webhookUrl = session.webhook_url;
    }

    const filters = {
      url: webhookUrl,
      event,
      status,
      startDate: start_date,
      endDate: end_date,
      limit: parseInt(limit),
      offset: parseInt(offset)
    };

    const logs = await webhookService.getWebhookLogs(filters);

    res.json({
      success: true,
      count: logs.length,
      logs: logs.map(log => ({
        id: log.id,
        event: log.event,
        status: log.status,
        status_code: log.status_code,
        error: log.error,
        retry_count: log.retry_count,
        delivered_at: log.delivered_at
      }))
    });
  } catch (error) {
    console.error('Get webhook logs error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get webhook logs',
      error: error.message
    });
  }
};

/**
 * Get available webhook events
 */
const getWebhookEvents = async (req, res) => {
  try {
    const events = [
      {
        category: 'Messages',
        events: [
          { name: 'message.received', description: 'New message received' },
          { name: 'message.sent', description: 'Message sent successfully' },
          { name: 'message.status', description: 'Message status updated (sent/delivered/read)' },
          { name: 'message.*', description: 'All message events' }
        ]
      },
      {
        category: 'Connection',
        events: [
          { name: 'connection.update', description: 'Connection status changed' },
          { name: 'connection.*', description: 'All connection events' }
        ]
      },
      {
        category: 'Groups',
        events: [
          { name: 'group.join', description: 'Joined a group' },
          { name: 'group.leave', description: 'Left a group' },
          { name: 'group.update', description: 'Group info updated' },
          { name: 'group.*', description: 'All group events' }
        ]
      },
      {
        category: 'Presence',
        events: [
          { name: 'presence.update', description: 'Contact presence updated (typing/online/offline)' },
          { name: 'presence.*', description: 'All presence events' }
        ]
      },
      {
        category: 'All',
        events: [
          { name: '*', description: 'Subscribe to all events' }
        ]
      }
    ];

    res.json({
      success: true,
      events
    });
  } catch (error) {
    console.error('Get webhook events error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get webhook events',
      error: error.message
    });
  }
};

module.exports = {
  testWebhook,
  updateWebhook,
  getWebhookConfig,
  deleteWebhook,
  getWebhookLogs,
  getWebhookEvents
};
