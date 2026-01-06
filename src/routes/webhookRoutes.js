const express = require('express');
const router = express.Router();
const webhookController = require('../controllers/webhookController');
const { authenticate } = require('../middleware/auth');

/**
 * @route   POST /api/v1/webhooks/test
 * @desc    Test webhook URL by sending test payload
 * @access  Private
 */
router.post('/test', 
  authenticate,
  webhookController.testWebhook
);

/**
 * @route   PUT /api/v1/webhooks/config
 * @desc    Update webhook configuration for session
 * @access  Private
 */
router.put('/config', 
  authenticate,
  webhookController.updateWebhook
);

/**
 * @route   GET /api/v1/webhooks/config
 * @desc    Get webhook configuration for session
 * @access  Private
 */
router.get('/config', 
  authenticate,
  webhookController.getWebhookConfig
);

/**
 * @route   DELETE /api/v1/webhooks/config
 * @desc    Delete webhook configuration
 * @access  Private
 */
router.delete('/config', 
  authenticate,
  webhookController.deleteWebhook
);

/**
 * @route   GET /api/v1/webhooks/logs
 * @desc    Get webhook delivery logs
 * @access  Private
 */
router.get('/logs', 
  authenticate,
  webhookController.getWebhookLogs
);

/**
 * @route   GET /api/v1/webhooks/events
 * @desc    Get available webhook events
 * @access  Private
 */
router.get('/events', 
  authenticate,
  webhookController.getWebhookEvents
);

module.exports = router;
