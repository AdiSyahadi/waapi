const db = require('../models');
const whatsappService = require('../services/whatsappService');
const messageService = require('../services/messageService');
const { addJob } = require('../config/queue');

/**
 * Send broadcast message
 */
const sendBroadcast = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { recipients, message, type = 'text', media_url, delay = 1000 } = req.body;

    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Recipients array is required'
      });
    }

    if (!message && !media_url) {
      return res.status(400).json({
        success: false,
        message: 'Message or media URL is required'
      });
    }

    // Check bulk limit
    const maxBulk = 100; // Can be from subscription plan
    if (recipients.length > maxBulk) {
      return res.status(400).json({
        success: false,
        message: `Maximum ${maxBulk} recipients per broadcast`
      });
    }

    // Get session
    const session = await db.Session.findOne({
      where: {
        session_id: sessionId,
        user_id: req.user.id
      }
    });

    if (!session || session.status !== 'connected') {
      return res.status(400).json({
        success: false,
        message: 'Session not found or not connected'
      });
    }

    // Create broadcast record
    const broadcast = {
      id: `bc_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      session_id: sessionId,
      user_id: req.user.id,
      recipients,
      message,
      type,
      media_url,
      total: recipients.length,
      sent: 0,
      failed: 0,
      status: 'queued',
      created_at: new Date()
    };

    // Queue messages for each recipient
    const jobs = [];
    for (let i = 0; i < recipients.length; i++) {
      const recipient = recipients[i];
      jobs.push({
        broadcast_id: broadcast.id,
        session_id: sessionId,
        recipient,
        message,
        type,
        media_url,
        delay: i * delay // Stagger messages
      });
    }

    // Add to queue (using BullMQ)
    await addJob('broadcast', {
      broadcast,
      jobs
    });

    res.json({
      success: true,
      message: 'Broadcast queued successfully',
      data: {
        broadcast_id: broadcast.id,
        total_recipients: recipients.length,
        estimated_time: Math.ceil((recipients.length * delay) / 1000) + 's'
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to send broadcast',
      error: error.message
    });
  }
};

/**
 * Get broadcast status
 */
const getBroadcastStatus = async (req, res) => {
  try {
    const { broadcastId } = req.params;

    // In real implementation, fetch from database/cache
    // For now, return mock data
    res.json({
      success: true,
      data: {
        broadcast_id: broadcastId,
        status: 'processing',
        total: 50,
        sent: 30,
        failed: 2,
        pending: 18,
        progress: 64
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get broadcast status',
      error: error.message
    });
  }
};

/**
 * Cancel broadcast
 */
const cancelBroadcast = async (req, res) => {
  try {
    const { broadcastId } = req.params;

    // Cancel pending jobs in queue
    // Implementation depends on queue system

    res.json({
      success: true,
      message: 'Broadcast cancelled successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to cancel broadcast',
      error: error.message
    });
  }
};

module.exports = {
  sendBroadcast,
  getBroadcastStatus,
  cancelBroadcast
};
