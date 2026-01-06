const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const { authenticate } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/permissions');

// All routes require authentication
router.use(authenticate);

/**
 * @swagger
 * tags:
 *   name: Analytics
 *   description: Analytics and reporting endpoints
 */

// ==================== USER ENDPOINTS ====================

/**
 * @swagger
 * /api/v1/analytics/dashboard:
 *   get:
 *     summary: Get user dashboard overview
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard data
 */
router.get('/dashboard', analyticsController.getDashboard);

/**
 * @swagger
 * /api/v1/analytics/messages:
 *   get:
 *     summary: Get message statistics
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date (YYYY-MM-DD)
 *       - in: query
 *         name: sessionId
 *         schema:
 *           type: string
 *         description: Filter by session ID
 *     responses:
 *       200:
 *         description: Message statistics
 */
router.get('/messages', analyticsController.getMessageStats);

/**
 * @swagger
 * /api/v1/analytics/api:
 *   get:
 *     summary: Get API usage statistics
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
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
 *     responses:
 *       200:
 *         description: API usage statistics
 */
router.get('/api', analyticsController.getApiStats);

/**
 * @swagger
 * /api/v1/analytics/sessions:
 *   get:
 *     summary: Get session statistics
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
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
 *     responses:
 *       200:
 *         description: Session statistics
 */
router.get('/sessions', analyticsController.getSessionStats);

/**
 * @swagger
 * /api/v1/analytics/activity:
 *   get:
 *     summary: Get recent activity logs
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *       - in: query
 *         name: eventType
 *         schema:
 *           type: string
 *         description: Filter by event type
 *     responses:
 *       200:
 *         description: Activity logs
 */
router.get('/activity', analyticsController.getRecentActivity);

/**
 * @swagger
 * /api/v1/analytics/export:
 *   get:
 *     summary: Export analytics data
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         required: true
 *         schema:
 *           type: string
 *           enum: [messages, api, sessions, activity]
 *       - in: query
 *         name: startDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: [json, csv]
 *           default: json
 *     responses:
 *       200:
 *         description: Exported analytics data
 */
router.get('/export', analyticsController.exportAnalytics);

/**
 * @swagger
 * /api/v1/analytics/realtime:
 *   get:
 *     summary: Get realtime statistics
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Realtime stats
 */
router.get('/realtime', analyticsController.getRealtimeStats);

// ==================== ADMIN ENDPOINTS ====================

/**
 * @swagger
 * /api/v1/analytics/admin/dashboard:
 *   get:
 *     summary: Get admin platform dashboard (Admin only)
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Admin dashboard data
 */
router.get('/admin/dashboard', authenticate, requireAdmin, analyticsController.getAdminDashboard);

/**
 * @swagger
 * /api/v1/analytics/admin/messages:
 *   get:
 *     summary: Get platform-wide message stats (Admin only)
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
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
 *     responses:
 *       200:
 *         description: Platform message statistics
 */
router.get('/admin/messages', authenticate, requireAdmin, analyticsController.getAdminMessageStats);

/**
 * @swagger
 * /api/v1/analytics/admin/users/{userId}:
 *   get:
 *     summary: Get specific user analytics (Admin only)
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
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
 *     responses:
 *       200:
 *         description: User analytics
 */
router.get('/admin/users/:userId', authenticate, requireAdmin, analyticsController.getAdminUserAnalytics);

/**
 * @swagger
 * /api/v1/analytics/admin/cleanup:
 *   post:
 *     summary: Cleanup old analytics data (Admin only)
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               daysToKeep:
 *                 type: integer
 *                 default: 90
 *                 description: Number of days to keep
 *     responses:
 *       200:
 *         description: Cleanup completed
 */
router.post('/admin/cleanup', authenticate, requireAdmin, analyticsController.cleanupAnalytics);

/**
 * @swagger
 * /api/v1/analytics/admin/system:
 *   get:
 *     summary: Get system metrics (Admin only)
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: System metrics
 */
router.get('/admin/system', authenticate, requireAdmin, analyticsController.getSystemMetrics);

module.exports = router;
