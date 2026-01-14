/**
 * Bulk Operations Controller
 * Fixes Issue #10: No bulk operations for mass actions
 * 
 * Provides efficient bulk endpoints for:
 * - Bulk message sending
 * - Bulk mark as read
 * - Bulk assignment
 * - Bulk contact operations
 * - Bulk delete/archive
 */

const db = require('../models');
const whatsappService = require('../services/whatsappService');
const logger = require('../config/logger');
const { v4: uuidv4 } = require('uuid');

/**
 * Bulk send messages to multiple recipients
 * POST /api/v1/bulk/:sessionId/messages
 */
const bulkSendMessages = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { messages, options = {} } = req.body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Messages array is required'
      });
    }

    // Limit batch size for performance
    const maxBatchSize = options.maxBatchSize || 100;
    if (messages.length > maxBatchSize) {
      return res.status(400).json({
        success: false,
        message: `Maximum ${maxBatchSize} messages per batch`
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

    // Process messages with delay between each
    const delayMs = options.delayMs || 1000; // Default 1 second between messages
    const results = [];
    const errors = [];
    const batchId = uuidv4();

    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      
      try {
        // Validate required fields
        if (!msg.to || !msg.content) {
          errors.push({
            index: i,
            to: msg.to,
            error: 'Missing required fields: to, content'
          });
          continue;
        }

        // Normalize phone number
        let jid = msg.to;
        if (!jid.includes('@')) {
          jid = jid.replace(/[^0-9]/g, '') + '@s.whatsapp.net';
        }

        // Send message
        const result = await sock.sendMessage(jid, {
          text: msg.content
        });

        // Save to database
        await db.Message.create({
          session_id: session.id,
          message_id: result.key.id,
          remote_jid: jid,
          from_me: true,
          type: 'text',
          content: msg.content,
          status: 'sent',
          timestamp: Date.now(),
          metadata: {
            batch_id: batchId,
            batch_index: i
          }
        });

        results.push({
          index: i,
          to: msg.to,
          messageId: result.key.id,
          status: 'sent'
        });

        // Delay between messages (except last one)
        if (i < messages.length - 1 && delayMs > 0) {
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
      } catch (error) {
        logger.error(`Bulk send error for ${msg.to}:`, error);
        errors.push({
          index: i,
          to: msg.to,
          error: error.message
        });
      }
    }

    res.json({
      success: true,
      data: {
        batchId,
        total: messages.length,
        sent: results.length,
        failed: errors.length,
        results,
        errors: errors.length > 0 ? errors : undefined
      }
    });
  } catch (error) {
    logger.error('Bulk send error:', error);
    res.status(500).json({
      success: false,
      message: 'Bulk send failed',
      error: error.message
    });
  }
};

/**
 * Bulk mark chats as read
 * POST /api/v1/bulk/:sessionId/mark-read
 */
const bulkMarkAsRead = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { jids } = req.body;

    if (!Array.isArray(jids) || jids.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'JIDs array is required'
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

    const sock = whatsappService.getSession(sessionId);
    const results = [];
    const errors = [];

    for (const jid of jids) {
      try {
        // Mark as read via WhatsApp if connected
        if (sock) {
          // Get last message to mark as read
          const lastMessage = await db.Message.findOne({
            where: {
              session_id: session.id,
              remote_jid: jid,
              from_me: false
            },
            order: [['timestamp', 'DESC']]
          });

          if (lastMessage) {
            await sock.readMessages([{
              remoteJid: jid,
              id: lastMessage.message_id,
              participant: undefined
            }]);
          }
        }

        // Update database - mark all messages as read
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

        // Reset unread count in chats table
        await db.Chat.update(
          { unread_count: 0 },
          {
            where: {
              session_id: session.id,
              jid: jid
            }
          }
        );

        results.push({ jid, status: 'success' });
      } catch (error) {
        errors.push({ jid, error: error.message });
      }
    }

    res.json({
      success: true,
      data: {
        total: jids.length,
        success: results.length,
        failed: errors.length,
        results,
        errors: errors.length > 0 ? errors : undefined
      }
    });
  } catch (error) {
    logger.error('Bulk mark read error:', error);
    res.status(500).json({
      success: false,
      message: 'Bulk mark read failed',
      error: error.message
    });
  }
};

/**
 * Bulk assign chats to agents
 * POST /api/v1/bulk/:sessionId/assign
 */
const bulkAssignChats = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { assignments } = req.body;

    if (!Array.isArray(assignments) || assignments.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Assignments array is required'
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

    const results = [];
    const errors = [];

    for (const assignment of assignments) {
      try {
        const { jid, agentId, priority, tags, notes } = assignment;

        if (!jid || !agentId) {
          errors.push({
            jid,
            error: 'Missing required fields: jid, agentId'
          });
          continue;
        }

        // Check if agent exists
        const agent = await db.User.findByPk(agentId);
        if (!agent) {
          errors.push({ jid, error: 'Agent not found' });
          continue;
        }

        // Upsert assignment
        const [chatAssignment, created] = await db.ChatAssignment.upsert({
          session_id: session.id,
          chat_jid: jid,
          agent_id: agentId,
          assigned_by: req.user.id,
          assigned_at: new Date(),
          status: 'open',
          priority: priority || 'medium',
          tags: tags || [],
          notes: notes || null
        }, {
          conflictFields: ['session_id', 'chat_jid']
        });

        results.push({
          jid,
          agentId,
          assignmentId: chatAssignment.id,
          created
        });
      } catch (error) {
        errors.push({
          jid: assignment.jid,
          error: error.message
        });
      }
    }

    res.json({
      success: true,
      data: {
        total: assignments.length,
        success: results.length,
        failed: errors.length,
        results,
        errors: errors.length > 0 ? errors : undefined
      }
    });
  } catch (error) {
    logger.error('Bulk assign error:', error);
    res.status(500).json({
      success: false,
      message: 'Bulk assign failed',
      error: error.message
    });
  }
};

/**
 * Bulk update contacts
 * PUT /api/v1/bulk/:sessionId/contacts
 */
const bulkUpdateContacts = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { contacts } = req.body;

    if (!Array.isArray(contacts) || contacts.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Contacts array is required'
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

    const results = [];
    const errors = [];

    for (const contact of contacts) {
      try {
        const { phone, name, tags, notes, metadata } = contact;

        if (!phone) {
          errors.push({ phone, error: 'Phone is required' });
          continue;
        }

        // Upsert contact
        const [updatedContact, created] = await db.Contact.upsert({
          session_id: session.id,
          phone: phone.replace(/[^0-9]/g, ''),
          jid: phone.replace(/[^0-9]/g, '') + '@s.whatsapp.net',
          custom_name: name || null,
          custom_tags: tags || [],
          custom_notes: notes || null,
          metadata: metadata || {}
        }, {
          conflictFields: ['session_id', 'phone']
        });

        results.push({
          phone,
          contactId: updatedContact.id,
          created
        });
      } catch (error) {
        errors.push({
          phone: contact.phone,
          error: error.message
        });
      }
    }

    res.json({
      success: true,
      data: {
        total: contacts.length,
        success: results.length,
        failed: errors.length,
        results,
        errors: errors.length > 0 ? errors : undefined
      }
    });
  } catch (error) {
    logger.error('Bulk update contacts error:', error);
    res.status(500).json({
      success: false,
      message: 'Bulk update contacts failed',
      error: error.message
    });
  }
};

/**
 * Bulk archive/unarchive chats
 * POST /api/v1/bulk/:sessionId/archive
 */
const bulkArchiveChats = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { jids, archive = true } = req.body;

    if (!Array.isArray(jids) || jids.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'JIDs array is required'
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

    // Bulk update chats
    const [affectedRows] = await db.Chat.update(
      { is_archived: archive },
      {
        where: {
          session_id: session.id,
          jid: { [db.Sequelize.Op.in]: jids }
        }
      }
    );

    res.json({
      success: true,
      data: {
        total: jids.length,
        updated: affectedRows,
        archive
      }
    });
  } catch (error) {
    logger.error('Bulk archive error:', error);
    res.status(500).json({
      success: false,
      message: 'Bulk archive failed',
      error: error.message
    });
  }
};

/**
 * Bulk delete messages
 * DELETE /api/v1/bulk/:sessionId/messages
 */
const bulkDeleteMessages = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { messageIds, deleteForEveryone = false } = req.body;

    if (!Array.isArray(messageIds) || messageIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Message IDs array is required'
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

    const sock = whatsappService.getSession(sessionId);
    const results = [];
    const errors = [];

    for (const messageId of messageIds) {
      try {
        // Get message to find its jid
        const message = await db.Message.findOne({
          where: {
            session_id: session.id,
            message_id: messageId
          }
        });

        if (!message) {
          errors.push({ messageId, error: 'Message not found' });
          continue;
        }

        // Delete from WhatsApp if connected and deleteForEveryone
        if (sock && deleteForEveryone && message.from_me) {
          try {
            await sock.sendMessage(message.remote_jid, {
              delete: {
                remoteJid: message.remote_jid,
                fromMe: true,
                id: messageId
              }
            });
          } catch (waError) {
            logger.warn(`WhatsApp delete failed for ${messageId}:`, waError.message);
          }
        }

        // Soft delete in database
        await message.update({
          status: 'deleted',
          deleted_at: new Date()
        });

        results.push({ messageId, status: 'deleted' });
      } catch (error) {
        errors.push({ messageId, error: error.message });
      }
    }

    res.json({
      success: true,
      data: {
        total: messageIds.length,
        deleted: results.length,
        failed: errors.length,
        results,
        errors: errors.length > 0 ? errors : undefined
      }
    });
  } catch (error) {
    logger.error('Bulk delete error:', error);
    res.status(500).json({
      success: false,
      message: 'Bulk delete failed',
      error: error.message
    });
  }
};

/**
 * Bulk resolve conversations
 * POST /api/v1/bulk/:sessionId/resolve
 */
const bulkResolveConversations = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { jids, notes } = req.body;

    if (!Array.isArray(jids) || jids.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'JIDs array is required'
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

    const results = [];
    const errors = [];

    for (const jid of jids) {
      try {
        // Close assignment
        await db.ChatAssignment.update(
          {
            status: 'closed',
            closed_at: new Date(),
            notes: notes || null
          },
          {
            where: {
              session_id: session.id,
              chat_jid: jid,
              status: { [db.Sequelize.Op.ne]: 'closed' }
            }
          }
        );

        // Resolve conversation metrics
        await db.ConversationMetrics.resolveConversation(session.id, jid, notes);

        results.push({ jid, status: 'resolved' });
      } catch (error) {
        errors.push({ jid, error: error.message });
      }
    }

    res.json({
      success: true,
      data: {
        total: jids.length,
        resolved: results.length,
        failed: errors.length,
        results,
        errors: errors.length > 0 ? errors : undefined
      }
    });
  } catch (error) {
    logger.error('Bulk resolve error:', error);
    res.status(500).json({
      success: false,
      message: 'Bulk resolve failed',
      error: error.message
    });
  }
};

module.exports = {
  bulkSendMessages,
  bulkMarkAsRead,
  bulkAssignChats,
  bulkUpdateContacts,
  bulkArchiveChats,
  bulkDeleteMessages,
  bulkResolveConversations
};
