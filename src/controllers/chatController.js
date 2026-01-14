const db = require('../models');
const whatsappService = require('../services/whatsappService');
const messageService = require('../services/messageService');
const searchService = require('../services/searchService');
const path = require('path');
const fs = require('fs');

/**
 * Get chat list - includes both personal chats AND groups
 * Fixed: Previously only returned groups via groupFetchAllParticipating()
 * Fixed #7: Uses persistent Chat table for unread counts (survives restart)
 */
const getChatList = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { filter = 'all', limit = 50, offset = 0, archived = 'false' } = req.query;

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

    // Build filter for chat type
    const chatWhere = {
      session_id: session.id,
      is_archived: archived === 'true'
    };
    
    if (filter === 'personal') {
      chatWhere.is_group = false;
    } else if (filter === 'groups') {
      chatWhere.is_group = true;
    }

    // Fix #7: Get chats from persistent Chat table (includes unread_count that survives restart)
    const chats = await db.Chat.findAll({
      where: chatWhere,
      order: [
        ['is_pinned', 'DESC'],
        ['last_message_at', 'DESC']
      ],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    // Get contact info for personal chats
    const chatsWithDetails = await Promise.all(
      chats.map(async (chat) => {
        // Try to get contact info from contacts table
        let contactInfo = null;
        if (!chat.is_group && chat.phone) {
          contactInfo = await db.Contact.findOne({
            where: {
              session_id: session.id,
              phone: chat.phone
            }
          });
        }

        return {
          // Fix #6: Consistent ID format - use jid as primary identifier
          id: chat.jid,
          jid: chat.jid,
          name: contactInfo?.custom_name || contactInfo?.push_name || chat.name || chat.phone || 'Unknown',
          phone: chat.phone,
          isGroup: chat.is_group,
          // Fix #7: Persistent unread count from database
          unreadCount: chat.unread_count || 0,
          isArchived: chat.is_archived,
          isPinned: chat.is_pinned,
          isMuted: chat.is_muted,
          timestamp: chat.last_message_at,
          lastMessage: chat.last_message_preview ? {
            preview: chat.last_message_preview,
            type: chat.last_message_type,
            fromMe: chat.last_message_from_me,
            timestamp: chat.last_message_at
          } : null,
          profilePictureUrl: chat.profile_picture_url
        };
      })
    );

    // Get total count for pagination
    const totalCount = await db.Chat.count({
      where: chatWhere
    });

    res.json({
      success: true,
      data: {
        chats: chatsWithDetails,
        pagination: {
          total: totalCount,
          limit: parseInt(limit),
          offset: parseInt(offset),
          hasMore: parseInt(offset) + chatsWithDetails.length < totalCount
        }
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
 * Get conversation - combines chat info + messages + contact in 1 API call
 * Fix #4: Single API call for complete conversation context
 */
const getConversation = async (req, res) => {
  try {
    const { sessionId, jid } = req.params;
    const { limit = 50, before, after } = req.query;

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

    const isGroup = jid.endsWith('@g.us');
    const phone = isGroup ? null : jid.split('@')[0];

    // Build message query
    const messageWhere = {
      session_id: session.id,
      remote_jid: jid
    };

    if (before) {
      messageWhere.timestamp = { [db.Sequelize.Op.lt]: parseInt(before) };
    }
    if (after) {
      messageWhere.timestamp = { 
        ...messageWhere.timestamp,
        [db.Sequelize.Op.gt]: parseInt(after) 
      };
    }

    // Parallel fetch: messages, contact, assignment, stats
    const [messages, contact, assignment, stats] = await Promise.all([
      // Messages
      db.Message.findAll({
        where: messageWhere,
        limit: parseInt(limit),
        order: [['timestamp', 'DESC']]
      }),
      
      // Contact info (if personal chat)
      !isGroup ? db.Contact.findOne({
        where: {
          session_id: session.id,
          phone: phone
        }
      }) : null,
      
      // Chat assignment (CRM)
      db.ChatAssignment.findOne({
        where: {
          session_id: session.id,
          chat_jid: jid,
          status: { [db.Sequelize.Op.ne]: 'closed' }
        },
        include: [{
          model: db.User,
          as: 'agent',
          attributes: ['id', 'name', 'email']
        }]
      }),
      
      // Chat stats
      db.Message.findOne({
        where: { session_id: session.id, remote_jid: jid },
        attributes: [
          [db.Sequelize.fn('COUNT', db.Sequelize.col('id')), 'total_messages'],
          [db.Sequelize.fn('MIN', db.Sequelize.col('timestamp')), 'first_message_at'],
          [db.Sequelize.fn('MAX', db.Sequelize.col('timestamp')), 'last_message_at'],
          [db.Sequelize.fn('SUM', db.Sequelize.literal("CASE WHEN from_me = true THEN 1 ELSE 0 END")), 'sent_count'],
          [db.Sequelize.fn('SUM', db.Sequelize.literal("CASE WHEN from_me = false THEN 1 ELSE 0 END")), 'received_count']
        ],
        raw: true
      })
    ]);

    // Calculate unread count
    const unreadCount = await db.Message.count({
      where: {
        session_id: session.id,
        remote_jid: jid,
        from_me: false,
        status: 'received'
      }
    });

    res.json({
      success: true,
      data: {
        conversation: {
          jid: jid,
          isGroup: isGroup,
          phone: phone,
          unreadCount: unreadCount,
          stats: {
            totalMessages: parseInt(stats?.total_messages) || 0,
            sentCount: parseInt(stats?.sent_count) || 0,
            receivedCount: parseInt(stats?.received_count) || 0,
            firstMessageAt: stats?.first_message_at,
            lastMessageAt: stats?.last_message_at
          }
        },
        contact: contact ? {
          id: contact.id,
          phone: contact.phone,
          jid: contact.jid,
          name: contact.custom_name || contact.push_name,
          pushName: contact.push_name,
          customName: contact.custom_name,
          tags: contact.custom_tags,
          notes: contact.custom_notes,
          lastMessageAt: contact.last_message_at
        } : null,
        assignment: assignment ? {
          id: assignment.id,
          status: assignment.status,
          priority: assignment.priority,
          tags: assignment.tags,
          notes: assignment.notes,
          assignedAt: assignment.assigned_at,
          agent: assignment.agent ? {
            id: assignment.agent.id,
            name: assignment.agent.name,
            email: assignment.agent.email
          } : null
        } : null,
        messages: messages.map(m => ({
          id: m.message_id,
          content: m.content,
          type: m.type,
          fromMe: m.from_me,
          status: m.status,
          timestamp: m.timestamp,
          mediaUrl: m.media_url,
          metadata: m.metadata
        })),
        pagination: {
          count: messages.length,
          limit: parseInt(limit),
          hasMore: messages.length === parseInt(limit),
          oldestTimestamp: messages.length > 0 ? messages[messages.length - 1].timestamp : null
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get conversation',
      error: error.message
    });
  }
};

/**
 * Search messages - Uses FULLTEXT search for better performance
 * Fixes Issue #9: Basic LIKE search was slow and case-sensitive
 */
const searchMessages = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { 
      query, 
      jid, 
      type, 
      from_date, 
      to_date, 
      from_me,
      mode = 'natural',
      limit = 50,
      offset = 0
    } = req.query;

    if (!query || query.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Query is required (minimum 2 characters)'
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

    // Use the new search service with FULLTEXT support
    const results = await searchService.searchMessages({
      sessionId: session.id,
      query: query.trim(),
      jid,
      type,
      fromDate: from_date,
      toDate: to_date,
      fromMe: from_me === 'true' ? true : from_me === 'false' ? false : undefined,
      mode,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      success: true,
      data: {
        query,
        mode: results.fallback ? 'like' : mode,
        ...results
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

    // Fix #7: Reset persistent unread count in Chat table
    await db.Chat.markAsRead(session.id, jid);

    // Also update messages status in database
    await db.Message.update(
      { status: 'read', read_at: new Date() },
      {
        where: {
          session_id: session.id,
          remote_jid: jid,
          from_me: false,
          status: { [db.Sequelize.Op.ne]: 'read' }
        }
      }
    );

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
  getConversation,
  searchMessages,
  markAsRead,
  sendPresence,
  archiveChat,
  pinChat,
  muteChat,
  blockContact,
  downloadMedia
};
