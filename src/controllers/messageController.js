console.log('🔍 [messageController] Loading db models...');
const db = require('../models');
console.log('✅ [messageController] Models loaded');

console.log('🔍 [messageController] Loading sequelize Op...');
const { Op } = require('sequelize');
console.log('✅ [messageController] Sequelize Op loaded');

console.log('🔍 [messageController] Loading whatsappService...');
const whatsappService = require('../services/whatsappService');
console.log('✅ [messageController] whatsappService loaded');

console.log('🔍 [messageController] Loading messageService...');
const messageService = require('../services/messageService');
console.log('✅ [messageController] messageService loaded');

console.log('🔍 [messageController] Loading upload config...');
const { upload } = require('../config/upload');
console.log('✅ [messageController] upload config loaded');

/**
 * Helper to find session by ID (supports both id UUID and session_id)
 */
const findSessionById = async (sessionId, userId) => {
  // Try by primary key (id) first
  let session = await db.Session.findOne({
    where: {
      id: sessionId,
      user_id: userId
    }
  });
  
  // Fallback: try session_id if not found
  if (!session) {
    session = await db.Session.findOne({
      where: {
        session_id: sessionId,
        user_id: userId
      }
    });
  }
  
  return session;
};

/**
 * Helper to get socket, with auto-reconnect if session is "connected" but socket missing
 * This handles the case when backend restarts and loses in-memory sockets
 */
const getSocketWithAutoReconnect = async (session) => {
  // First try to get existing socket
  let sock = whatsappService.getSession(session.session_id);
  
  if (sock) {
    return sock;
  }
  
  // Socket not found - check if we should auto-reconnect
  // Only reconnect if status is "connected" (credentials should still be valid)
  if (session.status === 'connected') {
    console.log(`[Auto-Reconnect] Session ${session.session_id} has status 'connected' but no socket. Attempting auto-reconnect...`);
    
    try {
      // Try to reconnect using existing credentials
      await whatsappService.createSession(session.session_id, session);
      
      // Wait a bit for connection to establish
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Try to get socket again
      sock = whatsappService.getSession(session.session_id);
      
      if (sock) {
        console.log(`[Auto-Reconnect] Session ${session.session_id} reconnected successfully`);
        return sock;
      } else {
        console.log(`[Auto-Reconnect] Session ${session.session_id} failed to reconnect`);
        // Update status to disconnected since auto-reconnect failed
        await session.update({ status: 'disconnected' });
      }
    } catch (error) {
      console.log(`[Auto-Reconnect] Error reconnecting session ${session.session_id}:`, error.message);
      // Update status to disconnected
      await session.update({ status: 'disconnected' });
    }
  }
  
  return null;
};

/**
 * Send text message
 */
const sendTextMessage = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { phone, message, quoted } = req.body;

    if (!phone || !message) {
      return res.status(400).json({
        success: false,
        message: 'Phone number and message are required'
      });
    }

    // Get session (supports both id and session_id)
    const session = await findSessionById(sessionId, req.user.id);

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    if (session.status !== 'connected') {
      return res.status(400).json({
        success: false,
        message: 'Session is not connected. Please reconnect from the Sessions page.'
      });
    }

    // Get socket using session_id (with auto-reconnect if needed)
    const sock = await getSocketWithAutoReconnect(session);
    if (!sock) {
      return res.status(400).json({
        success: false,
        message: 'Session connection lost. Please reconnect from the Sessions page.'
      });
    }

    // Format phone number
    const jid = messageService.formatPhoneNumber(phone);

    // Check if number is registered
    const isRegistered = await messageService.checkNumberRegistered(sock, phone);
    if (!isRegistered) {
      return res.status(400).json({
        success: false,
        message: 'Phone number is not registered on WhatsApp'
      });
    }

    // Send message
    const options = {};
    if (quoted) {
      options.quoted = { key: { id: quoted } };
    }

    const sent = await messageService.sendTextMessage(sock, jid, message, options);

    // Save to database
    const messageRecord = await db.Message.create({
      session_id: session.id,
      message_id: sent.key.id,
      remote_jid: jid,
      from_me: true,
      type: 'text',
      content: message,
      status: 'sent',
      timestamp: Date.now(),
      sent_at: new Date()
    });

    res.json({
      success: true,
      message: 'Message sent successfully',
      data: {
        message: messageRecord.toJSON(),
        whatsapp_id: sent.key.id
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to send message',
      error: error.message
    });
  }
};

/**
 * Send media message
 */
const sendMediaMessage = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { phone, type, caption } = req.body;

    console.log('[sendMediaMessage] Request:', {
      sessionId,
      phone,
      type,
      caption,
      hasFile: !!req.file,
      file: req.file ? { filename: req.file.filename, mimetype: req.file.mimetype, size: req.file.size } : 'NO FILE',
      body: Object.keys(req.body),
      headers: req.headers['content-type']
    });

    if (!phone || !type || !req.file) {
      console.error('[sendMediaMessage] Missing required fields:', { phone: !!phone, type: !!type, file: !!req.file });
      return res.status(400).json({
        success: false,
        message: 'Phone, type, and file are required',
        debug: { hasPhone: !!phone, hasType: !!type, hasFile: !!req.file }
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

    // Get socket
    const sock = whatsappService.getSession(sessionId);
    if (!sock) {
      return res.status(400).json({
        success: false,
        message: 'Session socket not found'
      });
    }

    // Format phone number
    const jid = messageService.formatPhoneNumber(phone);

    // Send media
    const sent = await messageService.sendMediaMessage(
      sock,
      jid,
      req.file.path,
      type,
      caption || ''
    );

    // Save to database
    const messageRecord = await db.Message.create({
      session_id: session.id,
      message_id: sent.key.id,
      remote_jid: jid,
      from_me: true,
      type,
      content: caption || '',
      media_url: `/uploads/media/${req.file.filename}`,
      media_mime_type: req.file.mimetype,
      media_size: req.file.size,
      status: 'sent',
      timestamp: Date.now(),
      sent_at: new Date()
    });

    res.json({
      success: true,
      message: 'Media sent successfully',
      data: {
        message: messageRecord.toJSON(),
        whatsapp_id: sent.key.id
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to send media',
      error: error.message
    });
  }
};

/**
 * Get messages for session
 */
const getMessages = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { page = 1, limit = 50, phone, type, from_me } = req.query;
    const offset = (page - 1) * limit;

    // Get session
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

    // Build where clause
    const where = { session_id: session.id };
    if (phone) {
      where.remote_jid = messageService.formatPhoneNumber(phone);
    }
    if (type) {
      where.type = type;
    }
    if (from_me !== undefined) {
      where.from_me = from_me === 'true';
    }

    const messages = await db.Message.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['timestamp', 'DESC']]
    });

    res.json({
      success: true,
      data: {
        messages: messages.rows,
        pagination: {
          total: messages.count,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(messages.count / limit)
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get messages',
      error: error.message
    });
  }
};

/**
 * Check if phone number is on WhatsApp
 */
const checkNumber = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { phone } = req.query;

    if (!phone) {
      return res.status(400).json({
        success: false,
        message: 'Phone number is required'
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

    // Get socket
    const sock = whatsappService.getSession(sessionId);
    if (!sock) {
      return res.status(400).json({
        success: false,
        message: 'Session socket not found'
      });
    }

    const isRegistered = await messageService.checkNumberRegistered(sock, phone);
    const jid = messageService.formatPhoneNumber(phone);

    res.json({
      success: true,
      data: {
        phone,
        jid,
        registered: isRegistered
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to check number',
      error: error.message
    });
  }
};

/**
 * Send location message
 */
const sendLocation = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { phone, latitude, longitude, name, address } = req.body;

    if (!phone || !latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: 'Phone, latitude, and longitude are required'
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

    // Get socket
    const sock = whatsappService.getSession(sessionId);
    if (!sock) {
      return res.status(400).json({
        success: false,
        message: 'Session socket not found'
      });
    }

    // Format phone number
    const jid = messageService.formatPhoneNumber(phone);

    // Send location
    const sent = await messageService.sendLocation(
      sock,
      jid,
      parseFloat(latitude),
      parseFloat(longitude),
      name || '',
      address || ''
    );

    // Save to database
    const messageRecord = await db.Message.create({
      session_id: session.id,
      message_id: sent.key.id,
      remote_jid: jid,
      from_me: true,
      type: 'location',
      content: JSON.stringify({ latitude, longitude, name, address }),
      status: 'sent',
      timestamp: Date.now(),
      sent_at: new Date()
    });

    res.json({
      success: true,
      message: 'Location sent successfully',
      data: {
        message: messageRecord.toJSON(),
        whatsapp_id: sent.key.id
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to send location',
      error: error.message
    });
  }
};

/**
 * Send contact message
 */
const sendContact = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { phone, contacts } = req.body;

    if (!phone || !contacts || !Array.isArray(contacts) || contacts.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Phone and contacts array are required'
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

    // Get socket
    const sock = whatsappService.getSession(sessionId);
    if (!sock) {
      return res.status(400).json({
        success: false,
        message: 'Session socket not found'
      });
    }

    // Format phone number
    const jid = messageService.formatPhoneNumber(phone);

    // Send contact
    const sent = await messageService.sendContact(sock, jid, contacts);

    // Save to database
    const messageRecord = await db.Message.create({
      session_id: session.id,
      message_id: sent.key.id,
      remote_jid: jid,
      from_me: true,
      type: 'contact',
      content: JSON.stringify(contacts),
      status: 'sent',
      timestamp: Date.now(),
      sent_at: new Date()
    });

    res.json({
      success: true,
      message: 'Contact sent successfully',
      data: {
        message: messageRecord.toJSON(),
        whatsapp_id: sent.key.id
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to send contact',
      error: error.message
    });
  }
};

/**
 * Send button message
 */
const sendButton = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { phone, text, buttons, footer } = req.body;

    if (!phone || !text || !buttons || !Array.isArray(buttons)) {
      return res.status(400).json({
        success: false,
        message: 'Phone, text, and buttons array are required'
      });
    }

    if (buttons.length > 3) {
      return res.status(400).json({
        success: false,
        message: 'Maximum 3 buttons allowed'
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

    // Get socket
    const sock = whatsappService.getSession(sessionId);
    if (!sock) {
      return res.status(400).json({
        success: false,
        message: 'Session socket not found'
      });
    }

    // Format phone number
    const jid = messageService.formatPhoneNumber(phone);

    // Send button message
    const sent = await sock.sendMessage(jid, {
      text,
      footer: footer || '',
      buttons: buttons.map((btn, idx) => ({
        buttonId: btn.id || `btn_${idx}`,
        buttonText: { displayText: btn.text },
        type: 1
      })),
      headerType: 1
    });

    // Save to database
    const messageRecord = await db.Message.create({
      session_id: session.id,
      message_id: sent.key.id,
      remote_jid: jid,
      from_me: true,
      type: 'button',
      content: JSON.stringify({ text, buttons, footer }),
      status: 'sent',
      timestamp: Date.now(),
      sent_at: new Date()
    });

    res.json({
      success: true,
      message: 'Button message sent successfully',
      data: {
        message: messageRecord.toJSON(),
        whatsapp_id: sent.key.id
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to send button message',
      error: error.message
    });
  }
};

/**
 * Send list message
 */
const sendList = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { phone, text, button_text, sections, footer } = req.body;

    if (!phone || !text || !button_text || !sections || !Array.isArray(sections)) {
      return res.status(400).json({
        success: false,
        message: 'Phone, text, button_text, and sections array are required'
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

    // Get socket
    const sock = whatsappService.getSession(sessionId);
    if (!sock) {
      return res.status(400).json({
        success: false,
        message: 'Session socket not found'
      });
    }

    // Format phone number
    const jid = messageService.formatPhoneNumber(phone);

    // Send list message
    const sent = await sock.sendMessage(jid, {
      text,
      footer: footer || '',
      title: text,
      buttonText: button_text,
      sections
    });

    // Save to database
    const messageRecord = await db.Message.create({
      session_id: session.id,
      message_id: sent.key.id,
      remote_jid: jid,
      from_me: true,
      type: 'list',
      content: JSON.stringify({ text, button_text, sections, footer }),
      status: 'sent',
      timestamp: Date.now(),
      sent_at: new Date()
    });

    res.json({
      success: true,
      message: 'List message sent successfully',
      data: {
        message: messageRecord.toJSON(),
        whatsapp_id: sent.key.id
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to send list message',
      error: error.message
    });
  }
};

/**
 * Send poll message
 */
const sendPoll = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { phone, name, options, selectable_count = 1 } = req.body;

    if (!phone || !name || !options || !Array.isArray(options)) {
      return res.status(400).json({
        success: false,
        message: 'Phone, name, and options array are required'
      });
    }

    if (options.length < 2 || options.length > 12) {
      return res.status(400).json({
        success: false,
        message: 'Poll must have between 2 and 12 options'
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

    // Get socket
    const sock = whatsappService.getSession(sessionId);
    if (!sock) {
      return res.status(400).json({
        success: false,
        message: 'Session socket not found'
      });
    }

    // Format phone number
    const jid = messageService.formatPhoneNumber(phone);

    // Send poll
    const sent = await sock.sendMessage(jid, {
      poll: {
        name,
        values: options,
        selectableCount: selectable_count
      }
    });

    // Save to database
    const messageRecord = await db.Message.create({
      session_id: session.id,
      message_id: sent.key.id,
      remote_jid: jid,
      from_me: true,
      type: 'poll',
      content: JSON.stringify({ name, options, selectable_count }),
      status: 'sent',
      timestamp: Date.now(),
      sent_at: new Date()
    });

    res.json({
      success: true,
      message: 'Poll sent successfully',
      data: {
        message: messageRecord.toJSON(),
        whatsapp_id: sent.key.id
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to send poll',
      error: error.message
    });
  }
};

/**
 * Reply to message
 */
const replyMessage = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { message_id, message } = req.body;

    if (!message_id || !message) {
      return res.status(400).json({
        success: false,
        message: 'Message ID and reply message are required'
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

    // Get socket
    const sock = whatsappService.getSession(sessionId);
    if (!sock) {
      return res.status(400).json({
        success: false,
        message: 'Session socket not found'
      });
    }

    // Get original message
    const originalMessage = await db.Message.findOne({
      where: { message_id }
    });

    if (!originalMessage) {
      return res.status(404).json({
        success: false,
        message: 'Original message not found'
      });
    }

    // Send reply
    const sent = await sock.sendMessage(originalMessage.remote_jid, {
      text: message
    }, {
      quoted: {
        key: {
          remoteJid: originalMessage.remote_jid,
          fromMe: originalMessage.from_me,
          id: message_id
        },
        message: { conversation: originalMessage.content }
      }
    });

    // Save to database
    const messageRecord = await db.Message.create({
      session_id: session.id,
      message_id: sent.key.id,
      remote_jid: originalMessage.remote_jid,
      from_me: true,
      type: 'text',
      content: message,
      quoted_message_id: message_id,
      status: 'sent',
      timestamp: Date.now(),
      sent_at: new Date()
    });

    res.json({
      success: true,
      message: 'Reply sent successfully',
      data: {
        message: messageRecord.toJSON(),
        whatsapp_id: sent.key.id
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to send reply',
      error: error.message
    });
  }
};

/**
 * Forward message
 */
const forwardMessage = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { message_id, recipients } = req.body;

    if (!message_id || !recipients || !Array.isArray(recipients)) {
      return res.status(400).json({
        success: false,
        message: 'Message ID and recipients array are required'
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

    // Get socket
    const sock = whatsappService.getSession(sessionId);
    if (!sock) {
      return res.status(400).json({
        success: false,
        message: 'Session socket not found'
      });
    }

    // Get original message
    const originalMessage = await db.Message.findOne({
      where: { message_id }
    });

    if (!originalMessage) {
      return res.status(404).json({
        success: false,
        message: 'Original message not found'
      });
    }

    // Forward to each recipient
    const results = [];
    for (const phone of recipients) {
      const jid = messageService.formatPhoneNumber(phone);
      
      const sent = await sock.sendMessage(jid, {
        forward: {
          key: {
            remoteJid: originalMessage.remote_jid,
            fromMe: originalMessage.from_me,
            id: message_id
          },
          message: { conversation: originalMessage.content }
        }
      });

      results.push({
        recipient: phone,
        message_id: sent.key.id,
        status: 'sent'
      });
    }

    res.json({
      success: true,
      message: `Message forwarded to ${recipients.length} recipients`,
      data: { results }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to forward message',
      error: error.message
    });
  }
};

/**
 * Delete message
 */
const deleteMessage = async (req, res) => {
  try {
    const { sessionId, messageId } = req.params;
    const { for_everyone = false } = req.body;

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

    // Get socket
    const sock = whatsappService.getSession(sessionId);
    if (!sock) {
      return res.status(400).json({
        success: false,
        message: 'Session socket not found'
      });
    }

    // Get message
    const message = await db.Message.findOne({
      where: { message_id: messageId }
    });

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    if (for_everyone) {
      // Delete for everyone
      await sock.sendMessage(message.remote_jid, { delete: {
        remoteJid: message.remote_jid,
        fromMe: message.from_me,
        id: messageId
      }});
    }

    // Update in database
    await message.update({ 
      status: 'deleted',
      deleted_at: new Date()
    });

    res.json({
      success: true,
      message: for_everyone ? 'Message deleted for everyone' : 'Message deleted'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete message',
      error: error.message
    });
  }
};

/**
 * React to message
 */
const reactMessage = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { message_id, emoji } = req.body;

    if (!message_id || !emoji) {
      return res.status(400).json({
        success: false,
        message: 'Message ID and emoji are required'
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

    // Get socket
    const sock = whatsappService.getSession(sessionId);
    if (!sock) {
      return res.status(400).json({
        success: false,
        message: 'Session socket not found'
      });
    }

    // Get message
    const message = await db.Message.findOne({
      where: { message_id }
    });

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    // Send reaction
    await sock.sendMessage(message.remote_jid, {
      react: {
        text: emoji,
        key: {
          remoteJid: message.remote_jid,
          fromMe: message.from_me,
          id: message_id
        }
      }
    });

    res.json({
      success: true,
      message: 'Reaction sent successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to send reaction',
      error: error.message
    });
  }
};

/**
 * Edit message
 */
const editMessage = async (req, res) => {
  try {
    const { sessionId, messageId } = req.params;
    const { new_text } = req.body;

    if (!new_text) {
      return res.status(400).json({
        success: false,
        message: 'New text is required'
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

    // Get socket
    const sock = whatsappService.getSession(sessionId);
    if (!sock) {
      return res.status(400).json({
        success: false,
        message: 'Session socket not found'
      });
    }

    // Get message
    const message = await db.Message.findOne({
      where: { message_id: messageId }
    });

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    // Check if message is editable (within 15 minutes)
    const fifteenMinutes = 15 * 60 * 1000;
    if (Date.now() - message.timestamp > fifteenMinutes) {
      return res.status(400).json({
        success: false,
        message: 'Message can only be edited within 15 minutes'
      });
    }

    // Edit message
    await sock.sendMessage(message.remote_jid, {
      text: new_text,
      edit: {
        remoteJid: message.remote_jid,
        fromMe: true,
        id: messageId
      }
    });

    // Update in database
    await message.update({
      content: new_text,
      edited: true,
      edited_at: new Date()
    });

    res.json({
      success: true,
      message: 'Message edited successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to edit message',
      error: error.message
    });
  }
};

module.exports = {
  sendTextMessage,
  sendMediaMessage,
  getMessages,
  checkNumber,
  sendLocation,
  sendContact,
  sendButton,
  sendList,
  sendPoll,
  replyMessage,
  forwardMessage,
  deleteMessage,
  reactMessage,
  editMessage
};
