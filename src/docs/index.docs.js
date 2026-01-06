/**
 * @swagger
 * /:
 *   get:
 *     summary: API Information
 *     description: Get API version and documentation URL
 *     tags: [General]
 *     security: []
 *     responses:
 *       200:
 *         description: API information
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: WhatsApp API Server
 *                 version:
 *                   type: string
 *                   example: v1
 *                 docs:
 *                   type: string
 *                   example: http://localhost:3000/api/docs
 *
 * /health:
 *   get:
 *     summary: Health Check
 *     description: Check if the API server is running
 *     tags: [General]
 *     security: []
 *     responses:
 *       200:
 *         description: Server is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: OK
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 uptime:
 *                   type: number
 *                   description: Server uptime in seconds
 *                 environment:
 *                   type: string
 *                   example: development
 */

/**
 * API Endpoint Summary
 * ====================
 * 
 * Total Endpoints: 108
 * 
 * Authentication (15 endpoints):
 * - POST /auth/register
 * - POST /auth/login
 * - POST /auth/refresh
 * - POST /auth/logout
 * - GET  /auth/me
 * - PUT  /auth/profile
 * - POST /auth/change-password
 * - POST /auth/forgot-password
 * - POST /auth/reset-password
 * - GET  /auth/verify-email
 * - POST /auth/resend-verification
 * - POST /auth/2fa/setup
 * - POST /auth/2fa/verify
 * - POST /auth/2fa/disable
 * - GET  /auth/api-keys
 * - POST /auth/api-keys
 * - DELETE /auth/api-keys/:id
 * 
 * Sessions (8 endpoints):
 * - GET    /sessions
 * - POST   /sessions
 * - GET    /sessions/:id
 * - DELETE /sessions/:id
 * - GET    /sessions/:id/qr
 * - GET    /sessions/:id/status
 * - POST   /sessions/:id/logout
 * - POST   /sessions/:id/restart
 * 
 * Messages (16 endpoints):
 * - POST   /messages/text
 * - POST   /messages/image
 * - POST   /messages/video
 * - POST   /messages/audio
 * - POST   /messages/document
 * - POST   /messages/location
 * - POST   /messages/contact
 * - POST   /messages/sticker
 * - POST   /messages/buttons
 * - POST   /messages/list
 * - POST   /messages/reaction
 * - POST   /messages/reply
 * - POST   /messages/forward
 * - DELETE /messages/:id
 * - GET    /messages/history
 * - GET    /messages/media/:id
 * 
 * Templates (6 endpoints):
 * - GET    /templates
 * - POST   /templates
 * - GET    /templates/:id
 * - PUT    /templates/:id
 * - DELETE /templates/:id
 * - POST   /templates/:id/send
 * 
 * Broadcast (3 endpoints):
 * - POST   /broadcast
 * - POST   /broadcast/template
 * - GET    /broadcast/status/:id
 * 
 * Chat (11 endpoints):
 * - GET    /chat/list
 * - GET    /chat/:id
 * - GET    /chat/:id/messages
 * - POST   /chat/:id/read
 * - POST   /chat/:id/archive
 * - POST   /chat/:id/unarchive
 * - POST   /chat/:id/pin
 * - POST   /chat/:id/unpin
 * - POST   /chat/:id/mute
 * - POST   /chat/:id/unmute
 * - DELETE /chat/:id/clear
 * 
 * Groups (12 endpoints):
 * - POST   /groups/create
 * - GET    /groups/list
 * - GET    /groups/info
 * - PUT    /groups/update-name
 * - PUT    /groups/update-description
 * - PUT    /groups/update-picture
 * - POST   /groups/participants/add
 * - POST   /groups/participants/remove
 * - POST   /groups/participants/promote
 * - POST   /groups/participants/demote
 * - POST   /groups/leave
 * - GET    /groups/invite
 * - POST   /groups/invite/revoke
 * 
 * Contacts (8 endpoints):
 * - GET    /contacts/list
 * - POST   /contacts/check
 * - GET    /contacts/info
 * - GET    /contacts/profile-picture
 * - GET    /contacts/status
 * - POST   /contacts/block
 * - POST   /contacts/unblock
 * - GET    /contacts/blocked
 * 
 * Webhooks (6 endpoints):
 * - POST   /webhooks/test
 * - POST   /webhooks/configure
 * - GET    /webhooks/config/:sessionId
 * - DELETE /webhooks/config/:sessionId
 * - GET    /webhooks/logs
 * - POST   /webhooks/logs/:id/retry
 * - GET    /webhooks/events
 * 
 * Schedule (7 endpoints):
 * - POST   /schedule/message
 * - GET    /schedule/messages
 * - GET    /schedule/messages/:id
 * - PUT    /schedule/messages/:id
 * - DELETE /schedule/messages/:id
 * - POST   /schedule/bulk
 * - POST   /schedule/send-bulk
 * 
 * Admin (16 endpoints):
 * - GET    /admin/dashboard
 * - GET    /admin/metrics
 * - GET    /admin/health
 * - GET    /admin/users
 * - GET    /admin/users/:id
 * - PUT    /admin/users/:id
 * - DELETE /admin/users/:id
 * - POST   /admin/users/:id/suspend
 * - POST   /admin/users/:id/unsuspend
 * - GET    /admin/sessions
 * - POST   /admin/sessions/:id/disconnect
 * - GET    /admin/audit-logs
 * - POST   /admin/subscriptions
 * - GET    /admin/plans
 * - POST   /admin/plans
 */
