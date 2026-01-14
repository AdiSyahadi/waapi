/**
 * Metrics Routes - SLA and Performance Reporting
 * Fixes Issue #8: No SLA/response time tracking for agent performance
 */

const express = require('express');
const router = express.Router();
const metricsController = require('../controllers/metricsController');
const { authenticate } = require('../middleware/auth');
const { requireVerifiedEmail, requireAdmin } = require('../middleware/permissions');
const { body, param, query } = require('express-validator');
const { validate } = require('../middleware/validator');

// Validation
const dateRangeValidation = [
  query('startDate').optional().isISO8601().withMessage('Invalid start date'),
  query('endDate').optional().isISO8601().withMessage('Invalid end date')
];

const csatValidation = [
  body('score').isInt({ min: 1, max: 5 }).withMessage('Score must be 1-5'),
  body('feedback').optional().isString().isLength({ max: 1000 })
];

// All routes require authentication
router.use(authenticate);
router.use(requireVerifiedEmail);

/**
 * @swagger
 * /api/v1/metrics/agents/{agentId}/performance:
 *   get:
 *     summary: Get agent performance metrics
 *     description: Get detailed performance metrics for a specific agent
 *     tags: [Metrics]
 *     parameters:
 *       - in: path
 *         name: agentId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: sessionId
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Agent performance data
 */
router.get(
  '/agents/:agentId/performance',
  param('agentId').isUUID(),
  dateRangeValidation,
  validate,
  metricsController.getAgentPerformance
);

/**
 * @swagger
 * /api/v1/metrics/agents/summary:
 *   get:
 *     summary: Get all agents performance summary
 *     description: Get summary of all agents' performance for comparison
 *     tags: [Metrics]
 */
router.get(
  '/agents/summary',
  dateRangeValidation,
  validate,
  metricsController.getAgentsSummary
);

/**
 * @swagger
 * /api/v1/metrics/sla/report:
 *   get:
 *     summary: Get SLA compliance report
 *     description: Get detailed SLA compliance metrics
 *     tags: [Metrics]
 */
router.get(
  '/sla/report',
  dateRangeValidation,
  validate,
  metricsController.getSlaReport
);

/**
 * @swagger
 * /api/v1/metrics/conversations/{conversationId}:
 *   get:
 *     summary: Get conversation metrics
 *     description: Get detailed metrics for a specific conversation
 *     tags: [Metrics]
 */
router.get(
  '/conversations/:conversationId',
  param('conversationId').isUUID(),
  validate,
  metricsController.getConversationMetrics
);

/**
 * @swagger
 * /api/v1/metrics/conversations/{conversationId}/csat:
 *   post:
 *     summary: Submit CSAT score
 *     description: Submit customer satisfaction score for a conversation
 *     tags: [Metrics]
 */
router.post(
  '/conversations/:conversationId/csat',
  param('conversationId').isUUID(),
  csatValidation,
  validate,
  metricsController.submitCsat
);

/**
 * @swagger
 * /api/v1/metrics/csat/summary:
 *   get:
 *     summary: Get CSAT summary
 *     description: Get customer satisfaction summary with NPS calculation
 *     tags: [Metrics]
 */
router.get(
  '/csat/summary',
  dateRangeValidation,
  validate,
  metricsController.getCsatSummary
);

module.exports = router;
