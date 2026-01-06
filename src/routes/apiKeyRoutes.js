const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { ApiKey } = require('../models');
const crypto = require('crypto');

/**
 * @swagger
 * /api/v1/api-keys:
 *   get:
 *     tags:
 *       - API Keys
 *     summary: Get all API keys for current user
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of API keys
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const apiKeys = await ApiKey.findAll({
      where: { user_id: req.user.id },
      attributes: ['id', 'name', 'last_used_at', 'expires_at', 'status', 'created_at'],
      order: [['created_at', 'DESC']]
    });

    // Add key prefix for display (first 12 chars of key)
    const formattedKeys = apiKeys.map(key => ({
      ...key.toJSON(),
      key_prefix: key.key ? key.key.substring(0, 12) + '...' : null
    }));

    res.json({
      success: true,
      data: formattedKeys
    });
  } catch (error) {
    console.error('Get API keys error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get API keys',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/v1/api-keys:
 *   post:
 *     tags:
 *       - API Keys
 *     summary: Create new API key
 *     security:
 *       - bearerAuth: []
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
 *               expires_in_days:
 *                 type: integer
 *     responses:
 *       201:
 *         description: API key created successfully
 */
router.post('/', authenticate, async (req, res) => {
  try {
    const { name, expires_in_days } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Name is required'
      });
    }

    // Generate API key and secret
    const apiKey = `wapi_${crypto.randomBytes(32).toString('hex')}`;
    const apiSecret = crypto.randomBytes(32).toString('hex');

    // Calculate expiration date
    let expiresAt = null;
    if (expires_in_days) {
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + parseInt(expires_in_days));
    }

    // Create API key record
    const newKey = await ApiKey.create({
      user_id: req.user.id,
      name,
      key: apiKey,
      secret: apiSecret,
      expires_at: expiresAt,
      status: 'active'
    });

    res.status(201).json({
      success: true,
      data: {
        id: newKey.id,
        name: newKey.name,
        key: apiKey, // Only shown once!
        secret: apiSecret, // Only shown once!
        key_prefix: apiKey.substring(0, 12) + '...',
        expires_at: expiresAt,
        created_at: newKey.created_at
      },
      message: 'API key created successfully. Make sure to copy it now as it won\'t be shown again!'
    });
  } catch (error) {
    console.error('Create API key error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create API key',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/v1/api-keys/{id}:
 *   delete:
 *     tags:
 *       - API Keys
 *     summary: Delete API key
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: API key deleted successfully
 */
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    const apiKey = await ApiKey.findOne({
      where: {
        id,
        user_id: req.user.id
      }
    });

    if (!apiKey) {
      return res.status(404).json({
        success: false,
        message: 'API key not found'
      });
    }

    await apiKey.destroy();

    res.json({
      success: true,
      message: 'API key deleted successfully'
    });
  } catch (error) {
    console.error('Delete API key error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete API key',
      error: error.message
    });
  }
});

module.exports = router;
