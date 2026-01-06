/**
 * @swagger
 * /api/v1/contacts/list:
 *   get:
 *     summary: Get all contacts
 *     tags: [Contacts]
 *     parameters:
 *       - in: query
 *         name: session_id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of contacts
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 contacts:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Contact'
 *
 * /api/v1/contacts/check:
 *   post:
 *     summary: Check if numbers are registered on WhatsApp
 *     tags: [Contacts]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - session_id
 *               - numbers
 *             properties:
 *               session_id:
 *                 type: string
 *               numbers:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["6281234567890", "6281234567891"]
 *     responses:
 *       200:
 *         description: Registration status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 results:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       number:
 *                         type: string
 *                       exists:
 *                         type: boolean
 *                       jid:
 *                         type: string
 *
 * /api/v1/contacts/info:
 *   get:
 *     summary: Get contact info
 *     tags: [Contacts]
 *     parameters:
 *       - in: query
 *         name: session_id
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: number
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Contact info
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 contact:
 *                   $ref: '#/components/schemas/Contact'
 *
 * /api/v1/contacts/profile-picture:
 *   get:
 *     summary: Get contact profile picture
 *     tags: [Contacts]
 *     parameters:
 *       - in: query
 *         name: session_id
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: number
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Profile picture URL
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 url:
 *                   type: string
 *                   format: uri
 *
 * /api/v1/contacts/status:
 *   get:
 *     summary: Get contact status/about
 *     tags: [Contacts]
 *     parameters:
 *       - in: query
 *         name: session_id
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: number
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Contact status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 status:
 *                   type: string
 *
 * /api/v1/contacts/block:
 *   post:
 *     summary: Block a contact
 *     tags: [Contacts]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - session_id
 *               - number
 *             properties:
 *               session_id:
 *                 type: string
 *               number:
 *                 type: string
 *     responses:
 *       200:
 *         description: Contact blocked
 *
 * /api/v1/contacts/unblock:
 *   post:
 *     summary: Unblock a contact
 *     tags: [Contacts]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - session_id
 *               - number
 *             properties:
 *               session_id:
 *                 type: string
 *               number:
 *                 type: string
 *     responses:
 *       200:
 *         description: Contact unblocked
 *
 * /api/v1/contacts/blocked:
 *   get:
 *     summary: Get list of blocked contacts
 *     tags: [Contacts]
 *     parameters:
 *       - in: query
 *         name: session_id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Blocked contacts list
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 blocked:
 *                   type: array
 *                   items:
 *                     type: string
 */
