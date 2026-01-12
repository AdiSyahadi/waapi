const express = require('express');
const router = express.Router();
const crmController = require('../controllers/crmController');
const { authenticate } = require('../middleware/auth');
const { authenticateWithApiKeySupport } = require('../middleware/authOrApiKey');
const { requireVerifiedEmail } = require('../middleware/permissions');
const { body, query, param } = require('express-validator');
const { validate } = require('../middleware/validator');

// Validation rules
const syncContactsValidation = [
  body('session_id').notEmpty().withMessage('Session ID is required'),
  body('include_profile_pictures').optional().isBoolean().withMessage('include_profile_pictures must be boolean')
];

const assignChatValidation = [
  body('session_id').notEmpty().withMessage('Session ID is required'),
  body('chat_jid').notEmpty().withMessage('Chat JID is required'),
  body('assigned_to').optional().isUUID().withMessage('assigned_to must be valid UUID'),
  body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']).withMessage('Invalid priority'),
  body('tags').optional().isArray().withMessage('Tags must be an array')
];

const updateAssignmentValidation = [
  body('status').optional().isIn(['open', 'pending', 'resolved', 'closed']).withMessage('Invalid status'),
  body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']).withMessage('Invalid priority'),
  body('assigned_to').optional().isUUID().withMessage('assigned_to must be valid UUID'),
  body('tags').optional().isArray().withMessage('Tags must be an array')
];

const updateContactValidation = [
  body('custom_name').optional().isString().withMessage('custom_name must be string'),
  body('custom_tags').optional().isArray().withMessage('custom_tags must be array'),
  body('custom_notes').optional().isString().withMessage('custom_notes must be string')
];

// All routes require authentication (JWT or API key) and verified email
router.use(authenticateWithApiKeySupport);
router.use(requireVerifiedEmail);

// ===== CONTACT SYNC ROUTES =====

/**
 * @swagger
 * /api/v1/crm/contacts/sync:
 *   post:
 *     summary: Sync contacts from WhatsApp to database
 *     tags: [CRM]
 *     security:
 *       - bearerAuth: []
 *       - apiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - session_id
 *             properties:
 *               session_id:
 *                 type: string
 *                 description: WhatsApp session ID
 *               include_profile_pictures:
 *                 type: boolean
 *                 default: false
 *                 description: Include profile pictures (slower)
 *     responses:
 *       200:
 *         description: Contacts synced successfully
 */
router.post('/contacts/sync', syncContactsValidation, validate, crmController.syncContacts);

/**
 * @swagger
 * /api/v1/crm/contacts:
 *   get:
 *     summary: Get synced contacts with filters
 *     tags: [CRM]
 *     security:
 *       - bearerAuth: []
 *       - apiKeyAuth: []
 *     parameters:
 *       - in: query
 *         name: session_id
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *     responses:
 *       200:
 *         description: List of synced contacts
 */
router.get('/contacts', crmController.getSyncedContacts);

/**
 * @swagger
 * /api/v1/crm/contacts/{contactId}:
 *   put:
 *     summary: Update contact custom fields
 *     tags: [CRM]
 *     security:
 *       - bearerAuth: []
 *       - apiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: contactId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               custom_name:
 *                 type: string
 *               custom_tags:
 *                 type: array
 *                 items:
 *                   type: string
 *               custom_notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Contact updated
 */
router.put('/contacts/:contactId', updateContactValidation, validate, crmController.updateContact);

/**
 * @swagger
 * /api/v1/crm/contacts/{contactId}:
 *   delete:
 *     summary: Delete synced contact
 *     tags: [CRM]
 *     security:
 *       - bearerAuth: []
 *       - apiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: contactId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Contact deleted
 */
router.delete('/contacts/:contactId', crmController.deleteContact);

// ===== CHAT ASSIGNMENT ROUTES =====

/**
 * @swagger
 * /api/v1/crm/chats/assign:
 *   post:
 *     summary: Assign chat to agent
 *     tags: [CRM]
 *     security:
 *       - bearerAuth: []
 *       - apiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - session_id
 *               - chat_jid
 *             properties:
 *               session_id:
 *                 type: string
 *               chat_jid:
 *                 type: string
 *                 description: "WhatsApp JID (e.g., 628123456789@s.whatsapp.net)"
 *               assigned_to:
 *                 type: string
 *                 format: uuid
 *                 description: User ID of agent to assign
 *               priority:
 *                 type: string
 *                 enum: [low, medium, high, urgent]
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *               notes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Chat assigned successfully
 */
router.post('/chats/assign', assignChatValidation, validate, crmController.assignChat);

/**
 * @swagger
 * /api/v1/crm/chats/assignments:
 *   get:
 *     summary: Get all chat assignments
 *     tags: [CRM]
 *     security:
 *       - bearerAuth: []
 *       - apiKeyAuth: []
 *     parameters:
 *       - in: query
 *         name: session_id
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [open, pending, resolved, closed]
 *       - in: query
 *         name: assigned_to
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: priority
 *         schema:
 *           type: string
 *           enum: [low, medium, high, urgent]
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *     responses:
 *       200:
 *         description: List of assignments
 */
router.get('/chats/assignments', crmController.getAssignments);

/**
 * @swagger
 * /api/v1/crm/chats/assignments/stats:
 *   get:
 *     summary: Get agent workload statistics
 *     tags: [CRM]
 *     security:
 *       - bearerAuth: []
 *       - apiKeyAuth: []
 *     parameters:
 *       - in: query
 *         name: session_id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Agent statistics
 */
router.get('/chats/assignments/stats', crmController.getAgentStats);

/**
 * @swagger
 * /api/v1/crm/chats/assignments/chat/{chatJid}:
 *   get:
 *     summary: Get assignment for specific chat
 *     tags: [CRM]
 *     security:
 *       - bearerAuth: []
 *       - apiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: chatJid
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: session_id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Chat assignment details
 */
router.get('/chats/assignments/chat/:chatJid', crmController.getAssignmentByChat);

/**
 * @swagger
 * /api/v1/crm/chats/assignments/{assignmentId}:
 *   put:
 *     summary: Update chat assignment
 *     tags: [CRM]
 *     security:
 *       - bearerAuth: []
 *       - apiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: assignmentId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [open, pending, resolved, closed]
 *               priority:
 *                 type: string
 *                 enum: [low, medium, high, urgent]
 *               assigned_to:
 *                 type: string
 *                 format: uuid
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Assignment updated
 */
router.put('/chats/assignments/:assignmentId', updateAssignmentValidation, validate, crmController.updateAssignment);

/**
 * @swagger
 * /api/v1/crm/chats/assignments/{assignmentId}:
 *   delete:
 *     summary: Remove chat assignment
 *     tags: [CRM]
 *     security:
 *       - bearerAuth: []
 *       - apiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: assignmentId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Assignment removed
 */
router.delete('/chats/assignments/:assignmentId', crmController.unassignChat);

module.exports = router;
