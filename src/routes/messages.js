const express = require('express');
const router = express.Router();
const messageController = require('../controllers/messageController');
const { authenticate } = require('../middleware/auth');
const { authenticateWithApiKeySupport } = require('../middleware/authOrApiKey');
const { requireVerifiedEmail, checkSubscriptionLimit } = require('../middleware/permissions');
const { checkMessageLimit } = require('../middleware/sessionLimit');
const { validateFile } = require('../middleware/fileValidation');
const { upload } = require('../config/upload');
const { body } = require('express-validator');
const { validate } = require('../middleware/validator');

// Validation
const sendTextValidation = [
  body('phone').notEmpty().withMessage('Phone number is required'),
  body('message').notEmpty().withMessage('Message is required')
];

const sendMediaValidation = [
  body('phone').notEmpty().withMessage('Phone number is required'),
  body('type').isIn(['image', 'video', 'audio', 'document']).withMessage('Invalid media type')
];

const sendLocationValidation = [
  body('phone').notEmpty().withMessage('Phone number is required'),
  body('latitude').isFloat({ min: -90, max: 90 }).withMessage('Invalid latitude'),
  body('longitude').isFloat({ min: -180, max: 180 }).withMessage('Invalid longitude')
];

const sendContactValidation = [
  body('phone').notEmpty().withMessage('Phone number is required'),
  body('contacts').isArray({ min: 1 }).withMessage('Contacts must be a non-empty array')
];

const sendButtonValidation = [
  body('phone').notEmpty().withMessage('Phone number is required'),
  body('text').notEmpty().withMessage('Text is required'),
  body('buttons').isArray({ min: 1, max: 3 }).withMessage('Buttons must be an array with 1-3 items')
];

const sendListValidation = [
  body('phone').notEmpty().withMessage('Phone number is required'),
  body('text').notEmpty().withMessage('Text is required'),
  body('button_text').notEmpty().withMessage('Button text is required'),
  body('sections').isArray({ min: 1 }).withMessage('Sections must be a non-empty array')
];

const sendPollValidation = [
  body('phone').notEmpty().withMessage('Phone number is required'),
  body('name').notEmpty().withMessage('Poll name is required'),
  body('options').isArray({ min: 2, max: 12 }).withMessage('Options must be an array with 2-12 items')
];

const replyValidation = [
  body('message_id').notEmpty().withMessage('Message ID is required'),
  body('message').notEmpty().withMessage('Reply message is required')
];

const forwardValidation = [
  body('message_id').notEmpty().withMessage('Message ID is required'),
  body('recipients').isArray({ min: 1 }).withMessage('Recipients must be a non-empty array')
];

const reactValidation = [
  body('message_id').notEmpty().withMessage('Message ID is required'),
  body('emoji').notEmpty().withMessage('Emoji is required')
];

const editValidation = [
  body('new_text').notEmpty().withMessage('New text is required')
];

// All routes require authentication (JWT or API key) and verified email
router.use(authenticateWithApiKeySupport);
router.use(requireVerifiedEmail);

// Send messages
router.post('/:sessionId/send/text', checkMessageLimit, sendTextValidation, validate, messageController.sendTextMessage);
router.post('/:sessionId/send/media', checkMessageLimit, (req, res, next) => {
  console.log('[Route] send/media hit, about to upload');
  upload.single('file')(req, res, (err) => {
    if (err) {
      console.error('[Multer Error]', err.message);
      return res.status(400).json({
        success: false,
        message: 'File upload error',
        error: err.message
      });
    }
    console.log('[Route] Upload success, file:', req.file ? req.file.filename : 'NO FILE');
    next();
  });
}, (req, res, next) => {
  const type = req.body.type || 'image';
  console.log('[Route] Validating file type:', type);
  return validateFile(type)(req, res, next);
}, sendMediaValidation, validate, messageController.sendMediaMessage);
router.post('/:sessionId/send/location', checkMessageLimit, sendLocationValidation, validate, messageController.sendLocation);
router.post('/:sessionId/send/contact', checkMessageLimit, sendContactValidation, validate, messageController.sendContact);
router.post('/:sessionId/send/button', checkMessageLimit, sendButtonValidation, validate, messageController.sendButton);
router.post('/:sessionId/send/list', checkMessageLimit, sendListValidation, validate, messageController.sendList);
router.post('/:sessionId/send/poll', checkMessageLimit, sendPollValidation, validate, messageController.sendPoll);

// Message operations
router.post('/:sessionId/reply', checkMessageLimit, replyValidation, validate, messageController.replyMessage);
router.post('/:sessionId/forward', checkMessageLimit, forwardValidation, validate, messageController.forwardMessage);
router.delete('/:sessionId/message/:messageId', messageController.deleteMessage);
router.post('/:sessionId/react', reactValidation, validate, messageController.reactMessage);
router.put('/:sessionId/message/:messageId', editValidation, validate, messageController.editMessage);

// Get messages
router.get('/:sessionId/messages', messageController.getMessages);
router.get('/:sessionId/check-number', messageController.checkNumber);

module.exports = router;
