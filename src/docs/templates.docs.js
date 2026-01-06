/**
 * @swagger
 * /api/v1/templates:
 *   get:
 *     summary: List all templates
 *     tags: [Templates]
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *       - in: query
 *         name: is_active
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: List of templates
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 templates:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Template'
 *
 *   post:
 *     summary: Create a new template
 *     tags: [Templates]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - content
 *             properties:
 *               name:
 *                 type: string
 *                 example: welcome_message
 *               content:
 *                 type: string
 *                 example: "Hello {{name}}, welcome to our service!"
 *               variables:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["name"]
 *               category:
 *                 type: string
 *                 example: greeting
 *     responses:
 *       201:
 *         description: Template created
 *
 * /api/v1/templates/{id}:
 *   get:
 *     summary: Get template by ID
 *     tags: [Templates]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Template details
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *
 *   put:
 *     summary: Update template
 *     tags: [Templates]
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
 *               name:
 *                 type: string
 *               content:
 *                 type: string
 *               variables:
 *                 type: array
 *                 items:
 *                   type: string
 *               category:
 *                 type: string
 *               is_active:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Template updated
 *
 *   delete:
 *     summary: Delete template
 *     tags: [Templates]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Template deleted
 *
 * /api/v1/templates/{id}/send:
 *   post:
 *     summary: Send message using template
 *     tags: [Templates]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - session_id
 *               - recipient
 *             properties:
 *               session_id:
 *                 type: string
 *               recipient:
 *                 type: string
 *               variables:
 *                 type: object
 *                 example:
 *                   name: John
 *     responses:
 *       200:
 *         description: Message sent using template
 *
 * /api/v1/broadcast:
 *   post:
 *     summary: Send broadcast message
 *     tags: [Broadcast]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - session_id
 *               - recipients
 *               - message
 *             properties:
 *               session_id:
 *                 type: string
 *               recipients:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["6281234567890", "6281234567891"]
 *               message:
 *                 type: string
 *               delay:
 *                 type: integer
 *                 description: Delay between messages in ms
 *                 default: 1000
 *     responses:
 *       200:
 *         description: Broadcast initiated
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
 *
 * /api/v1/broadcast/template:
 *   post:
 *     summary: Send broadcast using template
 *     tags: [Broadcast]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - session_id
 *               - template_id
 *               - recipients
 *             properties:
 *               session_id:
 *                 type: string
 *               template_id:
 *                 type: integer
 *               recipients:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     phone:
 *                       type: string
 *                     variables:
 *                       type: object
 *               delay:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Template broadcast initiated
 *
 * /api/v1/broadcast/status/{broadcastId}:
 *   get:
 *     summary: Get broadcast status
 *     tags: [Broadcast]
 *     parameters:
 *       - in: path
 *         name: broadcastId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Broadcast status
 */
