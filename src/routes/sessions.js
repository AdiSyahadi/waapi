const express = require('express');
const router = express.Router();
const sessionController = require('../controllers/sessionController');
const { authenticate } = require('../middleware/auth');
const { authenticateWithApiKeySupport } = require('../middleware/authOrApiKey');
const { requireVerifiedEmail, checkSubscriptionLimit } = require('../middleware/permissions');
const { body } = require('express-validator');
const { validate } = require('../middleware/validator');

// Validation
const createSessionValidation = [
  body('name').trim().notEmpty().withMessage('Session name is required'),
  body('use_pairing').optional().isBoolean().withMessage('use_pairing must be boolean'),
  body('phone_number').optional().isMobilePhone().withMessage('Invalid phone number'),
  body('webhook_url').optional().isURL().withMessage('Valid webhook URL required'),
  body('webhook_events').optional().isArray().withMessage('Webhook events must be an array'),
  body('auto_reconnect').optional().isBoolean().withMessage('Auto reconnect must be boolean')
];

const updateSessionValidation = [
  body('name').optional().trim().notEmpty().withMessage('Session name cannot be empty'),
  body('webhook_url').optional().isURL().withMessage('Valid webhook URL required'),
  body('webhook_events').optional().isArray().withMessage('Webhook events must be an array'),
  body('auto_reconnect').optional().isBoolean().withMessage('Auto reconnect must be boolean')
];

// All routes require authentication (JWT or API key) and verified email
router.use(authenticateWithApiKeySupport);
router.use(requireVerifiedEmail);

// Routes
router.post('/', checkSubscriptionLimit('sessions'), createSessionValidation, validate, sessionController.createSession);
router.get('/', sessionController.getSessions);
router.get('/:id', sessionController.getSession);
router.get('/:id/qr', sessionController.getQRCode);
router.get('/:id/chats', sessionController.getChats);
router.post('/:id/reconnect', sessionController.reconnectSession);
router.post('/:id/disconnect', sessionController.disconnectSession);
router.put('/:id', updateSessionValidation, validate, sessionController.updateSession);
router.delete('/:id', sessionController.deleteSession);

module.exports = router;
