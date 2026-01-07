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
 * /api/v1/messages/{sessionId}/send/media:
 *   post:
 *     summary: Send media message (image, video, audio, or document)
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
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - phone
 *               - file
 *               - type
 *             properties:
 *               phone:
 *                 type: string
 *                 description: Phone number with country code (no + or spaces)
 *                 example: "6281234567890"
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: Media file to send (image, video, audio, or document)
 *               type:
 *                 type: string
 *                 enum: [image, video, audio, document]
 *                 description: Type of media file
 *                 example: "image"
 *               caption:
 *                 type: string
 *                 description: Optional caption for the media (for image/video)
 *     responses:
 *       200:
 *         description: Media sent successfully
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
 *                   example: Media sent successfully
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



 *
 * /api/v1/messages/{sessionId}/send/location:
 *   post:
 *     summary: Send location
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
 *               - latitude
 *               - longitude
 *             properties:
 *               phone:
 *                 type: string
 *                 description: Phone number with country code
 *                 example: "6281234567890"
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
 *         description: Location sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *
 * /api/v1/messages/{sessionId}/send/contact:
 *   post:
 *     summary: Send contact card
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
 *               - contacts
 *             properties:
 *               phone:
 *                 type: string
 *                 description: Phone number with country code
 *                 example: "6281234567890"
 *               contacts:
 *                 type: array
 *                 description: Array of contacts to send
 *                 items:
 *                   type: object
 *                   properties:
 *                     fullName:
 *                       type: string
 *                     phoneNumber:
 *                       type: string
 *                     organization:
 *                       type: string
 *     responses:
 *       200:
 *         description: Contact sent successfully
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'

 *
 * /api/v1/messages/{sessionId}/send/button:
 *   post:
 *     summary: Send message with buttons
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
 *               - text
 *               - buttons
 *             properties:
 *               phone:
 *                 type: string
 *                 description: Phone number with country code
 *                 example: "6281234567890"
 *               text:
 *                 type: string
 *                 description: Message text
 *               footer:
 *                 type: string
 *                 description: Optional footer text
 *               buttons:
 *                 type: array
 *                 minItems: 1
 *                 maxItems: 3
 *                 description: Array of buttons (1-3 items)
 *                 items:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     text:
 *                       type: string
 *     responses:
 *       200:
 *         description: Button message sent successfully
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *
 * /api/v1/messages/{sessionId}/send/list:
 *   post:
 *     summary: Send list message
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
 *               - text
 *               - button_text
 *               - sections
 *             properties:
 *               phone:
 *                 type: string
 *                 description: Phone number with country code
 *                 example: "6281234567890"
 *               text:
 *                 type: string
 *                 description: Message text
 *               button_text:
 *                 type: string
 *                 description: Button text to show list
 *               sections:
 *                 type: array
 *                 minItems: 1
 *                 description: Array of list sections
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
 *         description: List message sent successfully
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *
 * /api/v1/messages/{sessionId}/react:
 *   post:
 *     summary: React to a message
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
 *               - message_id
 *               - emoji
 *             properties:
 *               message_id:
 *                 type: string
 *                 description: ID of message to react to
 *               emoji:
 *                 type: string
 *                 description: Emoji to react with
 *                 example: "👍"
 *     responses:
 *       200:
 *         description: Reaction sent successfully
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *
 * /api/v1/messages/{sessionId}/reply:
 *   post:
 *     summary: Reply to a message
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
 *               - message_id
 *               - message
 *             properties:
 *               message_id:
 *                 type: string
 *                 description: ID of message to reply to
 *               message:
 *                 type: string
 *                 description: Reply message text
 *     responses:
 *       200:
 *         description: Reply sent successfully
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *
 * /api/v1/messages/{sessionId}/forward:
 *   post:
 *     summary: Forward a message
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
 *               - message_id
 *               - recipients
 *             properties:
 *               message_id:
 *                 type: string
 *                 description: ID of message to forward
 *               recipients:
 *                 type: array
 *                 minItems: 1
 *                 description: Array of recipient phone numbers
 *                 items:
 *                   type: string
 *                   example: "6281234567890"
 *     responses:
 *       200:
 *         description: Message forwarded successfully
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *
 * /api/v1/messages/{sessionId}/message/{messageId}:
 *   delete:
 *     summary: Delete a message
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
 *       - in: path
 *         name: messageId
 *         required: true
 *         schema:
 *           type: string
 *         description: Message ID to delete
 *     responses:
 *       200:
 *         description: Message deleted successfully
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         description: Message not found
 *
 * /api/v1/messages/{sessionId}/messages:
 *   get:
 *     summary: Get message history
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
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Number of messages to retrieve
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Pagination offset
 *     responses:
 *       200:
 *         description: Message history retrieved successfully
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
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         description: Session not found
 *
 * /api/v1/messages/{sessionId}/send/poll:
 *   post:
 *     summary: Send poll message
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
 *               - name
 *               - options
 *             properties:
 *               phone:
 *                 type: string
 *                 description: Phone number with country code
 *                 example: "6281234567890"
 *               name:
 *                 type: string
 *                 description: Poll question
 *                 example: "What's your favorite color?"
 *               options:
 *                 type: array
 *                 minItems: 2
 *                 maxItems: 12
 *                 description: Array of poll options (2-12 items)
 *                 items:
 *                   type: string
 *                   example: "Red"
 *     responses:
 *       200:
 *         description: Poll sent successfully
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *
 * /api/v1/messages/{sessionId}/message/{messageId}:
 *   put:
 *     summary: Edit a message
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
 *       - in: path
 *         name: messageId
 *         required: true
 *         schema:
 *           type: string
 *         description: Message ID to edit
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - new_text
 *             properties:
 *               new_text:
 *                 type: string
 *                 description: New message text
 *     responses:
 *       200:
 *         description: Message edited successfully
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         description: Message not found
 *
 * /api/v1/messages/{sessionId}/check-number:
 *   get:
 *     summary: Check if a phone number is registered on WhatsApp
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
 *       - in: query
 *         name: phone
 *         required: true
 *         schema:
 *           type: string
 *         description: Phone number with country code
 *         example: "6281234567890"
 *     responses:
 *       200:
 *         description: Number check result
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 exists:
 *                   type: boolean
 *                 jid:
 *                   type: string
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         description: Session not found
 */
