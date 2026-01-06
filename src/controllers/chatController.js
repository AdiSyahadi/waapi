const db = require('../models');
const whatsappService = require('../services/whatsappService');
const messageService = require('../services/messageService');
const path = require('path');
const fs = require('fs');

/**
 * Get chat list
 */
const getChatList = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { filter = 'all' } = req.query;

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

    const sock = whatsappService.getSession(sessionId);
    if (!sock) {
      return res.status(400).json({
        success: false,
        message: 'Session socket not found'
      });
    }

    const chats = await sock.groupFetchAllParticipating();
    
    res.json({
      success: true,
      data: {
        chats: Object.values(chats).map(chat => ({
          id: chat.id,
          name: chat.subject || chat.name,
          unreadCount: chat.unreadCount || 0,
          timestamp: chat.conversationTimestamp
        }))
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get chat list',
      error: error.message
    });
  }
};

/**
 * Get chat history
 */
const getChatHistory = async (req, res) => {
  try {
    const { sessionId, jid } = req.params;
    const { limit = 50, before } = req.query;

    const session = await db.Session.findOne({
      where: {
        session_id: sessionId,
        user_id: req.user.id
      }
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    const where = {
      session_id: session.id,
      remote_jid: jid
    };

    if (before) {
      where.timestamp = { [db.Sequelize.Op.lt]: parseInt(before) };
    }

    const messages = await db.Message.findAll({
      where,
      limit: parseInt(limit),
      order: [['timestamp', 'DESC']]
    });

    res.json({
      success: true,
      data: {
        messages,
        count: messages.length,
        jid
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get chat history',
      error: error.message
    });
  }
};

/**
 * Search messages
 */
const searchMessages = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { query, jid, type, from_date, to_date, limit = 50 } = req.query;

    if (!query) {
      return res.status(400).json({
        success: false,
        message: 'Query is required'
      });
    }

    const session = await db.Session.findOne({
      where: {
        session_id: sessionId,
        user_id: req.user.id
      }
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    const where = {
      session_id: session.id,
      content: { [db.Sequelize.Op.like]: `%${query}%` }
    };

    if (jid) {
      where.remote_jid = jid;
    }

    if (type) {
      where.type = type;
    }

    if (from_date) {
      where.timestamp = { [db.Sequelize.Op.gte]: new Date(from_date).getTime() };
    }

    if (to_date) {
      where.timestamp = {
        ...where.timestamp,
        [db.Sequelize.Op.lte]: new Date(to_date).getTime()
      };
    }

    const messages = await db.Message.findAll({
      where,
      limit: parseInt(limit),
      order: [['timestamp', 'DESC']]
    });

    res.json({
      success: true,
      data: {
        query,
        results: messages,
        count: messages.length
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to search messages',
      error: error.message
    });
  }
};

/**
 * Mark messages as read
 */
const markAsRead = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { jid, message_ids } = req.body;

    if (!jid) {
      return res.status(400).json({
        success: false,
        message: 'JID is required'
      });
    }

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

    const sock = whatsappService.getSession(sessionId);
    if (!sock) {
      return res.status(400).json({
        success: false,
        message: 'Session socket not found'
      });
    }

    if (message_ids && Array.isArray(message_ids)) {
      for (const msgId of message_ids) {
        await sock.readMessages([{
          remoteJid: jid,
          id: msgId
        }]);
      }
    } else {
      await sock.chatModify({ markRead: true }, jid);
    }

    res.json({
      success: true,
      message: 'Messages marked as read'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to mark as read',
      error: error.message
    });
  }
};

/**
 * Send presence
 */
const sendPresence = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { jid, type = 'available' } = req.body;

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

    const sock = whatsappService.getSession(sessionId);
    if (!sock) {
      return res.status(400).json({
        success: false,
        message: 'Session socket not found'
      });
    }

    await sock.sendPresenceUpdate(type, jid);

    res.json({
      success: true,
      message: `Presence ${type} sent successfully`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to send presence',
      error: error.message
    });
  }
};

/**
 * Archive/Unarchive chat
 */
const archiveChat = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { jid, archive = true } = req.body;

    if (!jid) {
      return res.status(400).json({
        success: false,
        message: 'JID is required'
      });
    }

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

    const sock = whatsappService.getSession(sessionId);
    if (!sock) {
      return res.status(400).json({
        success: false,
        message: 'Session socket not found'
      });
    }

    await sock.chatModify({ archive }, jid);

    res.json({
      success: true,
      message: archive ? 'Chat archived successfully' : 'Chat unarchived successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to modify chat',
      error: error.message
    });
  }
};

/**
 * Pin/Unpin chat
 */
const pinChat = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { jid, pin = true } = req.body;

    if (!jid) {
      return res.status(400).json({
        success: false,
        message: 'JID is required'
      });
    }

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

    const sock = whatsappService.getSession(sessionId);
    if (!sock) {
      return res.status(400).json({
        success: false,
        message: 'Session socket not found'
      });
    }

    await sock.chatModify({ pin }, jid);

    res.json({
      success: true,
      message: pin ? 'Chat pinned successfully' : 'Chat unpinned successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to modify chat',
      error: error.message
    });
  }
};

/**
 * Mute/Unmute chat
 */
const muteChat = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { jid, mute = true, duration = null } = req.body;

    if (!jid) {
      return res.status(400).json({
        success: false,
        message: 'JID is required'
      });
    }

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

    const sock = whatsappService.getSession(sessionId);
    if (!sock) {
      return res.status(400).json({
        success: false,
        message: 'Session socket not found'
      });
    }

    let muteUntil = null;
    if (mute && duration) {
      muteUntil = Date.now() + (duration * 1000);
    } else if (mute) {
      muteUntil = 8640000000000000;
    }

    await sock.chatModify({ mute: muteUntil }, jid);

    res.json({
      success: true,
      message: mute ? 'Chat muted successfully' : 'Chat unmuted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to modify chat',
      error: error.message
    });
  }
};

/**
 * Block/Unblock contact
 */
const blockContact = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { jid, block = true } = req.body;

    if (!jid) {
      return res.status(400).json({
        success: false,
        message: 'JID is required'
      });
    }

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

    const sock = whatsappService.getSession(sessionId);
    if (!sock) {
      return res.status(400).json({
        success: false,
        message: 'Session socket not found'
      });
    }

    await sock.updateBlockStatus(jid, block ? 'block' : 'unblock');

    res.json({
      success: true,
      message: block ? 'Contact blocked successfully' : 'Contact unblocked successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to block/unblock contact',
      error: error.message
    });
  }
};

/**
 * Download media
 */
const downloadMedia = async (req, res) => {
  try {
    const { sessionId, messageId } = req.params;

    const session = await db.Session.findOne({
      where: {
        session_id: sessionId,
        user_id: req.user.id
      }
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    const message = await db.Message.findOne({
      where: { message_id: messageId }
    });

    if (!message || !message.media_url) {
      return res.status(404).json({
        success: false,
        message: 'Media not found'
      });
    }

    const filePath = path.join(__dirname, '../../', message.media_url);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'Media file not found'
      });
    }

    res.download(filePath);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to download media',
      error: error.message
    });
  }
};

module.exports = {
  getChatList,
  getChatHistory,
  searchMessages,
  markAsRead,
  sendPresence,
  archiveChat,
  pinChat,
  muteChat,
  blockContact,
  downloadMedia
};
