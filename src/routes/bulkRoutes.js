/**
 * Bulk Operations Routes
 * Fixes Issue #10: No bulk operations for mass actions
 */

const express = require('express');
const router = express.Router();
const bulkController = require('../controllers/bulkController');
const { authenticate } = require('../middleware/auth');
const { requireVerifiedEmail } = require('../middleware/permissions');
const { body, param } = require('express-validator');
const { validate } = require('../middleware/validator');
const { messageLimiter } = require('../middleware/rateLimiter');

// Validation middleware
const sessionIdValidation = [
  param('sessionId').notEmpty().withMessage('Session ID is required')
];

const bulkMessagesValidation = [
  body('messages').isArray({ min: 1, max: 100 }).withMessage('Messages array required (1-100 items)'),
  body('messages.*.to').notEmpty().withMessage('Recipient (to) is required'),
  body('messages.*.content').notEmpty().withMessage('Content is required'),
  body('options.delayMs').optional().isInt({ min: 500, max: 10000 }).withMessage('Delay must be 500-10000ms')
];

const bulkJidsValidation = [
  body('jids').isArray({ min: 1, max: 500 }).withMessage('JIDs array required (1-500 items)')
];

const bulkAssignmentsValidation = [
  body('assignments').isArray({ min: 1, max: 100 }).withMessage('Assignments array required (1-100 items)'),
  body('assignments.*.jid').notEmpty().withMessage('JID is required'),
  body('assignments.*.agentId').isUUID().withMessage('Valid agent ID is required')
];

const bulkContactsValidation = [
  body('contacts').isArray({ min: 1, max: 500 }).withMessage('Contacts array required (1-500 items)'),
  body('contacts.*.phone').notEmpty().withMessage('Phone is required')
];

const bulkMessagesDeleteValidation = [
  body('messageIds').isArray({ min: 1, max: 100 }).withMessage('Message IDs array required (1-100 items)'),
  body('deleteForEveryone').optional().isBoolean()
];

// All routes require authentication
router.use(authenticate);
router.use(requireVerifiedEmail);

/**
 * @swagger
 * /api/v1/bulk/{sessionId}/messages:
 *   post:
 *     summary: Bulk send messages
 *     description: Send messages to multiple recipients with rate limiting
 *     tags: [Bulk Operations]
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - messages
 *             properties:
 *               messages:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     to:
 *                       type: string
 *                       description: Phone number or JID
 *                     content:
 *                       type: string
 *                       description: Message content
 *               options:
 *                 type: object
 *                 properties:
 *                   delayMs:
 *                     type: integer
 *                     description: Delay between messages in ms (default 1000)
 *                   maxBatchSize:
 *                     type: integer
 *                     description: Maximum messages per batch
 *     responses:
 *       200:
 *         description: Bulk send results
 */
router.post(
  '/:sessionId/messages',
  messageLimiter,
  sessionIdValidation,
  bulkMessagesValidation,
  validate,
  bulkController.bulkSendMessages
);

/**
 * @swagger
 * /api/v1/bulk/{sessionId}/mark-read:
 *   post:
 *     summary: Bulk mark chats as read
 *     tags: [Bulk Operations]
 */
router.post(
  '/:sessionId/mark-read',
  sessionIdValidation,
  bulkJidsValidation,
  validate,
  bulkController.bulkMarkAsRead
);

/**
 * @swagger
 * /api/v1/bulk/{sessionId}/assign:
 *   post:
 *     summary: Bulk assign chats to agents
 *     tags: [Bulk Operations]
 */
router.post(
  '/:sessionId/assign',
  sessionIdValidation,
  bulkAssignmentsValidation,
  validate,
  bulkController.bulkAssignChats
);

/**
 * @swagger
 * /api/v1/bulk/{sessionId}/contacts:
 *   put:
 *     summary: Bulk update contacts
 *     tags: [Bulk Operations]
 */
router.put(
  '/:sessionId/contacts',
  sessionIdValidation,
  bulkContactsValidation,
  validate,
  bulkController.bulkUpdateContacts
);

/**
 * @swagger
 * /api/v1/bulk/{sessionId}/archive:
 *   post:
 *     summary: Bulk archive/unarchive chats
 *     tags: [Bulk Operations]
 */
router.post(
  '/:sessionId/archive',
  sessionIdValidation,
  bulkJidsValidation,
  validate,
  bulkController.bulkArchiveChats
);

/**
 * @swagger
 * /api/v1/bulk/{sessionId}/messages:
 *   delete:
 *     summary: Bulk delete messages
 *     tags: [Bulk Operations]
 */
router.delete(
  '/:sessionId/messages',
  sessionIdValidation,
  bulkMessagesDeleteValidation,
  validate,
  bulkController.bulkDeleteMessages
);

/**
 * @swagger
 * /api/v1/bulk/{sessionId}/resolve:
 *   post:
 *     summary: Bulk resolve conversations
 *     tags: [Bulk Operations]
 */
router.post(
  '/:sessionId/resolve',
  sessionIdValidation,
  bulkJidsValidation,
  validate,
  bulkController.bulkResolveConversations
);

module.exports = router;
