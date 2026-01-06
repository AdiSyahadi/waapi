const express = require('express');
const router = express.Router();
const scheduleController = require('../controllers/scheduleController');
const { authenticate } = require('../middleware/auth');
const { checkSubscriptionLimit } = require('../middleware/permissions');

/**
 * @route   POST /api/v1/schedule/message
 * @desc    Schedule a single message
 * @access  Private
 */
router.post('/message', 
  authenticate,
  checkSubscriptionLimit('messages'),
  scheduleController.scheduleMessage
);

/**
 * @route   GET /api/v1/schedule/messages
 * @desc    Get all scheduled messages
 * @access  Private
 */
router.get('/messages', 
  authenticate,
  scheduleController.getScheduledMessages
);

/**
 * @route   GET /api/v1/schedule/messages/:id
 * @desc    Get single scheduled message
 * @access  Private
 */
router.get('/messages/:id', 
  authenticate,
  scheduleController.getScheduledMessage
);

/**
 * @route   PUT /api/v1/schedule/messages/:id
 * @desc    Update scheduled message
 * @access  Private
 */
router.put('/messages/:id', 
  authenticate,
  scheduleController.updateScheduledMessage
);

/**
 * @route   DELETE /api/v1/schedule/messages/:id
 * @desc    Cancel scheduled message
 * @access  Private
 */
router.delete('/messages/:id', 
  authenticate,
  scheduleController.cancelScheduledMessage
);

/**
 * @route   POST /api/v1/schedule/bulk
 * @desc    Schedule multiple messages at once
 * @access  Private
 */
router.post('/bulk', 
  authenticate,
  checkSubscriptionLimit('messages'),
  scheduleController.bulkScheduleMessages
);

/**
 * @route   POST /api/v1/schedule/send-bulk
 * @desc    Send bulk messages immediately
 * @access  Private
 */
router.post('/send-bulk', 
  authenticate,
  checkSubscriptionLimit('messages'),
  scheduleController.sendBulkMessages
);

module.exports = router;
