/**
 * @swagger
 * /api/v1/groups/create:
 *   post:
 *     summary: Create a new group
 *     tags: [Groups]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - session_id
 *               - name
 *               - participants
 *             properties:
 *               session_id:
 *                 type: string
 *               name:
 *                 type: string
 *                 example: My Group
 *               participants:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["6281234567890", "6281234567891"]
 *     responses:
 *       201:
 *         description: Group created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 group:
 *                   $ref: '#/components/schemas/Group'
 *
 * /api/v1/groups/list:
 *   get:
 *     summary: List all groups
 *     tags: [Groups]
 *     parameters:
 *       - in: query
 *         name: session_id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of groups
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 groups:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Group'
 *
 * /api/v1/groups/info:
 *   get:
 *     summary: Get group info
 *     tags: [Groups]
 *     parameters:
 *       - in: query
 *         name: session_id
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: group_id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Group info
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 group:
 *                   $ref: '#/components/schemas/Group'
 *
 * /api/v1/groups/update-name:
 *   put:
 *     summary: Update group name
 *     tags: [Groups]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - session_id
 *               - group_id
 *               - name
 *             properties:
 *               session_id:
 *                 type: string
 *               group_id:
 *                 type: string
 *               name:
 *                 type: string
 *     responses:
 *       200:
 *         description: Group name updated
 *
 * /api/v1/groups/update-description:
 *   put:
 *     summary: Update group description
 *     tags: [Groups]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - session_id
 *               - group_id
 *               - description
 *             properties:
 *               session_id:
 *                 type: string
 *               group_id:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: Group description updated
 *
 * /api/v1/groups/update-picture:
 *   put:
 *     summary: Update group picture
 *     tags: [Groups]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - session_id
 *               - group_id
 *               - image
 *             properties:
 *               session_id:
 *                 type: string
 *               group_id:
 *                 type: string
 *               image:
 *                 type: string
 *                 description: URL or base64 encoded image
 *     responses:
 *       200:
 *         description: Group picture updated
 *
 * /api/v1/groups/participants/add:
 *   post:
 *     summary: Add participants to group
 *     tags: [Groups]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - session_id
 *               - group_id
 *               - participants
 *             properties:
 *               session_id:
 *                 type: string
 *               group_id:
 *                 type: string
 *               participants:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Participants added
 *
 * /api/v1/groups/participants/remove:
 *   post:
 *     summary: Remove participants from group
 *     tags: [Groups]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - session_id
 *               - group_id
 *               - participants
 *             properties:
 *               session_id:
 *                 type: string
 *               group_id:
 *                 type: string
 *               participants:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Participants removed
 *
 * /api/v1/groups/participants/promote:
 *   post:
 *     summary: Promote participants to admin
 *     tags: [Groups]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - session_id
 *               - group_id
 *               - participants
 *             properties:
 *               session_id:
 *                 type: string
 *               group_id:
 *                 type: string
 *               participants:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Participants promoted
 *
 * /api/v1/groups/participants/demote:
 *   post:
 *     summary: Demote admins to regular participants
 *     tags: [Groups]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - session_id
 *               - group_id
 *               - participants
 *             properties:
 *               session_id:
 *                 type: string
 *               group_id:
 *                 type: string
 *               participants:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Admins demoted
 *
 * /api/v1/groups/leave:
 *   post:
 *     summary: Leave a group
 *     tags: [Groups]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - session_id
 *               - group_id
 *             properties:
 *               session_id:
 *                 type: string
 *               group_id:
 *                 type: string
 *     responses:
 *       200:
 *         description: Left group successfully
 *
 * /api/v1/groups/invite:
 *   get:
 *     summary: Get group invite link
 *     tags: [Groups]
 *     parameters:
 *       - in: query
 *         name: session_id
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: group_id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Invite link
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 invite_link:
 *                   type: string
 *
 * /api/v1/groups/invite/revoke:
 *   post:
 *     summary: Revoke group invite link
 *     tags: [Groups]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - session_id
 *               - group_id
 *             properties:
 *               session_id:
 *                 type: string
 *               group_id:
 *                 type: string
 *     responses:
 *       200:
 *         description: Invite link revoked
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 new_invite_link:
 *                   type: string
 */
