/**
 * @swagger
 * /api/v1/chat/list:
 *   get:
 *     summary: Get all chats
 *     tags: [Chat]
 *     parameters:
 *       - in: query
 *         name: session_id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of chats
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 chats:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       name:
 *                         type: string
 *                       isGroup:
 *                         type: boolean
 *                       unreadCount:
 *                         type: integer
 *                       lastMessage:
 *                         type: object
 *
 * /api/v1/chat/{chatId}:
 *   get:
 *     summary: Get chat details
 *     tags: [Chat]
 *     parameters:
 *       - in: path
 *         name: chatId
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
 *         description: Chat details
 *
 * /api/v1/chat/{chatId}/messages:
 *   get:
 *     summary: Get messages from chat
 *     tags: [Chat]
 *     parameters:
 *       - in: path
 *         name: chatId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: session_id
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *       - in: query
 *         name: before
 *         schema:
 *           type: string
 *         description: Message ID to fetch messages before
 *     responses:
 *       200:
 *         description: Chat messages
 *
 * /api/v1/chat/{chatId}/read:
 *   post:
 *     summary: Mark chat as read
 *     tags: [Chat]
 *     parameters:
 *       - in: path
 *         name: chatId
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
 *             properties:
 *               session_id:
 *                 type: string
 *     responses:
 *       200:
 *         description: Chat marked as read
 *
 * /api/v1/chat/{chatId}/archive:
 *   post:
 *     summary: Archive chat
 *     tags: [Chat]
 *     parameters:
 *       - in: path
 *         name: chatId
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
 *             properties:
 *               session_id:
 *                 type: string
 *     responses:
 *       200:
 *         description: Chat archived
 *
 * /api/v1/chat/{chatId}/unarchive:
 *   post:
 *     summary: Unarchive chat
 *     tags: [Chat]
 *     parameters:
 *       - in: path
 *         name: chatId
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
 *             properties:
 *               session_id:
 *                 type: string
 *     responses:
 *       200:
 *         description: Chat unarchived
 *
 * /api/v1/chat/{chatId}/pin:
 *   post:
 *     summary: Pin chat
 *     tags: [Chat]
 *     parameters:
 *       - in: path
 *         name: chatId
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
 *             properties:
 *               session_id:
 *                 type: string
 *     responses:
 *       200:
 *         description: Chat pinned
 *
 * /api/v1/chat/{chatId}/unpin:
 *   post:
 *     summary: Unpin chat
 *     tags: [Chat]
 *     parameters:
 *       - in: path
 *         name: chatId
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
 *             properties:
 *               session_id:
 *                 type: string
 *     responses:
 *       200:
 *         description: Chat unpinned
 *
 * /api/v1/chat/{chatId}/mute:
 *   post:
 *     summary: Mute chat
 *     tags: [Chat]
 *     parameters:
 *       - in: path
 *         name: chatId
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
 *             properties:
 *               session_id:
 *                 type: string
 *               duration:
 *                 type: integer
 *                 description: Duration in seconds (0 for forever)
 *     responses:
 *       200:
 *         description: Chat muted
 *
 * /api/v1/chat/{chatId}/unmute:
 *   post:
 *     summary: Unmute chat
 *     tags: [Chat]
 *     parameters:
 *       - in: path
 *         name: chatId
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
 *             properties:
 *               session_id:
 *                 type: string
 *     responses:
 *       200:
 *         description: Chat unmuted
 *
 * /api/v1/chat/{chatId}/clear:
 *   delete:
 *     summary: Clear chat messages
 *     tags: [Chat]
 *     parameters:
 *       - in: path
 *         name: chatId
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
 *         description: Chat cleared
 */
