const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const { authenticate } = require('../middleware/auth');
const { requireVerifiedEmail } = require('../middleware/permissions');
const { body } = require('express-validator');
const { validate } = require('../middleware/validator');

// Validation
const markAsReadValidation = [
  body('jid').notEmpty().withMessage('JID is required')
];

const presenceValidation = [
  body('type').isIn(['available', 'unavailable', 'composing', 'recording', 'paused']).withMessage('Invalid presence type')
];

const chatModifyValidation = [
  body('jid').notEmpty().withMessage('JID is required')
];

// All routes require authentication and verified email
router.use(authenticate);
router.use(requireVerifiedEmail);

// Chat list & history
router.get('/:sessionId/chats', chatController.getChatList);
router.get('/:sessionId/chat/:jid/history', chatController.getChatHistory);
router.get('/:sessionId/conversation/:jid', chatController.getConversation); // Fix #4: Complete conversation in 1 call
router.get('/:sessionId/search', chatController.searchMessages);

// Message actions
router.post('/:sessionId/read', markAsReadValidation, validate, chatController.markAsRead);
router.post('/:sessionId/presence', presenceValidation, validate, chatController.sendPresence);

// Chat management
router.post('/:sessionId/archive', chatModifyValidation, validate, chatController.archiveChat);
router.post('/:sessionId/pin', chatModifyValidation, validate, chatController.pinChat);
router.post('/:sessionId/mute', chatModifyValidation, validate, chatController.muteChat);
router.post('/:sessionId/block', chatModifyValidation, validate, chatController.blockContact);

// Media
router.get('/:sessionId/media/:messageId', chatController.downloadMedia);

module.exports = router;
