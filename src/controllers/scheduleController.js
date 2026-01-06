const db = require('../models');
const schedulerService = require('../services/schedulerService');
const whatsappService = require('../services/whatsappService');

/**
 * Schedule a message
 */
const scheduleMessage = async (req, res) => {
  try {
    const { 
      session_id, 
      recipient, 
      message_type = 'text',
      content, 
      media_url,
      caption,
      scheduled_at,
      metadata
    } = req.body;

    // Validation
    if (!session_id || !recipient || !content || !scheduled_at) {
      return res.status(400).json({
        success: false,
        message: 'Session ID, recipient, content, and scheduled_at are required'
      });
    }

    // Verify session
    const session = await db.Session.findOne({
      where: {
        session_id,
        user_id: req.user.id
      }
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    // Validate scheduled time (must be in future)
    const scheduledTime = new Date(scheduled_at);
    if (scheduledTime <= new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Scheduled time must be in the future'
      });
    }

    // Schedule the message
    const scheduledMessage = await schedulerService.scheduleMessage({
      user_id: req.user.id,
      session_id,
      recipient,
      message_type,
      content,
      media_url,
      caption,
      scheduled_at,
      metadata
    });

    res.status(201).json({
      success: true,
      message: 'Message scheduled successfully',
      scheduled_message: {
        id: scheduledMessage.id,
        recipient,
        message_type,
        scheduled_at: scheduledMessage.scheduled_at,
        status: scheduledMessage.status
      }
    });
  } catch (error) {
    console.error('Schedule message error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to schedule message',
      error: error.message
    });
  }
};

/**
 * Get scheduled messages
 */
const getScheduledMessages = async (req, res) => {
  try {
    const { session_id, status, limit = 100, offset = 0 } = req.query;

    const messages = await schedulerService.getScheduledMessages(req.user.id, {
      session_id,
      status,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      success: true,
      count: messages.length,
      scheduled_messages: messages.map(m => ({
        id: m.id,
        session_id: m.session_id,
        recipient: m.recipient,
        message_type: m.message_type,
        content: m.content.substring(0, 100) + (m.content.length > 100 ? '...' : ''),
        scheduled_at: m.scheduled_at,
        status: m.status,
        sent_at: m.sent_at,
        retry_count: m.retry_count,
        error: m.error
      }))
    });
  } catch (error) {
    console.error('Get scheduled messages error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get scheduled messages',
      error: error.message
    });
  }
};

/**
 * Get single scheduled message
 */
const getScheduledMessage = async (req, res) => {
  try {
    const { id } = req.params;

    const message = await db.ScheduledMessage.findOne({
      where: {
        id,
        user_id: req.user.id
      }
    });

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Scheduled message not found'
      });
    }

    res.json({
      success: true,
      scheduled_message: message
    });
  } catch (error) {
    console.error('Get scheduled message error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get scheduled message',
      error: error.message
    });
  }
};

/**
 * Cancel scheduled message
 */
const cancelScheduledMessage = async (req, res) => {
  try {
    const { id } = req.params;

    const message = await schedulerService.cancelMessage(id, req.user.id);

    res.json({
      success: true,
      message: 'Scheduled message cancelled',
      scheduled_message: {
        id: message.id,
        status: message.status
      }
    });
  } catch (error) {
    console.error('Cancel scheduled message error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to cancel scheduled message'
    });
  }
};

/**
 * Update scheduled message
 */
const updateScheduledMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const { content, scheduled_at, caption, media_url } = req.body;

    const message = await db.ScheduledMessage.findOne({
      where: {
        id,
        user_id: req.user.id,
        status: 'pending'
      }
    });

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Scheduled message not found or already processed'
      });
    }

    // Validate scheduled time if provided
    if (scheduled_at) {
      const scheduledTime = new Date(scheduled_at);
      if (scheduledTime <= new Date()) {
        return res.status(400).json({
          success: false,
          message: 'Scheduled time must be in the future'
        });
      }
    }

    const updateData = {};
    if (content !== undefined) updateData.content = content;
    if (scheduled_at !== undefined) updateData.scheduled_at = new Date(scheduled_at);
    if (caption !== undefined) updateData.caption = caption;
    if (media_url !== undefined) updateData.media_url = media_url;

    await message.update(updateData);

    res.json({
      success: true,
      message: 'Scheduled message updated',
      scheduled_message: message
    });
  } catch (error) {
    console.error('Update scheduled message error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update scheduled message',
      error: error.message
    });
  }
};

/**
 * Bulk schedule messages
 */
const bulkScheduleMessages = async (req, res) => {
  try {
    const { session_id, messages } = req.body;

    if (!session_id || !messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Session ID and messages array are required'
      });
    }

    if (messages.length > 100) {
      return res.status(400).json({
        success: false,
        message: 'Maximum 100 messages per bulk request'
      });
    }

    // Verify session
    const session = await db.Session.findOne({
      where: {
        session_id,
        user_id: req.user.id
      }
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    const results = [];
    const errors = [];

    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      try {
        // Validate scheduled time
        const scheduledTime = new Date(msg.scheduled_at);
        if (scheduledTime <= new Date()) {
          errors.push({ index: i, error: 'Scheduled time must be in the future' });
          continue;
        }

        const scheduledMessage = await schedulerService.scheduleMessage({
          user_id: req.user.id,
          session_id,
          recipient: msg.recipient,
          message_type: msg.message_type || 'text',
          content: msg.content,
          media_url: msg.media_url,
          caption: msg.caption,
          scheduled_at: msg.scheduled_at,
          metadata: msg.metadata
        });

        results.push({
          index: i,
          id: scheduledMessage.id,
          recipient: msg.recipient,
          scheduled_at: scheduledMessage.scheduled_at
        });
      } catch (error) {
        errors.push({ index: i, error: error.message });
      }
    }

    res.status(201).json({
      success: true,
      message: `${results.length} messages scheduled, ${errors.length} failed`,
      scheduled: results,
      failed: errors
    });
  } catch (error) {
    console.error('Bulk schedule messages error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to bulk schedule messages',
      error: error.message
    });
  }
};

/**
 * Send bulk messages immediately
 */
const sendBulkMessages = async (req, res) => {
  try {
    const { session_id, recipients, message_type = 'text', content, media_url, caption, delay = 1000 } = req.body;

    if (!session_id || !recipients || !Array.isArray(recipients) || recipients.length === 0 || !content) {
      return res.status(400).json({
        success: false,
        message: 'Session ID, recipients array, and content are required'
      });
    }

    if (recipients.length > 100) {
      return res.status(400).json({
        success: false,
        message: 'Maximum 100 recipients per bulk request'
      });
    }

    // Verify session
    const session = await db.Session.findOne({
      where: {
        session_id,
        user_id: req.user.id
      }
    });

    if (!session || session.status !== 'connected') {
      return res.status(400).json({
        success: false,
        message: 'Session not found or not connected'
      });
    }

    const sock = whatsappService.getSession(session_id);
    if (!sock) {
      return res.status(400).json({
        success: false,
        message: 'WhatsApp session not active'
      });
    }

    // Process in background and return immediately
    const jobId = `bulk_${Date.now()}_${req.user.id}`;
    
    // Start processing
    processBulkSend(sock, recipients, message_type, content, media_url, caption, delay, jobId);

    res.status(202).json({
      success: true,
      message: 'Bulk send initiated',
      job_id: jobId,
      total_recipients: recipients.length,
      estimated_time: `${Math.ceil((recipients.length * delay) / 1000)} seconds`
    });
  } catch (error) {
    console.error('Send bulk messages error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send bulk messages',
      error: error.message
    });
  }
};

/**
 * Process bulk send in background
 */
async function processBulkSend(sock, recipients, messageType, content, mediaUrl, caption, delay, jobId) {
  const results = { sent: 0, failed: 0, errors: [] };

  for (let i = 0; i < recipients.length; i++) {
    const recipient = recipients[i];
    try {
      const jid = recipient.includes('@') ? recipient : `${recipient}@s.whatsapp.net`;

      let messageContent;
      switch (messageType) {
        case 'text':
          messageContent = { text: content };
          break;
        case 'image':
          messageContent = { image: { url: mediaUrl }, caption: caption || '' };
          break;
        case 'video':
          messageContent = { video: { url: mediaUrl }, caption: caption || '' };
          break;
        case 'document':
          messageContent = { document: { url: mediaUrl }, fileName: caption || 'document' };
          break;
        default:
          messageContent = { text: content };
      }

      await sock.socket.sendMessage(jid, messageContent);
      results.sent++;

      // Delay between messages
      if (i < recipients.length - 1 && delay > 0) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    } catch (error) {
      results.failed++;
      results.errors.push({ recipient, error: error.message });
    }
  }

  console.log(`Bulk send ${jobId} completed:`, results);
}

module.exports = {
  scheduleMessage,
  getScheduledMessages,
  getScheduledMessage,
  cancelScheduledMessage,
  updateScheduledMessage,
  bulkScheduleMessages,
  sendBulkMessages
};
