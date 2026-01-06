/**
 * @swagger
 * /api/v1/sessions:
 *   get:
 *     summary: List all sessions
 *     tags: [Sessions]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [initializing, qr_ready, connecting, connected, disconnected]
 *         description: Filter by status
 *     responses:
 *       200:
 *         description: List of sessions
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 sessions:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Session'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *
 *   post:
 *     summary: Create a new WhatsApp session
 *     tags: [Sessions]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 example: My WhatsApp
 *               use_pairing:
 *                 type: boolean
 *                 default: false
 *                 description: Use pairing code instead of QR
 *               phone_number:
 *                 type: string
 *                 description: Required if use_pairing is true
 *                 example: "6281234567890"
 *     responses:
 *       201:
 *         description: Session created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 session:
 *                   $ref: '#/components/schemas/Session'
 *                 qr_code:
 *                   type: string
 *                   description: Base64 QR code image
 *                 pairing_code:
 *                   type: string
 *                   description: 8-digit pairing code
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *
 * /api/v1/sessions/{sessionId}:
 *   get:
 *     summary: Get session details
 *     tags: [Sessions]
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Session details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 session:
 *                   $ref: '#/components/schemas/Session'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *
 *   delete:
 *     summary: Delete a session
 *     tags: [Sessions]
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Session deleted
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *
 * /api/v1/sessions/{sessionId}/qr:
 *   get:
 *     summary: Get QR code for session
 *     tags: [Sessions]
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: QR code
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 qr_code:
 *                   type: string
 *                   description: Base64 encoded QR code image
 *       404:
 *         description: Session not found or QR not available
 *
 * /api/v1/sessions/{sessionId}/status:
 *   get:
 *     summary: Get session connection status
 *     tags: [Sessions]
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Session status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 status:
 *                   type: string
 *                   enum: [initializing, qr_ready, connecting, connected, disconnected]
 *                 connected_at:
 *                   type: string
 *                   format: date-time
 *                 phone_number:
 *                   type: string
 *
 * /api/v1/sessions/{sessionId}/logout:
 *   post:
 *     summary: Logout from WhatsApp
 *     tags: [Sessions]
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Logged out successfully
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *
 * /api/v1/sessions/{sessionId}/restart:
 *   post:
 *     summary: Restart session connection
 *     tags: [Sessions]
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Session restarted
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
