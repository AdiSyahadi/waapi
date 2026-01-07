/**
 * @swagger
 * /api/v1/messages/{sessionId}/send/text:
 *   post:
 *     summary: Send text message
 *     tags: [Messages]
 *     security:
 *       - apiKeyAuth: []
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *         description: WhatsApp session ID (UUID)
 *         example: "266cdcce-97a1-4d70-a6c5-b561b90acdfd"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - phone
 *               - message
 *             properties:
 *               phone:
 *                 type: string
 *                 description: Phone number with country code (no + or spaces)
 *                 example: "6281234567890"
 *               message:
 *                 type: string
 *                 example: Hello, this is a test message!
 *     responses:
 *       200:
 *         description: Message sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Message sent successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     message_id:
 *                       type: string
 *                     status:
 *                       type: string
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         description: Session not found
 */
 *
 * /api/v1/messages/image:
 *   post:
 *     summary: Send image message
 *     tags: [Messages]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - session_id
 *               - recipient
 *               - image
 *             properties:
 *               session_id:
 *                 type: string
 *               recipient:
 *                 type: string
 *               image:
 *                 type: string
 *                 description: URL or base64 encoded image
 *               caption:
 *                 type: string
 *     responses:
 *       200:
 *         description: Image sent
 *
 * /api/v1/messages/video:
 *   post:
 *     summary: Send video message
 *     tags: [Messages]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - session_id
 *               - recipient
 *               - video
 *             properties:
 *               session_id:
 *                 type: string
 *               recipient:
 *                 type: string
 *               video:
 *                 type: string
 *                 description: URL or base64 encoded video
 *               caption:
 *                 type: string
 *     responses:
 *       200:
 *         description: Video sent
 *
 * /api/v1/messages/audio:
 *   post:
 *     summary: Send audio message
 *     tags: [Messages]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - session_id
 *               - recipient
 *               - audio
 *             properties:
 *               session_id:
 *                 type: string
 *               recipient:
 *                 type: string
 *               audio:
 *                 type: string
 *                 description: URL or base64 encoded audio
 *               ptt:
 *                 type: boolean
 *                 description: Send as voice note
 *                 default: false
 *     responses:
 *       200:
 *         description: Audio sent
 *
 * /api/v1/messages/document:
 *   post:
 *     summary: Send document
 *     tags: [Messages]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - session_id
 *               - recipient
 *               - document
 *             properties:
 *               session_id:
 *                 type: string
 *               recipient:
 *                 type: string
 *               document:
 *                 type: string
 *                 description: URL or base64 encoded document
 *               filename:
 *                 type: string
 *                 example: report.pdf
 *               mimetype:
 *                 type: string
 *                 example: application/pdf
 *     responses:
 *       200:
 *         description: Document sent
 *
 * /api/v1/messages/location:
 *   post:
 *     summary: Send location
 *     tags: [Messages]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - session_id
 *               - recipient
 *               - latitude
 *               - longitude
 *             properties:
 *               session_id:
 *                 type: string
 *               recipient:
 *                 type: string
 *               latitude:
 *                 type: number
 *                 example: -6.200000
 *               longitude:
 *                 type: number
 *                 example: 106.816666
 *               name:
 *                 type: string
 *                 example: Jakarta
 *               address:
 *                 type: string
 *                 example: Jakarta, Indonesia
 *     responses:
 *       200:
 *         description: Location sent
 *
 * /api/v1/messages/contact:
 *   post:
 *     summary: Send contact card
 *     tags: [Messages]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - session_id
 *               - recipient
 *               - contact
 *             properties:
 *               session_id:
 *                 type: string
 *               recipient:
 *                 type: string
 *               contact:
 *                 type: object
 *                 properties:
 *                   fullName:
 *                     type: string
 *                   phoneNumber:
 *                     type: string
 *                   organization:
 *                     type: string
 *     responses:
 *       200:
 *         description: Contact sent
 *
 * /api/v1/messages/sticker:
 *   post:
 *     summary: Send sticker
 *     tags: [Messages]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - session_id
 *               - recipient
 *               - sticker
 *             properties:
 *               session_id:
 *                 type: string
 *               recipient:
 *                 type: string
 *               sticker:
 *                 type: string
 *                 description: URL or base64 encoded WebP image
 *     responses:
 *       200:
 *         description: Sticker sent
 *
 * /api/v1/messages/buttons:
 *   post:
 *     summary: Send message with buttons
 *     tags: [Messages]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - session_id
 *               - recipient
 *               - text
 *               - buttons
 *             properties:
 *               session_id:
 *                 type: string
 *               recipient:
 *                 type: string
 *               text:
 *                 type: string
 *               footer:
 *                 type: string
 *               buttons:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     text:
 *                       type: string
 *     responses:
 *       200:
 *         description: Button message sent
 *
 * /api/v1/messages/list:
 *   post:
 *     summary: Send list message
 *     tags: [Messages]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - session_id
 *               - recipient
 *               - title
 *               - buttonText
 *               - sections
 *             properties:
 *               session_id:
 *                 type: string
 *               recipient:
 *                 type: string
 *               title:
 *                 type: string
 *               text:
 *                 type: string
 *               buttonText:
 *                 type: string
 *               sections:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     title:
 *                       type: string
 *                     rows:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           title:
 *                             type: string
 *                           description:
 *                             type: string
 *     responses:
 *       200:
 *         description: List message sent
 *
 * /api/v1/messages/reaction:
 *   post:
 *     summary: Send reaction to a message
 *     tags: [Messages]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - session_id
 *               - recipient
 *               - message_id
 *               - emoji
 *             properties:
 *               session_id:
 *                 type: string
 *               recipient:
 *                 type: string
 *               message_id:
 *                 type: string
 *               emoji:
 *                 type: string
 *                 example: "👍"
 *     responses:
 *       200:
 *         description: Reaction sent
 *
 * /api/v1/messages/reply:
 *   post:
 *     summary: Reply to a message
 *     tags: [Messages]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - session_id
 *               - recipient
 *               - message_id
 *               - message
 *             properties:
 *               session_id:
 *                 type: string
 *               recipient:
 *                 type: string
 *               message_id:
 *                 type: string
 *                 description: ID of message to reply to
 *               message:
 *                 type: string
 *     responses:
 *       200:
 *         description: Reply sent
 *
 * /api/v1/messages/forward:
 *   post:
 *     summary: Forward a message
 *     tags: [Messages]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - session_id
 *               - from_chat
 *               - to_chat
 *               - message_id
 *             properties:
 *               session_id:
 *                 type: string
 *               from_chat:
 *                 type: string
 *               to_chat:
 *                 type: string
 *               message_id:
 *                 type: string
 *     responses:
 *       200:
 *         description: Message forwarded
 *
 * /api/v1/messages/{messageId}:
 *   delete:
 *     summary: Delete a message
 *     tags: [Messages]
 *     parameters:
 *       - in: path
 *         name: messageId
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
 *               - session_id
 *               - chat_id
 *             properties:
 *               session_id:
 *                 type: string
 *               chat_id:
 *                 type: string
 *               for_everyone:
 *                 type: boolean
 *                 default: true
 *     responses:
 *       200:
 *         description: Message deleted
 *
 * /api/v1/messages/history:
 *   get:
 *     summary: Get message history
 *     tags: [Messages]
 *     parameters:
 *       - in: query
 *         name: session_id
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: chat_id
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *     responses:
 *       200:
 *         description: Message history
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 messages:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Message'
 *
 * /api/v1/messages/media/{messageId}:
 *   get:
 *     summary: Download media from message
 *     tags: [Messages]
 *     parameters:
 *       - in: path
 *         name: messageId
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
 *         description: Media file
 *         content:
 *           application/octet-stream:
 *             schema:
 *               type: string
 *               format: binary
 */
