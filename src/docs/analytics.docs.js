/**
 * @swagger
 * components:
 *   schemas:
 *     DashboardOverview:
 *       type: object
 *       properties:
 *         overview:
 *           type: object
 *           properties:
 *             activeSessions:
 *               type: integer
 *             plan:
 *               type: string
 *             messagesSentToday:
 *               type: integer
 *             deliveryRate:
 *               type: string
 *             apiRequestsToday:
 *               type: integer
 *             apiSuccessRate:
 *               type: string
 *         messageStats:
 *           $ref: '#/components/schemas/MessageStats'
 *         apiStats:
 *           $ref: '#/components/schemas/ApiStats'
 *         recentActivity:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/ActivityLog'
 * 
 *     MessageStats:
 *       type: object
 *       properties:
 *         daily:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               date:
 *                 type: string
 *                 format: date
 *               messagesSent:
 *                 type: integer
 *               messagesDelivered:
 *                 type: integer
 *               messagesRead:
 *                 type: integer
 *               messagesFailed:
 *                 type: integer
 *         totals:
 *           type: object
 *           properties:
 *             sent:
 *               type: integer
 *             delivered:
 *               type: integer
 *             read:
 *               type: integer
 *             failed:
 *               type: integer
 *         deliveryRate:
 *           type: string
 *           example: "95.50"
 *         readRate:
 *           type: string
 *           example: "78.30"
 * 
 *     ApiStats:
 *       type: object
 *       properties:
 *         daily:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               date:
 *                 type: string
 *                 format: date
 *               totalRequests:
 *                 type: integer
 *               successfulRequests:
 *                 type: integer
 *               failedRequests:
 *                 type: integer
 *               avgResponseTime:
 *                 type: number
 *         topEndpoints:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               endpoint:
 *                 type: string
 *               method:
 *                 type: string
 *               totalRequests:
 *                 type: integer
 *         totals:
 *           type: object
 *           properties:
 *             requests:
 *               type: integer
 *             successful:
 *               type: integer
 *             failed:
 *               type: integer
 *             avgResponseTime:
 *               type: string
 *         successRate:
 *           type: string
 * 
 *     SessionStats:
 *       type: object
 *       properties:
 *         sessions:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               sessionId:
 *                 type: string
 *               uptimeHours:
 *                 type: string
 *               disconnections:
 *                 type: integer
 *               reconnections:
 *                 type: integer
 *               qrScans:
 *                 type: integer
 *         currentStatus:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               sessionId:
 *                 type: string
 *               name:
 *                 type: string
 *               status:
 *                 type: string
 *               lastActive:
 *                 type: string
 *                 format: date-time
 * 
 *     ActivityLog:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         eventType:
 *           type: string
 *           enum: [login, logout, session_create, session_connect, session_disconnect, message_sent, message_received, broadcast_sent, api_call, webhook_delivered, subscription_created, subscription_cancelled, payment_success, payment_failed]
 *         eventData:
 *           type: object
 *         ipAddress:
 *           type: string
 *         userAgent:
 *           type: string
 *         createdAt:
 *           type: string
 *           format: date-time
 * 
 *     AdminDashboard:
 *       type: object
 *       properties:
 *         users:
 *           type: object
 *           properties:
 *             total:
 *               type: integer
 *             active:
 *               type: integer
 *             newThisWeek:
 *               type: integer
 *             newThisMonth:
 *               type: integer
 *             dailyGrowth:
 *               type: array
 *               items:
 *                 type: object
 *         sessions:
 *           type: object
 *           properties:
 *             total:
 *               type: integer
 *             connected:
 *               type: integer
 *             connectionRate:
 *               type: string
 *         subscriptions:
 *           type: object
 *           properties:
 *             active:
 *               type: integer
 *             byPlan:
 *               type: array
 *               items:
 *                 type: object
 *         messages:
 *           type: object
 *           properties:
 *             totalSent:
 *               type: integer
 *             totalDelivered:
 *               type: integer
 *             totalBroadcasts:
 *               type: integer
 *         revenue:
 *           type: object
 *           properties:
 *             thisMonth:
 *               type: string
 * 
 *     SystemMetrics:
 *       type: object
 *       properties:
 *         server:
 *           type: object
 *           properties:
 *             uptime:
 *               type: object
 *               properties:
 *                 seconds:
 *                   type: number
 *                 formatted:
 *                   type: string
 *             memory:
 *               type: object
 *               properties:
 *                 heapUsed:
 *                   type: string
 *                 heapTotal:
 *                   type: string
 *                 rss:
 *                   type: string
 *             nodeVersion:
 *               type: string
 *             platform:
 *               type: string
 *         database:
 *           type: object
 *           properties:
 *             totalUsers:
 *               type: integer
 *             connectedSessions:
 *               type: integer
 *             messagesToday:
 *               type: integer
 * 
 * @swagger
 * tags:
 *   name: Analytics
 *   description: Analytics, reporting, and dashboard endpoints
 */

/**
 * @swagger
 * /api/v1/analytics/dashboard:
 *   get:
 *     summary: Get user dashboard overview
 *     description: Get comprehensive dashboard with message stats, API usage, and recent activity
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/DashboardOverview'
 */

/**
 * @swagger
 * /api/v1/analytics/messages:
 *   get:
 *     summary: Get message statistics
 *     description: Get detailed message statistics with delivery and read rates
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date (YYYY-MM-DD), defaults to 30 days ago
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date (YYYY-MM-DD), defaults to today
 *       - in: query
 *         name: sessionId
 *         schema:
 *           type: string
 *         description: Filter by session ID
 *     responses:
 *       200:
 *         description: Message statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/MessageStats'
 */

/**
 * @swagger
 * /api/v1/analytics/api:
 *   get:
 *     summary: Get API usage statistics
 *     description: Get API request statistics including top endpoints
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
 *         description: API statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/ApiStats'
 */

/**
 * @swagger
 * /api/v1/analytics/sessions:
 *   get:
 *     summary: Get session statistics
 *     description: Get session uptime, disconnection, and status statistics
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
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/SessionStats'
 */

/**
 * @swagger
 * /api/v1/analytics/activity:
 *   get:
 *     summary: Get recent activity logs
 *     description: Get activity log with optional event type filtering
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
 *     responses:
 *       200:
 *         description: Activity logs
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/ActivityLog'
 */

/**
 * @swagger
 * /api/v1/analytics/export:
 *   get:
 *     summary: Export analytics data
 *     description: Export analytics data in JSON or CSV format
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
 *         description: Exported data
 */

/**
 * @swagger
 * /api/v1/analytics/realtime:
 *   get:
 *     summary: Get realtime statistics
 *     description: Get current day statistics for realtime dashboard
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Realtime stats
 */

/**
 * @swagger
 * /api/v1/analytics/admin/dashboard:
 *   get:
 *     summary: Get admin platform dashboard
 *     description: Get platform-wide statistics (Admin only)
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Admin dashboard data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/AdminDashboard'
 */

/**
 * @swagger
 * /api/v1/analytics/admin/messages:
 *   get:
 *     summary: Get platform message stats
 *     description: Get platform-wide message statistics with top users (Admin only)
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

/**
 * @swagger
 * /api/v1/analytics/admin/users/{userId}:
 *   get:
 *     summary: Get user analytics
 *     description: Get detailed analytics for a specific user (Admin only)
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
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
 *     responses:
 *       200:
 *         description: User analytics
 *       404:
 *         description: User not found
 */

/**
 * @swagger
 * /api/v1/analytics/admin/cleanup:
 *   post:
 *     summary: Cleanup old analytics
 *     description: Remove analytics data older than specified days (Admin only)
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
 *     responses:
 *       200:
 *         description: Cleanup completed
 */

/**
 * @swagger
 * /api/v1/analytics/admin/system:
 *   get:
 *     summary: Get system metrics
 *     description: Get server and database metrics (Admin only)
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: System metrics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/SystemMetrics'
 */

module.exports = {};
