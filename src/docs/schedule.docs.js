/**
 * @swagger
 * /api/v1/schedule/message:
 *   post:
 *     summary: Schedule a message
 *     tags: [Schedule]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - session_id
 *               - recipient
 *               - content
 *               - scheduled_at
 *             properties:
 *               session_id:
 *                 type: string
 *               recipient:
 *                 type: string
 *                 example: "6281234567890"
 *               message_type:
 *                 type: string
 *                 enum: [text, image, video, audio, document]
 *                 default: text
 *               content:
 *                 type: string
 *               media_url:
 *                 type: string
 *                 description: Required for media messages
 *               caption:
 *                 type: string
 *               scheduled_at:
 *                 type: string
 *                 format: date-time
 *                 example: "2025-12-23T10:00:00.000Z"
 *     responses:
 *       201:
 *         description: Message scheduled
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 scheduled_message:
 *                   $ref: '#/components/schemas/ScheduledMessage'
 *
 * /api/v1/schedule/messages:
 *   get:
 *     summary: Get all scheduled messages
 *     tags: [Schedule]
 *     parameters:
 *       - in: query
 *         name: session_id
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, sent, failed, cancelled]
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: List of scheduled messages
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 pagination:
 *                   $ref: '#/components/schemas/Pagination'
 *                 messages:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/ScheduledMessage'
 *
 * /api/v1/schedule/messages/{id}:
 *   get:
 *     summary: Get scheduled message details
 *     tags: [Schedule]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Scheduled message details
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *
 *   put:
 *     summary: Update scheduled message
 *     tags: [Schedule]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               content:
 *                 type: string
 *               scheduled_at:
 *                 type: string
 *                 format: date-time
 *               recipient:
 *                 type: string
 *     responses:
 *       200:
 *         description: Scheduled message updated
 *
 *   delete:
 *     summary: Cancel scheduled message
 *     tags: [Schedule]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Scheduled message cancelled
 *
 * /api/v1/schedule/bulk:
 *   post:
 *     summary: Schedule multiple messages
 *     tags: [Schedule]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - session_id
 *               - messages
 *             properties:
 *               session_id:
 *                 type: string
 *               messages:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - recipient
 *                     - content
 *                     - scheduled_at
 *                   properties:
 *                     recipient:
 *                       type: string
 *                     message_type:
 *                       type: string
 *                       default: text
 *                     content:
 *                       type: string
 *                     media_url:
 *                       type: string
 *                     caption:
 *                       type: string
 *                     scheduled_at:
 *                       type: string
 *                       format: date-time
 *     responses:
 *       201:
 *         description: Messages scheduled
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 total:
 *                   type: integer
 *                 scheduled:
 *                   type: integer
 *                 failed:
 *                   type: integer
 *
 * /api/v1/schedule/send-bulk:
 *   post:
 *     summary: Send bulk messages immediately
 *     tags: [Schedule]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - session_id
 *               - recipients
 *               - content
 *             properties:
 *               session_id:
 *                 type: string
 *               recipients:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["6281234567890", "6281234567891"]
 *               message_type:
 *                 type: string
 *                 enum: [text, image, video, audio, document]
 *                 default: text
 *               content:
 *                 type: string
 *               media_url:
 *                 type: string
 *               caption:
 *                 type: string
 *               delay:
 *                 type: integer
 *                 description: Delay between messages in ms
 *                 default: 1000
 *     responses:
 *       200:
 *         description: Bulk send initiated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 total:
 *                   type: integer
 *                 sent:
 *                   type: integer
 *                 failed:
 *                   type: integer
 *                 results:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       recipient:
 *                         type: string
 *                       success:
 *                         type: boolean
 *                       message_id:
 *                         type: string
 *                       error:
 *                         type: string
 */
