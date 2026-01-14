const db = require('../models');
const whatsappService = require('../services/whatsappService');
const { checkSubscriptionLimit } = require('../middleware/permissions');
const path = require('path');

/**
 * Create new WhatsApp session
 */
const createSession = async (req, res) => {
  console.log('[sessionController] CREATE SESSION REQUEST RECEIVED');
  try {
    const { name, webhook_url, webhook_events, auto_reconnect = true, use_pairing = false, phone_number } = req.body;
    console.log('[sessionController] Request body:', { name, use_pairing, phone_number });

    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Session name is required'
      });
    }

    // Validate pairing requirements
    if (use_pairing && !phone_number) {
      return res.status(400).json({
        success: false,
        message: 'Phone number is required when using pairing code method'
      });
    }

    // Generate unique session ID
    const sessionId = `${req.user.id}_${Date.now()}`;
    console.log('[sessionController] Generated session ID:', sessionId);

    // Create session record
    console.log('[sessionController] Creating session record...');
    const session = await db.Session.create({
      session_id: sessionId,
      user_id: req.user.id,
      organization_id: req.user.organization_id,
      name,
      webhook_url,
      webhook_events: webhook_events || ['*'],
      auto_reconnect,
      status: use_pairing ? 'pairing' : 'connecting',
      phone_number: use_pairing ? phone_number : null
    });
    console.log('[sessionController] Session record created:', session.id);

    // Initialize WhatsApp connection (non-blocking - let it run in background)
    console.log('[sessionController] Initializing WhatsApp connection...');
    whatsappService.createSession(sessionId, session, use_pairing, phone_number).catch(error => {
      // Log error but don't crash
      console.error(`[sessionController] Session initialization failed for ${sessionId}:`, error);
      // Update session status to failed
      session.update({ status: 'failed' }).catch(() => {});
    });
    console.log('[sessionController] WhatsApp connection initialized (non-blocking)');

    // Create audit log (non-blocking)
    db.AuditLog.create({
      user_id: req.user.id,
      action: 'session.created',
      resource_type: 'session',
      resource_id: session.id,
      description: `Session created: ${name}`,
      ip_address: req.ip || req.connection.remoteAddress,
      user_agent: req.headers['user-agent']
    }).catch(error => {
      console.error('Audit log creation failed:', error);
    });

    res.status(201).json({
      success: true,
      message: use_pairing ? 'Session created. Please enter pairing code in WhatsApp' : 'Session created successfully',
      data: {
        session: session.toJSON(),
        use_pairing,
        pairing_code: session.pairing_code
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to create session',
      error: error.message
    });
  }
};

/**
 * Get all sessions for user
 */
const getSessions = async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const offset = (page - 1) * limit;

    const where = { user_id: req.user.id };
    if (status) {
      where.status = status;
    }

    const sessions = await db.Session.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['created_at', 'DESC']]
    });

    res.json({
      success: true,
      data: {
        sessions: sessions.rows,
        pagination: {
          total: sessions.count,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(sessions.count / limit)
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get sessions',
      error: error.message
    });
  }
};

/**
 * Get single session
 */
const getSession = async (req, res) => {
  try {
    const { id } = req.params;

    const session = await db.Session.findOne({
      where: {
        id,
        user_id: req.user.id
      }
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    res.json({
      success: true,
      data: {
        session: session.toJSON(),
        connected: whatsappService.isSessionConnected(session.session_id)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get session',
      error: error.message
    });
  }
};

/**
 * Get QR code for session
 */
const getQRCode = async (req, res) => {
  try {
    const { id } = req.params;

    const session = await db.Session.findOne({
      where: {
        id,
        user_id: req.user.id
      }
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    if (!session.qr_code) {
      return res.status(404).json({
        success: false,
        message: 'QR code not available. Session may be connected or disconnected.'
      });
    }

    res.json({
      success: true,
      data: {
        qr: session.qr_code,
        session_id: session.session_id,
        status: session.status
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get QR code',
      error: error.message
    });
  }
};

/**
 * Reconnect session
 */
const reconnectSession = async (req, res) => {
  console.log('[reconnectSession] START - session id:', req.params.id);
  try {
    const { id } = req.params;
    const forceNew = req.body?.forceNew; // Option to force new auth (delete old credentials)
    console.log('[reconnectSession] forceNew:', forceNew);
    console.log('[reconnectSession] req.user.id:', req.user?.id);

    let session;
    try {
      session = await db.Session.findOne({
        where: {
          id,
          user_id: req.user.id
        }
      });
    } catch (dbError) {
      console.log('[reconnectSession] DB ERROR:', dbError.message);
      throw dbError;
    }
    console.log('[reconnectSession] session found:', session ? 'yes' : 'no', 'status:', session?.status);

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    // Check if connected in memory
    let isConnectedInMemory = false;
    try {
      isConnectedInMemory = whatsappService.isSessionConnected(session.session_id);
      console.log('[reconnectSession] isConnectedInMemory:', isConnectedInMemory);
    } catch (e) {
      console.log('[reconnectSession] isSessionConnected error:', e.message);
    }

    if (isConnectedInMemory) {
      return res.status(400).json({
        success: false,
        message: 'Session is already connected'
      });
    }

    // If session is already connecting/qr, just return success (don't reconnect again)
    if (session.status === 'connecting' || session.status === 'qr') {
      console.log('[reconnectSession] Already connecting/qr, returning success');
      return res.json({
        success: true,
        message: 'Session is already reconnecting',
        data: {
          session_id: session.id,
          status: session.status
        }
      });
    }

    // Clean up existing session from map if exists (but not connected)
    try {
      await whatsappService.cleanupSession(session.session_id);
    } catch (e) {
      console.log(`[reconnectSession] Cleanup session: ${e.message}`);
    }

    // If session was failed or forceNew, delete old auth state to get fresh QR
    const needsFreshAuth = session.status === 'failed' || forceNew === true;
    if (needsFreshAuth) {
      try {
        const authPath = path.join(process.cwd(), 'sessions', session.session_id);
        const fs = require('fs');
        if (fs.existsSync(authPath)) {
          fs.rmSync(authPath, { recursive: true, force: true });
          console.log(`[reconnectSession] Deleted old auth state: ${authPath}`);
        }
      } catch (e) {
        console.log(`[reconnectSession] Failed to delete auth state: ${e.message}`);
      }
    }

    // Update status to connecting first
    await session.update({ 
      status: 'connecting',
      qr_code: null // Clear old QR code
    });

    // Reconnect (non-blocking)
    whatsappService.createSession(session.session_id, session).catch(error => {
      console.error(`[reconnectSession] Session reconnection failed for ${session.session_id}:`, error);
      session.update({ status: 'failed' }).catch(() => {});
    });

    res.json({
      success: true,
      message: needsFreshAuth ? 'Session reconnection initiated with fresh authentication' : 'Session reconnection initiated',
      data: {
        session_id: session.id,
        status: 'connecting',
        freshAuth: needsFreshAuth
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to reconnect session',
      error: error.message
    });
  }
};

/**
 * Disconnect session
 */
const disconnectSession = async (req, res) => {
  try {
    const { id } = req.params;

    const session = await db.Session.findOne({
      where: {
        id,
        user_id: req.user.id
      }
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    await whatsappService.disconnectSession(session.session_id);

    await session.update({
      status: 'disconnected',
      last_disconnected_at: new Date()
    });

    // Create audit log
    await db.AuditLog.create({
      user_id: req.user.id,
      action: 'session.disconnected',
      resource_type: 'session',
      resource_id: session.id,
      description: `Session disconnected: ${session.name}`,
      ip_address: req.ip || req.connection.remoteAddress,
      user_agent: req.headers['user-agent']
    });

    res.json({
      success: true,
      message: 'Session disconnected successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to disconnect session',
      error: error.message
    });
  }
};

/**
 * Delete session
 */
const deleteSession = async (req, res) => {
  try {
    const { id } = req.params;

    const session = await db.Session.findOne({
      where: {
        id,
        user_id: req.user.id
      }
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    // Delete from WhatsApp service
    await whatsappService.deleteSession(session.session_id);

    // Delete from database
    await session.destroy();

    // Create audit log
    await db.AuditLog.create({
      user_id: req.user.id,
      action: 'session.deleted',
      resource_type: 'session',
      resource_id: session.id,
      description: `Session deleted: ${session.name}`,
      ip_address: req.ip || req.connection.remoteAddress,
      user_agent: req.headers['user-agent']
    });

    res.json({
      success: true,
      message: 'Session deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete session',
      error: error.message
    });
  }
};

/**
 * Update session settings
 */
const updateSession = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, webhook_url, webhook_events, auto_reconnect } = req.body;

    const session = await db.Session.findOne({
      where: {
        id,
        user_id: req.user.id
      }
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    await session.update({
      ...(name && { name }),
      ...(webhook_url !== undefined && { webhook_url }),
      ...(webhook_events && { webhook_events }),
      ...(auto_reconnect !== undefined && { auto_reconnect })
    });

    res.json({
      success: true,
      message: 'Session updated successfully',
      data: {
        session: session.toJSON()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update session',
      error: error.message
    });
  }
};

/**
 * Get all chats/conversations from WhatsApp session
 */
const getChats = async (req, res) => {
  try {
    const { id } = req.params;
    const { limit, offset, filter, search } = req.query;

    const session = await db.Session.findOne({
      where: {
        id,
        user_id: req.user.id
      }
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    // Check if session is connected
    if (session.status !== 'connected') {
      return res.status(400).json({
        success: false,
        message: 'Session is not connected. Please reconnect first.',
        status: session.status
      });
    }

    // Fetch chats from WhatsApp
    const result = await whatsappService.fetchChats(session.session_id, {
      limit,
      offset,
      filter,
      search
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch chats',
      error: error.message
    });
  }
};

/**
 * Resync history for a session
 * This will disconnect and reconnect to trigger fresh history sync from WhatsApp
 */
const resyncHistory = async (req, res) => {
  try {
    // FIXED: Route parameter is :id, not :sessionId
    const sessionIdParam = req.params.id;

    if (!sessionIdParam) {
      return res.status(400).json({
        success: false,
        message: 'Session ID parameter is required'
      });
    }

    // Find session
    const session = await db.Session.findOne({
      where: {
        [db.Sequelize.Op.or]: [
          { session_id: sessionIdParam },
          { id: sessionIdParam }
        ],
        user_id: req.user.id
      }
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    if (session.status !== 'connected') {
      return res.status(400).json({
        success: false,
        message: 'Session must be connected to resync history',
        data: {
          sessionId: session.session_id,
          currentStatus: session.status
        }
      });
    }

    const result = await whatsappService.resyncHistory(session.session_id);

    res.json({
      success: true,
      message: result.message,
      data: {
        sessionId: session.session_id,
        status: 'resyncing'
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to resync history',
      error: error.message
    });
  }
};

/**
 * Get sync status for a session
 * Returns message counts and sync status
 */
const getSyncStatus = async (req, res) => {
  try {
    // FIXED: Route parameter is :id, not :sessionId
    const sessionIdParam = req.params.id;

    if (!sessionIdParam) {
      return res.status(400).json({
        success: false,
        message: 'Session ID parameter is required'
      });
    }

    // Find session - support both session_id and UUID id
    const session = await db.Session.findOne({
      where: {
        [db.Sequelize.Op.or]: [
          { session_id: sessionIdParam },
          { id: sessionIdParam }
        ],
        user_id: req.user.id
      }
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    // Verify session.id is valid UUID before querying
    if (!session.id) {
      return res.status(500).json({
        success: false,
        message: 'Invalid session record - missing ID'
      });
    }

    // Get message statistics using proper Sequelize query
    const [messageStats] = await db.sequelize.query(`
      SELECT 
        COUNT(*) as total_messages,
        SUM(CASE WHEN from_me = 1 THEN 1 ELSE 0 END) as outgoing_messages,
        SUM(CASE WHEN from_me = 0 THEN 1 ELSE 0 END) as incoming_messages,
        SUM(CASE WHEN content IS NOT NULL AND content != '' THEN 1 ELSE 0 END) as messages_with_content,
        SUM(CASE WHEN content IS NULL OR content = '' THEN 1 ELSE 0 END) as messages_without_content,
        SUM(CASE WHEN JSON_EXTRACT(metadata, '$.is_history') = true THEN 1 ELSE 0 END) as history_messages,
        COUNT(DISTINCT remote_jid) as unique_chats,
        MIN(timestamp) as oldest_message,
        MAX(timestamp) as newest_message
      FROM messages
      WHERE session_id = :sessionId
    `, {
      replacements: { sessionId: session.id },
      type: db.Sequelize.QueryTypes.SELECT
    });

    // Get chat count - check if Chat model exists
    let chatCount = 0;
    if (db.Chat) {
      chatCount = await db.Chat.count({
        where: { session_id: session.id }
      });
    }

    const stats = messageStats || {};
    
    res.json({
      success: true,
      data: {
        sessionId: session.session_id,
        status: session.status,
        lastConnected: session.last_connected_at,
        sync: {
          totalMessages: parseInt(stats.total_messages) || 0,
          outgoingMessages: parseInt(stats.outgoing_messages) || 0,
          incomingMessages: parseInt(stats.incoming_messages) || 0,
          messagesWithContent: parseInt(stats.messages_with_content) || 0,
          messagesWithoutContent: parseInt(stats.messages_without_content) || 0,
          historyMessages: parseInt(stats.history_messages) || 0,
          uniqueChats: parseInt(stats.unique_chats) || 0,
          persistentChats: chatCount,
          contentPercentage: stats.total_messages > 0 
            ? Math.round((stats.messages_with_content / stats.total_messages) * 100) 
            : 0,
          dateRange: {
            oldest: stats.oldest_message ? new Date(parseInt(stats.oldest_message)).toISOString() : null,
            newest: stats.newest_message ? new Date(parseInt(stats.newest_message)).toISOString() : null
          }
        },
        recommendations: []
      }
    });

    // Add recommendations based on stats
    const recommendations = [];
    if (stats.messages_without_content > 0 && (stats.messages_without_content / stats.total_messages) > 0.1) {
      recommendations.push({
        type: 'warning',
        message: `${Math.round((stats.messages_without_content / stats.total_messages) * 100)}% of messages have empty content. Try resync history.`
      });
    }
    if (stats.history_messages === 0 && stats.total_messages > 0) {
      recommendations.push({
        type: 'info',
        message: 'No history messages synced yet. Reconnect session to trigger history sync.'
      });
    }

    res.json({
      success: true,
      data: {
        sessionId: session.session_id,
        status: session.status,
        lastConnected: session.last_connected_at,
        sync: {
          totalMessages: parseInt(stats.total_messages) || 0,
          outgoingMessages: parseInt(stats.outgoing_messages) || 0,
          incomingMessages: parseInt(stats.incoming_messages) || 0,
          messagesWithContent: parseInt(stats.messages_with_content) || 0,
          messagesWithoutContent: parseInt(stats.messages_without_content) || 0,
          historyMessages: parseInt(stats.history_messages) || 0,
          uniqueChats: parseInt(stats.unique_chats) || 0,
          persistentChats: chatCount,
          contentPercentage: stats.total_messages > 0 
            ? Math.round((stats.messages_with_content / stats.total_messages) * 100) 
            : 0,
          dateRange: {
            oldest: stats.oldest_message ? new Date(parseInt(stats.oldest_message)).toISOString() : null,
            newest: stats.newest_message ? new Date(parseInt(stats.newest_message)).toISOString() : null
          }
        },
        recommendations
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get sync status',
      error: error.message
    });
  }
};

module.exports = {
  createSession,
  getSessions,
  getSession,
  getQRCode,
  reconnectSession,
  disconnectSession,
  deleteSession,
  updateSession,
  getChats,
  resyncHistory,
  getSyncStatus
};