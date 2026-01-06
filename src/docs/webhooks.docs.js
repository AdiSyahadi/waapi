/**
 * @swagger
 * /api/v1/webhooks/test:
 *   post:
 *     summary: Test webhook endpoint
 *     tags: [Webhooks]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - url
 *             properties:
 *               url:
 *                 type: string
 *                 format: uri
 *                 example: https://your-server.com/webhook
 *     responses:
 *       200:
 *         description: Webhook test result
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 response_time:
 *                   type: integer
 *                   description: Response time in ms
 *
 * /api/v1/webhooks/configure:
 *   post:
 *     summary: Configure webhook for a session
 *     tags: [Webhooks]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - session_id
 *               - url
 *             properties:
 *               session_id:
 *                 type: string
 *               url:
 *                 type: string
 *                 format: uri
 *               events:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: [message.received, message.sent, message.delivered, message.read, connection.update, group.update, presence.update]
 *                 default: ["message.received"]
 *               headers:
 *                 type: object
 *                 description: Custom headers to send with webhook
 *     responses:
 *       200:
 *         description: Webhook configured
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 webhook_secret:
 *                   type: string
 *                   description: HMAC secret for signature verification
 *
 * /api/v1/webhooks/config/{sessionId}:
 *   get:
 *     summary: Get webhook configuration
 *     tags: [Webhooks]
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Webhook configuration
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 webhook:
 *                   $ref: '#/components/schemas/Webhook'
 *
 *   delete:
 *     summary: Remove webhook configuration
 *     tags: [Webhooks]
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Webhook removed
 *
 * /api/v1/webhooks/logs:
 *   get:
 *     summary: Get webhook delivery logs
 *     tags: [Webhooks]
 *     parameters:
 *       - in: query
 *         name: session_id
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, delivered, failed]
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
 *         description: Webhook logs
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 pagination:
 *                   $ref: '#/components/schemas/Pagination'
 *                 logs:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       session_id:
 *                         type: string
 *                       event:
 *                         type: string
 *                       url:
 *                         type: string
 *                       status:
 *                         type: string
 *                       response_code:
 *                         type: integer
 *                       delivered_at:
 *                         type: string
 *                         format: date-time
 *
 * /api/v1/webhooks/logs/{id}/retry:
 *   post:
 *     summary: Retry failed webhook delivery
 *     tags: [Webhooks]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Webhook retry initiated
 *
 * /api/v1/webhooks/events:
 *   get:
 *     summary: Get available webhook events
 *     tags: [Webhooks]
 *     responses:
 *       200:
 *         description: Available events
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 events:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       name:
 *                         type: string
 *                       description:
 *                         type: string
 *                       payload_example:
 *                         type: object
 */
