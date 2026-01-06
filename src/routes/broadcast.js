const express = require('express');
const router = express.Router();
const broadcastController = require('../controllers/broadcastController');
const { authenticate } = require('../middleware/auth');
const { requireVerifiedEmail } = require('../middleware/permissions');
const { checkBulkMessageLimit } = require('../middleware/sessionLimit');
const { checkFeatureAccess } = require('../middleware/sessionLimit');
const { body } = require('express-validator');
const { validate } = require('../middleware/validator');

// Validation
const sendBroadcastValidation = [
  body('recipients').isArray({ min: 1 }).withMessage('Recipients must be a non-empty array'),
  body('message').optional().notEmpty().withMessage('Message cannot be empty'),
  body('type').optional().isIn(['text', 'media']).withMessage('Invalid type'),
  body('delay').optional().isInt({ min: 100, max: 10000 }).withMessage('Delay must be between 100 and 10000ms')
];

// All routes require authentication and verified email
router.use(authenticate);
router.use(requireVerifiedEmail);

// Routes
router.post('/:sessionId/broadcast', checkFeatureAccess('bulk_messaging'), checkBulkMessageLimit, sendBroadcastValidation, validate, broadcastController.sendBroadcast);
router.get('/broadcast/:broadcastId', broadcastController.getBroadcastStatus);
router.delete('/broadcast/:broadcastId', broadcastController.cancelBroadcast);

module.exports = router;
