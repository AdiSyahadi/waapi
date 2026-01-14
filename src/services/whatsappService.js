const makeWASocket = require('@whiskeysockets/baileys').default;
const { useMultiFileAuthState, DisconnectReason, delay } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const pino = require('pino');
const fs = require('fs');
const path = require('path');
const QRCode = require('qrcode');
const db = require('../models');
const { logger, logWhatsApp } = require('../config/logger');
const { addMessageJob } = require('../config/queue');

class WhatsAppService {
  constructor() {
    this.sessions = new Map();
  }

  /**
   * Create a Baileys-compatible logger with all required methods
   * Uses pino with level 'trace' but outputs to null/disabled transport
   */
  createBaileysLogger() {
    // Create a pino logger with trace level but effectively silent
    // This ensures all methods exist (trace, debug, info, etc.)
    const baileysLog = pino({ 
      level: 'trace',
      enabled: false // This disables all output while keeping methods available
    });
    return baileysLog;
  }

  /**
   * Get auth state path for session
   */
  getAuthPath(sessionId) {
    const authPath = path.join(__dirname, '../../sessions', sessionId);
    if (!fs.existsSync(authPath)) {
      fs.mkdirSync(authPath, { recursive: true });
    }
    return authPath;
  }

  /**
   * Create new WhatsApp session
   */
  async createSession(sessionId, sessionRecord, usePairing = false, phoneNumber = null) {
    let sock = null;
    try {
      logger.info(`[createSession] Starting for ${sessionId}, pairing=${usePairing}`);
      
      if (this.sessions.has(sessionId)) {
        throw new Error('Session already exists');
      }

      const authPath = this.getAuthPath(sessionId);
      logger.info(`[createSession] Auth path: ${authPath}`);
      
      const { state, saveCreds } = await useMultiFileAuthState(authPath);
      logger.info(`[createSession] Auth state loaded`);

      logger.info(`[createSession] Creating WASocket...`);
      try {
        // Use the properly configured Baileys logger
        sock = makeWASocket({
          auth: state,
          printQRInTerminal: false,
          logger: this.createBaileysLogger(),
          browser: ['WhatsApp API', 'Chrome', '1.0.0'],
          connectTimeoutMs: 60000,
          keepAliveIntervalMs: 30000,
          defaultQueryTimeoutMs: 60000,
          // Enable history sync to receive past messages
          syncFullHistory: true,
          // CRITICAL FIX: Properly implement getMessage to return stored messages
          // This is called by Baileys to decrypt messages from history
          getMessage: async (key) => {
            try {
              // Try to find message in database by message_id
              const storedMsg = await db.Message.findOne({
                where: { message_id: key.id },
                attributes: ['content', 'type', 'metadata']
              });
              
              if (storedMsg) {
                // Check if we have raw message stored in metadata
                if (storedMsg.metadata?.raw_message) {
                  return storedMsg.metadata.raw_message;
                }
                // Fallback: return content as conversation
                if (storedMsg.content) {
                  return { conversation: storedMsg.content };
                }
              }
              
              // Return undefined to let Baileys know message not found
              // This is better than returning empty object
              return undefined;
            } catch (e) {
              logger.error(`[getMessage] Error fetching message ${key.id}:`, e.message);
              return undefined;
            }
          }
        });
        logger.info(`[createSession] WASocket created successfully`);
      } catch (sockError) {
        logger.error(`[createSession] SOCKET CREATION ERROR:`, sockError);
        throw sockError;
      }
      
      logger.info(`[createSession] Socket created`);

      this.sessions.set(sessionId, {
        socket: sock,
        sessionRecord,
        qrRetries: 0,
        isConnecting: true,
        usePairing,
        phoneNumber
      });
      
      logger.info(`[createSession] Session stored in map`);

      // Setup event handlers first (before pairing)
      this.setupEventHandlers(sessionId, sock, saveCreds, sessionRecord);
      logger.info(`[createSession] Event handlers setup`);

      // If using pairing code, request it asynchronously
      if (usePairing && phoneNumber) {
        logger.info(`[createSession] Requesting pairing code`);
        // Don't await - let it run in background
        this.requestPairingCode(sessionId, sock, phoneNumber, sessionRecord).catch(err => {
          logger.error(`Pairing code request failed for ${sessionId}:`, err);
        });
      }

      logger.info(`[createSession] Completed successfully for ${sessionId}`);
      return sock;
    } catch (error) {
      logger.error(`[createSession] FATAL ERROR for ${sessionId}:`, error);
      logger.error(`[createSession] Error stack:`, error.stack);
      
      // Clean up on failure
      try {
        if (sock) {
          logger.info(`[createSession] Closing socket...`);
          sock.end();
        }
      } catch (e) {
        logger.error(`[createSession] Failed to end socket:`, e);
      }
      
      try {
        this.sessions.delete(sessionId);
        logger.info(`[createSession] Session removed from map`);
      } catch (e) {
        logger.error(`[createSession] Failed to delete session:`, e);
      }
      
      try {
        await sessionRecord.update({ status: 'failed' });
        logger.info(`[createSession] Session status updated to failed`);
      } catch (e) {
        logger.error(`[createSession] Failed to update session status:`, e);
      }
      
      throw error;
    }
  }

  /**
   * Request pairing code
   */
  async requestPairingCode(sessionId, sock, phoneNumber, sessionRecord) {
    try {
      // Remove non-numeric characters
      const cleanPhone = phoneNumber.replace(/\D/g, '');
      
      // Request pairing code
      const code = await sock.requestPairingCode(cleanPhone);
      
      logWhatsApp(sessionId, 'pairing_requested', { phone: cleanPhone, code });

      await sessionRecord.update({
        pairing_code: code,
        status: 'pairing',
        phone_number: cleanPhone
      });

      // Trigger webhook
      await this.triggerWebhook(sessionRecord, 'pairing.code_generated', {
        code,
        phone: cleanPhone
      });

      logger.info(`Pairing code requested for ${sessionId}: ${code}`);
      return code;
    } catch (error) {
      logger.error(`Failed to request pairing code for ${sessionId}:`, error);
      throw error;
    }
  }

  /**
   * Setup event handlers for WhatsApp socket
   */
  setupEventHandlers(sessionId, sock, saveCreds, sessionRecord) {
    // Connection updates
    sock.ev.on('connection.update', async (update) => {
      try {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
          // QR code received
          await this.handleQRCode(sessionId, qr, sessionRecord);
        }

        if (connection === 'close') {
          await this.handleDisconnection(sessionId, lastDisconnect, sessionRecord);
        } else if (connection === 'open') {
          await this.handleConnection(sessionId, sock, sessionRecord);
        }
      } catch (error) {
        logger.error(`Connection update handler error for ${sessionId}:`, error);
      }
    });

    // Credentials update
    sock.ev.on('creds.update', async () => {
      try {
        await saveCreds();
      } catch (error) {
        logger.error(`Creds update error for ${sessionId}:`, error);
      }
    });

    // Messages
    sock.ev.on('messages.upsert', async (m) => {
      try {
        await this.handleMessages(sessionId, m, sessionRecord);
      } catch (error) {
        logger.error(`Message upsert handler error for ${sessionId}:`, error);
      }
    });

    // Message updates (read, delivered, etc)
    sock.ev.on('messages.update', async (updates) => {
      try {
        await this.handleMessageUpdates(sessionId, updates, sessionRecord);
      } catch (error) {
        logger.error(`Message update handler error for ${sessionId}:`, error);
      }
    });

    // Presence updates (typing, online status)
    sock.ev.on('presence.update', async (presence) => {
      try {
        await this.handlePresenceUpdate(sessionId, presence, sessionRecord);
      } catch (error) {
        logger.error(`Presence update handler error for ${sessionId}:`, error);
      }
    });

    // CRITICAL FIX: Handle history sync to import past messages
    // This event fires when WhatsApp syncs chat history after connection
    sock.ev.on('messaging-history.set', async ({ messages, chats, isLatest }) => {
      try {
        logger.info(`[${sessionId}] History sync: ${messages?.length || 0} messages, ${chats?.length || 0} chats, isLatest: ${isLatest}`);
        await this.handleHistorySync(sessionId, messages, chats, sessionRecord);
      } catch (error) {
        logger.error(`History sync handler error for ${sessionId}:`, error);
      }
    });

    // Handle chat updates (for metadata like unread count, archive status)
    sock.ev.on('chats.update', async (updates) => {
      try {
        await this.handleChatUpdates(sessionId, updates, sessionRecord);
      } catch (error) {
        logger.error(`Chat update handler error for ${sessionId}:`, error);
      }
    });

    // Handle new chats
    sock.ev.on('chats.upsert', async (chats) => {
      try {
        await this.handleNewChats(sessionId, chats, sessionRecord);
      } catch (error) {
        logger.error(`Chat upsert handler error for ${sessionId}:`, error);
      }
    });
  }

  /**
   * Handle QR code generation
   */
  async handleQRCode(sessionId, qr, sessionRecord) {
    try {
      logWhatsApp(sessionId, 'qr_generated', { attempt: this.sessions.get(sessionId)?.qrRetries || 0 });

      // Convert QR string to data URL image
      const qrDataUrl = await QRCode.toDataURL(qr, {
        width: 256,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      });

      await sessionRecord.update({
        qr_code: qrDataUrl,
        status: 'qr',
        reconnect_attempts: (this.sessions.get(sessionId)?.qrRetries || 0) + 1
      });

      if (this.sessions.has(sessionId)) {
        this.sessions.get(sessionId).qrRetries += 1;
      }

      // Trigger webhook for QR (non-blocking)
      this.triggerWebhook(sessionRecord, 'qr.generated', { qr: qrDataUrl }).catch(err => {
        logger.error(`Webhook trigger failed for ${sessionId}:`, err);
      });
    } catch (error) {
      logger.error(`QR handler error for ${sessionId}:`, error);
    }
  }

  /**
   * Handle successful connection
   */
  async handleConnection(sessionId, sock, sessionRecord) {
    try {
      const user = sock.user;
      logWhatsApp(sessionId, 'connected', { phone: user.id });

      await sessionRecord.update({
        status: 'connected',
        phone_number: user.id.split(':')[0],
        qr_code: null,
        last_connected_at: new Date(),
        reconnect_attempts: 0
      });

      if (this.sessions.has(sessionId)) {
        this.sessions.get(sessionId).isConnecting = false;
      }

      // Trigger webhook (non-blocking)
      this.triggerWebhook(sessionRecord, 'session.connected', {
        phone: user.id,
        name: user.name
      }).catch(err => {
        logger.error(`Webhook trigger failed for ${sessionId}:`, err);
      });

      logger.info(`Session ${sessionId} connected successfully`);
    } catch (error) {
      logger.error(`Connection handler error for ${sessionId}:`, error);
    }
  }

  /**
   * Handle disconnection
   */
  async handleDisconnection(sessionId, lastDisconnect, sessionRecord) {
    try {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

      logWhatsApp(sessionId, 'disconnected', {
        statusCode,
        shouldReconnect,
        reason: lastDisconnect?.error?.message
      });

      await sessionRecord.update({
        status: shouldReconnect ? 'disconnected' : 'failed',
        last_disconnected_at: new Date()
      });

      // Remove session from memory
      this.sessions.delete(sessionId);

      // Auto reconnect if enabled
      if (shouldReconnect && sessionRecord.auto_reconnect) {
        if (sessionRecord.reconnect_attempts < (process.env.MAX_RECONNECT_ATTEMPTS || 5)) {
          setTimeout(() => {
            this.reconnectSession(sessionId, sessionRecord).catch(err => {
              logger.error(`Reconnect failed for ${sessionId}:`, err);
            });
          }, parseInt(process.env.RECONNECT_INTERVAL) || 5000);
        } else {
          logger.warn(`Max reconnect attempts reached for ${sessionId}`);
          await sessionRecord.update({ status: 'failed' }).catch(() => {});
        }
      }

      // Trigger webhook (non-blocking)
      this.triggerWebhook(sessionRecord, 'session.disconnected', {
        statusCode,
        shouldReconnect,
        reason: lastDisconnect?.error?.message
      }).catch(err => {
        logger.error(`Webhook trigger failed for ${sessionId}:`, err);
      });
    } catch (error) {
      logger.error(`Disconnection handler error for ${sessionId}:`, error);
    }
  }

  /**
   * Handle incoming messages
   */
  async handleMessages(sessionId, messageUpdate, sessionRecord) {
    try {
      const { messages, type } = messageUpdate;

      for (const msg of messages) {
        if (!msg.message) continue;

        const messageData = {
          session_id: sessionRecord.id,
          message_id: msg.key.id,
          remote_jid: msg.key.remoteJid,
          from_me: msg.key.fromMe,
          timestamp: parseInt(msg.messageTimestamp),
          type: this.getMessageType(msg.message),
          content: this.extractMessageContent(msg.message),
          status: 'delivered',
          metadata: {
            raw_message: msg.message,
            push_name: msg.pushName,
            message_timestamp: msg.messageTimestamp,
            broadcast: msg.broadcast || false,
            participant: msg.participant || null
          }
        };

        // Save to database with upsert to prevent duplicates
        await db.Message.upsert(messageData, {
          conflictFields: ['message_id', 'session_id']
        });

        logWhatsApp(sessionId, 'message_received', {
          from: msg.key.remoteJid,
          type: messageData.type
        });

        // Trigger webhook
        await this.triggerWebhook(sessionRecord, 'message.received', {
          message: messageData,
          raw: msg
        });

        // Fix #5: Auto-update contact.last_message_at
        if (!msg.key.remoteJid.endsWith('@g.us')) {
          const phone = msg.key.remoteJid.split('@')[0];
          await db.Contact.update(
            {
              last_message_at: new Date(),
              push_name: msg.pushName || undefined // Update push_name if available
            },
            {
              where: {
                session_id: sessionRecord.id,
                phone: phone
              }
            }
          ).catch(err => {
            // Silently fail if contact doesn't exist
            logger.debug(`Contact update skipped for ${phone}:`, err.message);
          });
        }

        // Fix #7: Update persistent Chat record (unread count, last message)
        try {
          if (!msg.key.fromMe) {
            // Incoming message - increment unread count
            await db.Chat.getOrCreate(sessionRecord.id, msg.key.remoteJid, {
              name: msg.pushName
            });
            await db.Chat.incrementUnread(sessionRecord.id, msg.key.remoteJid);
          }
          
          // Update last message for both incoming and outgoing
          await db.Chat.updateLastMessage(sessionRecord.id, msg.key.remoteJid, messageData);
        } catch (chatErr) {
          logger.debug('Chat update error:', chatErr.message);
        }

        // Fix #8: Track conversation metrics for SLA
        try {
          if (!msg.key.fromMe) {
            // Customer message - start or update conversation
            await db.ConversationMetrics.recordCustomerMessage(
              sessionRecord.id,
              msg.key.remoteJid
            );
          }
        } catch (metricsErr) {
          logger.debug('Metrics update error:', metricsErr.message);
        }
      }
    } catch (error) {
      logger.error(`Message handler error for ${sessionId}:`, error);
    }
  }

  /**
   * Handle message updates (status changes)
   * Now triggers webhooks for: message.sent, message.delivered, message.read, message.failed
   */
  async handleMessageUpdates(sessionId, updates, sessionRecord) {
    try {
      for (const update of updates) {
        const status = update.update.status;
        const mappedStatus = this.mapMessageStatus(status);
        
        // Update message in database
        const [affectedRows] = await db.Message.update(
          {
            status: mappedStatus,
            [`${mappedStatus}_at`]: new Date()
          },
          {
            where: { message_id: update.key.id }
          }
        );

        // Trigger webhook for status change
        if (affectedRows > 0) {
          // Get the updated message for webhook payload
          const message = await db.Message.findOne({
            where: { message_id: update.key.id }
          });

          if (message) {
            // Trigger appropriate webhook event based on status
            const webhookEvent = `message.${mappedStatus}`;
            await this.triggerWebhook(sessionRecord, webhookEvent, {
              messageId: update.key.id,
              remoteJid: update.key.remoteJid,
              status: mappedStatus,
              timestamp: new Date().toISOString(),
              message: {
                id: message.message_id,
                content: message.content,
                type: message.type,
                fromMe: message.from_me,
                remoteJid: message.remote_jid
              }
            });

            logWhatsApp(sessionId, `message_${mappedStatus}`, {
              messageId: update.key.id,
              remoteJid: update.key.remoteJid
            });
          }
        }
      }
    } catch (error) {
      logger.error(`Message update handler error for ${sessionId}:`, error);
    }
  }

  /**
   * Handle presence updates (typing indicators, online status)
   * Fix #1: Add typing webhook event
   */
  async handlePresenceUpdate(sessionId, presence, sessionRecord) {
    try {
      const { id: jid, presences } = presence;
      
      if (!presences) return;

      for (const [participantJid, presenceData] of Object.entries(presences)) {
        const { lastKnownPresence } = presenceData;
        
        // Map presence to event type
        let eventType = null;
        if (lastKnownPresence === 'composing') {
          eventType = 'chat.typing';
        } else if (lastKnownPresence === 'recording') {
          eventType = 'chat.recording';
        } else if (lastKnownPresence === 'available') {
          eventType = 'contact.online';
        } else if (lastKnownPresence === 'unavailable') {
          eventType = 'contact.offline';
        }

        if (eventType) {
          await this.triggerWebhook(sessionRecord, eventType, {
            jid: jid,
            participant: participantJid,
            presence: lastKnownPresence,
            timestamp: new Date().toISOString()
          });

          logWhatsApp(sessionId, eventType, {
            jid,
            participant: participantJid,
            presence: lastKnownPresence
          });
        }
      }
    } catch (error) {
      logger.error(`Presence update handler error for ${sessionId}:`, error);
    }
  }

  /**
   * CRITICAL FIX: Handle history sync from WhatsApp
   * This imports messages from chat history when session connects
   */
  async handleHistorySync(sessionId, messages, chats, sessionRecord) {
    try {
      const startTime = Date.now();
      let importedCount = 0;
      let errorCount = 0;

      // Process messages in batches to avoid overwhelming the database
      const batchSize = 100;
      
      if (messages && messages.length > 0) {
        logger.info(`[${sessionId}] Starting history import: ${messages.length} messages`);
        
        for (let i = 0; i < messages.length; i += batchSize) {
          const batch = messages.slice(i, i + batchSize);
          
          await Promise.all(batch.map(async (msg) => {
            try {
              if (!msg.message) return;
              
              const messageData = {
                session_id: sessionRecord.id,
                message_id: msg.key.id,
                remote_jid: msg.key.remoteJid,
                from_me: msg.key.fromMe || false,
                timestamp: parseInt(msg.messageTimestamp) || Date.now(),
                type: this.getMessageType(msg.message),
                content: this.extractMessageContent(msg.message),
                status: msg.key.fromMe ? 'sent' : 'delivered',
                metadata: {
                  // Store raw message for getMessage callback (CRITICAL!)
                  raw_message: msg.message,
                  push_name: msg.pushName,
                  message_timestamp: msg.messageTimestamp,
                  broadcast: msg.broadcast || false,
                  participant: msg.participant || null,
                  is_history: true
                }
              };

              // Upsert to avoid duplicates
              await db.Message.upsert(messageData, {
                conflictFields: ['message_id', 'session_id']
              });
              
              importedCount++;
            } catch (msgErr) {
              errorCount++;
              logger.debug(`[${sessionId}] Failed to import message ${msg.key?.id}:`, msgErr.message);
            }
          }));
          
          // Log progress for large imports
          if (messages.length > 500 && (i + batchSize) % 500 === 0) {
            logger.info(`[${sessionId}] History import progress: ${Math.min(i + batchSize, messages.length)}/${messages.length}`);
          }
        }
      }

      // Process chats for persistent Chat table
      if (chats && chats.length > 0) {
        for (const chat of chats) {
          try {
            const isGroup = chat.id?.endsWith('@g.us');
            const phone = isGroup ? null : chat.id?.split('@')[0];
            
            await db.Chat.upsert({
              session_id: sessionRecord.id,
              jid: chat.id,
              name: chat.name || chat.pushName || phone || 'Unknown',
              phone: phone,
              is_group: isGroup,
              unread_count: chat.unreadCount || 0,
              is_archived: chat.archived || false,
              is_pinned: chat.pinned ? true : false,
              is_muted: chat.mute ? true : false,
              last_message_at: chat.conversationTimestamp 
                ? new Date(parseInt(chat.conversationTimestamp) * 1000) 
                : new Date()
            }, {
              conflictFields: ['session_id', 'jid']
            });
          } catch (chatErr) {
            logger.debug(`[${sessionId}] Failed to import chat ${chat.id}:`, chatErr.message);
          }
        }
      }

      const duration = Date.now() - startTime;
      logger.info(`[${sessionId}] History sync completed: ${importedCount} messages, ${chats?.length || 0} chats in ${duration}ms (${errorCount} errors)`);

      // Trigger webhook for history sync complete
      await this.triggerWebhook(sessionRecord, 'history.synced', {
        messagesImported: importedCount,
        chatsImported: chats?.length || 0,
        errors: errorCount,
        durationMs: duration
      });

    } catch (error) {
      logger.error(`[${sessionId}] History sync error:`, error);
    }
  }

  /**
   * Handle chat updates (unread count, archive, pin, mute)
   */
  async handleChatUpdates(sessionId, updates, sessionRecord) {
    try {
      for (const update of updates) {
        const updateData = {};
        
        if (update.unreadCount !== undefined) {
          updateData.unread_count = update.unreadCount;
        }
        if (update.archived !== undefined) {
          updateData.is_archived = update.archived;
        }
        if (update.pinned !== undefined) {
          updateData.is_pinned = update.pinned ? true : false;
        }
        if (update.mute !== undefined) {
          updateData.is_muted = update.mute ? true : false;
        }
        if (update.conversationTimestamp) {
          updateData.last_message_at = new Date(parseInt(update.conversationTimestamp) * 1000);
        }
        
        if (Object.keys(updateData).length > 0) {
          await db.Chat.update(updateData, {
            where: {
              session_id: sessionRecord.id,
              jid: update.id
            }
          });
        }
      }
    } catch (error) {
      logger.error(`[${sessionId}] Chat update handler error:`, error);
    }
  }

  /**
   * Handle new chats
   */
  async handleNewChats(sessionId, chats, sessionRecord) {
    try {
      for (const chat of chats) {
        const isGroup = chat.id?.endsWith('@g.us');
        const phone = isGroup ? null : chat.id?.split('@')[0];
        
        await db.Chat.upsert({
          session_id: sessionRecord.id,
          jid: chat.id,
          name: chat.name || chat.pushName || phone || 'Unknown',
          phone: phone,
          is_group: isGroup,
          unread_count: chat.unreadCount || 0,
          is_archived: chat.archived || false,
          is_pinned: chat.pinned ? true : false,
          is_muted: chat.mute ? true : false,
          last_message_at: chat.conversationTimestamp 
            ? new Date(parseInt(chat.conversationTimestamp) * 1000) 
            : new Date()
        }, {
          conflictFields: ['session_id', 'jid']
        });
      }
    } catch (error) {
      logger.error(`[${sessionId}] New chat handler error:`, error);
    }
  }

  /**
   * Get message type from message object
   */
  getMessageType(message) {
    if (message.conversation || message.extendedTextMessage) return 'text';
    if (message.imageMessage) return 'image';
    if (message.videoMessage) return 'video';
    if (message.audioMessage) return 'audio';
    if (message.documentMessage) return 'document';
    if (message.stickerMessage) return 'sticker';
    if (message.locationMessage || message.liveLocationMessage) return 'location';
    if (message.contactMessage || message.contactsArrayMessage) return 'contact';
    if (message.buttonsResponseMessage) return 'button_response';
    if (message.listResponseMessage) return 'list_response';
    if (message.templateButtonReplyMessage) return 'template_reply';
    if (message.productMessage) return 'product';
    if (message.orderMessage) return 'order';
    if (message.invoiceMessage) return 'invoice';
    if (message.pollCreationMessage) return 'poll';
    if (message.pollUpdateMessage) return 'poll_update';
    if (message.reactionMessage) return 'reaction';
    if (message.viewOnceMessage) return 'view_once';
    if (message.ephemeralMessage) return this.getMessageType(message.ephemeralMessage.message || {});
    if (message.protocolMessage) return 'protocol';
    return 'text';
  }

  /**
   * Extract message content
   */
  extractMessageContent(message) {
    // Extract text from various message types
    if (message.conversation) {
      return message.conversation;
    }
    
    if (message.extendedTextMessage?.text) {
      return message.extendedTextMessage.text;
    }
    
    // Image with caption
    if (message.imageMessage?.caption) {
      return message.imageMessage.caption;
    }
    
    // Video with caption
    if (message.videoMessage?.caption) {
      return message.videoMessage.caption;
    }
    
    // Document with caption
    if (message.documentMessage?.caption) {
      return message.documentMessage.caption;
    }
    
    // Audio message (no text content, return empty)
    if (message.audioMessage) {
      return '';
    }
    
    // Sticker (no text content)
    if (message.stickerMessage) {
      return '';
    }
    
    // Location message
    if (message.locationMessage) {
      const loc = message.locationMessage;
      return loc.name || loc.address || `Location: ${loc.degreesLatitude},${loc.degreesLongitude}`;
    }
    
    // Contact message
    if (message.contactMessage) {
      return message.contactMessage.displayName || message.contactMessage.vcard || 'Contact';
    }
    
    // Contact array
    if (message.contactsArrayMessage) {
      return `${message.contactsArrayMessage.contacts?.length || 0} contacts`;
    }
    
    // Button response
    if (message.buttonsResponseMessage) {
      return message.buttonsResponseMessage.selectedDisplayText || message.buttonsResponseMessage.selectedButtonId || '';
    }
    
    // List response
    if (message.listResponseMessage) {
      return message.listResponseMessage.title || message.listResponseMessage.singleSelectReply?.selectedRowId || '';
    }
    
    // Template button reply
    if (message.templateButtonReplyMessage) {
      return message.templateButtonReplyMessage.selectedDisplayText || message.templateButtonReplyMessage.selectedId || '';
    }
    
    // Live location
    if (message.liveLocationMessage) {
      const loc = message.liveLocationMessage;
      return `Live Location: ${loc.degreesLatitude},${loc.degreesLongitude}`;
    }
    
    // Product message
    if (message.productMessage) {
      return message.productMessage.product?.title || 'Product';
    }
    
    // Order message
    if (message.orderMessage) {
      return `Order: ${message.orderMessage.itemCount || 0} items`;
    }
    
    // Invoice message
    if (message.invoiceMessage) {
      return message.invoiceMessage.note || 'Invoice';
    }
    
    // Poll creation
    if (message.pollCreationMessage) {
      return message.pollCreationMessage.name || 'Poll';
    }
    
    // Poll update
    if (message.pollUpdateMessage) {
      return 'Poll vote';
    }
    
    // Reaction
    if (message.reactionMessage) {
      return message.reactionMessage.text || '(reaction)';
    }
    
    // View once message
    if (message.viewOnceMessage) {
      return this.extractMessageContent(message.viewOnceMessage.message || {});
    }
    
    // Ephemeral message
    if (message.ephemeralMessage) {
      return this.extractMessageContent(message.ephemeralMessage.message || {});
    }
    
    // Protocol message (usually system messages)
    if (message.protocolMessage) {
      const types = {
        0: 'Message deleted',
        1: 'Message revoked',
        2: 'Ephemeral setting changed',
        3: 'Ephemeral sync response',
        4: 'History sync notification',
        5: 'App state sync key share',
        6: 'App state sync key request',
        7: 'Message edit'
      };
      return types[message.protocolMessage.type] || 'System message';
    }
    
    return '';
  }

  /**
   * Map Baileys status to our status
   */
  mapMessageStatus(status) {
    const statusMap = {
      0: 'pending',
      1: 'sent',
      2: 'delivered',
      3: 'read',
      4: 'failed'
    };
    return statusMap[status] || 'pending';
  }

  /**
   * Reconnect session
   */
  async reconnectSession(sessionId, sessionRecord) {
    try {
      logger.info(`Attempting to reconnect session ${sessionId}`);
      
      await sessionRecord.update({
        reconnect_attempts: sessionRecord.reconnect_attempts + 1
      });

      await this.createSession(sessionId, sessionRecord);
    } catch (error) {
      logger.error(`Failed to reconnect session ${sessionId}:`, error);
    }
  }

  /**
   * Trigger webhook
   */
  async triggerWebhook(sessionRecord, event, data) {
    // Don't block on webhook execution - add timeout
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Webhook timeout')), 5000)
    );

    try {
      // Get webhooks for this session with timeout
      const webhooks = await Promise.race([
        db.Webhook.findAll({
          where: {
            session_id: sessionRecord.id,
            status: 'active'
          }
        }),
        timeoutPromise
      ]);

      for (const webhook of webhooks) {
        if (webhook.events.includes(event) || webhook.events.includes('*')) {
          // Add to webhook queue (non-blocking)
          addMessageJob({
            webhookId: webhook.id,
            event,
            data
          }).catch(err => {
            logger.error('Webhook queue error:', err);
          });
        }
      }
    } catch (error) {
      // Don't throw - just log
      if (error.message !== 'Webhook timeout') {
        logger.error('Webhook trigger error:', error);
      }
    }
  }

  /**
   * Get session socket
   */
  getSession(sessionId) {
    const session = this.sessions.get(sessionId);
    return session?.socket;
  }

  /**
   * Check if session exists and is connected
   */
  isSessionConnected(sessionId) {
    const session = this.sessions.get(sessionId);
    return session && !session.isConnecting;
  }

  /**
   * Disconnect session
   */
  async disconnectSession(sessionId) {
    try {
      const session = this.sessions.get(sessionId);
      if (session) {
        await session.socket.logout();
        this.sessions.delete(sessionId);
        logger.info(`Session ${sessionId} disconnected`);
      }
    } catch (error) {
      logger.error(`Failed to disconnect session ${sessionId}:`, error);
      throw error;
    }
  }

  /**
   * Cleanup session from map without logout (for reconnect)
   */
  async cleanupSession(sessionId) {
    try {
      const session = this.sessions.get(sessionId);
      if (session) {
        // Try to close socket gracefully without logout
        try {
          if (session.socket) {
            session.socket.end();
          }
        } catch (e) {
          logger.warn(`Socket end failed for ${sessionId}:`, e.message);
        }
        this.sessions.delete(sessionId);
        logger.info(`Session ${sessionId} cleaned up for reconnect`);
      }
    } catch (error) {
      logger.error(`Failed to cleanup session ${sessionId}:`, error);
      // Don't throw - cleanup is best effort
    }
  }

  /**
   * Delete session completely
   */
  async deleteSession(sessionId) {
    try {
      await this.disconnectSession(sessionId);
      
      // Delete auth files
      const authPath = this.getAuthPath(sessionId);
      if (fs.existsSync(authPath)) {
        fs.rmSync(authPath, { recursive: true, force: true });
      }
      
      logger.info(`Session ${sessionId} deleted`);
    } catch (error) {
      logger.error(`Failed to delete session ${sessionId}:`, error);
      throw error;
    }
  }

  /**
   * Fetch all chats/conversations from WhatsApp
   */
  /**
   * Fetch all chats from WhatsApp
   * Note: Baileys v7 doesn't have built-in store, so we'll fetch from database
   * and update with live data when available
   */
  async fetchChats(sessionId, options = {}) {
    try {
      const session = this.sessions.get(sessionId);
      if (!session || !session.socket) {
        throw new Error('Session not found or not connected');
      }

      const sock = session.socket;
      
      // Baileys v7 doesn't provide a direct way to get all chats
      // We'll need to fetch from database and enhance with live data
      // For now, return data from our database
      
      const { Message } = db;
      
      // Get unique chat IDs from database
      const messages = await Message.findAll({
        where: { 
          session_id: session.sessionRecord.id 
        },
        attributes: [
          'remote_jid',
          [db.Sequelize.fn('MAX', db.Sequelize.col('timestamp')), 'last_timestamp'],
          [db.Sequelize.fn('COUNT', db.Sequelize.col('id')), 'message_count']
        ],
        group: ['remote_jid'],
        order: [[db.Sequelize.literal('last_timestamp'), 'DESC']],
        raw: true
      });

      // Get last message for each chat
      const chatsWithLastMessage = await Promise.all(
        messages.map(async (chat) => {
          const lastMessage = await Message.findOne({
            where: {
              session_id: session.sessionRecord.id,
              remote_jid: chat.remote_jid
            },
            order: [['timestamp', 'DESC']]
          });

          const isGroup = chat.remote_jid.endsWith('@g.us');
          const phone = isGroup ? null : chat.remote_jid.split('@')[0];

          return {
            id: chat.remote_jid,
            name: phone || 'Unknown', // We don't store names in DB yet
            phone: phone,
            lastMessage: lastMessage ? {
              id: lastMessage.message_id,
              body: lastMessage.content,
              timestamp: lastMessage.timestamp instanceof Date ? lastMessage.timestamp.getTime() : lastMessage.timestamp,
              timestampISO: lastMessage.timestamp instanceof Date ? lastMessage.timestamp.toISOString() : new Date(lastMessage.timestamp).toISOString(),
              fromMe: lastMessage.from_me,
              type: lastMessage.type,
              status: lastMessage.status
            } : null,
            unreadCount: 0, // Not tracked in database
            isGroup: isGroup,
            profilePicUrl: null,
            timestamp: new Date(chat.last_timestamp).getTime(),
            archived: false,
            pinned: false,
            muted: false,
            messageCount: parseInt(chat.message_count)
          };
        })
      );

      let filteredChats = chatsWithLastMessage;

      // Apply filters
      if (options.filter === 'groups') {
        filteredChats = filteredChats.filter(chat => chat.isGroup);
      } else if (options.filter === 'personal') {
        filteredChats = filteredChats.filter(chat => !chat.isGroup);
      }

      // Search by name or phone
      if (options.search) {
        const searchLower = options.search.toLowerCase();
        filteredChats = filteredChats.filter(chat => 
          (chat.name || '').toLowerCase().includes(searchLower) ||
          (chat.phone || '').includes(options.search)
        );
      }

      // Pagination
      const limit = parseInt(options.limit) || 50;
      const offset = parseInt(options.offset) || 0;
      const hasMore = filteredChats.length > (offset + limit);
      const paginatedChats = filteredChats.slice(offset, offset + limit);

      return {
        chats: paginatedChats,
        count: paginatedChats.length,
        total: filteredChats.length,
        hasMore
      };
    } catch (error) {
      logger.error(`Failed to fetch chats for ${sessionId}:`, error);
      throw error;
    }
  }

  /**
   * Fetch messages from specific chat
   */
  async fetchChatMessages(sessionId, chatId, options = {}) {
    try {
      const session = this.sessions.get(sessionId);
      if (!session || !session.socket) {
        throw new Error('Session not found or not connected');
      }

      const { Message } = db;
      const limit = parseInt(options.limit) || 50;
      const offset = parseInt(options.offset) || 0;

      // Build where clause
      const where = {
        session_id: session.sessionRecord.id,
        remote_jid: chatId
      };

      // Apply filters
      if (options.type) {
        where.type = options.type;
      }

      if (options.fromMe !== undefined) {
        where.from_me = options.fromMe === 'true' || options.fromMe === true;
      }

      // Fetch messages from database
      const messages = await Message.findAll({
        where,
        order: [['timestamp', 'DESC']],
        limit,
        offset
      });

      // Count total
      const total = await Message.count({ where });

      // Format messages with pushName from metadata
      const formattedMessages = messages.map(msg => {
        const metadata = msg.metadata || {};
        return {
          id: msg.message_id,
          remoteJid: msg.remote_jid,
          fromMe: msg.from_me,
          timestamp: msg.timestamp instanceof Date ? msg.timestamp.getTime() : msg.timestamp,
          timestampISO: msg.timestamp instanceof Date ? msg.timestamp.toISOString() : new Date(msg.timestamp).toISOString(),
          pushName: metadata.push_name || null,
          status: msg.status,
          type: msg.type,
          body: msg.content,
          hasMedia: ['image', 'video', 'audio', 'document', 'sticker'].includes(msg.type),
          mediaUrl: msg.media_url,
          mediaType: ['image', 'video', 'audio', 'document', 'sticker'].includes(msg.type) ? msg.type : null,
          quotedMsg: null,
          isHistory: metadata.is_history || false
        };
      });

      return {
        chatId,
        messages: formattedMessages,
        count: formattedMessages.length,
        total,
        hasMore: (offset + limit) < total,
        pagination: {
          limit,
          offset,
          nextOffset: (offset + limit) < total ? offset + limit : null
        }
      };
    } catch (error) {
      logger.error(`Failed to fetch messages for ${sessionId}/${chatId}:`, error);
      throw error;
    }
  }

  /**
   * Load more messages from WhatsApp directly (not from database)
   * Use this when database doesn't have enough history
   */
  async loadMoreMessages(sessionId, chatId, options = {}) {
    try {
      const session = this.sessions.get(sessionId);
      if (!session || !session.socket) {
        throw new Error('Session not found or not connected');
      }

      const sock = session.socket;
      const limit = parseInt(options.limit) || 50;
      
      // Use Baileys to fetch messages directly from WhatsApp
      // fetchMessageHistory requires a cursor for pagination
      let cursor = undefined;
      
      if (options.before) {
        // Get message from DB to use as cursor
        const beforeMsg = await db.Message.findOne({
          where: { message_id: options.before }
        });
        
        if (beforeMsg) {
          cursor = {
            before: {
              id: beforeMsg.message_id,
              fromMe: beforeMsg.from_me
            }
          };
        }
      }

      logger.info(`[${sessionId}] Loading more messages for ${chatId}, limit: ${limit}`);

      // Fetch messages from WhatsApp using store (if available) or manual fetch
      const messages = [];
      
      // Try to trigger a message load by reading messages
      // This uses Baileys' internal message fetching
      try {
        // This method is not always available, depends on Baileys version
        if (sock.fetchMessagesFromWA) {
          const fetched = await sock.fetchMessagesFromWA(chatId, limit);
          if (fetched && fetched.length > 0) {
            // Store fetched messages in database
            for (const msg of fetched) {
              if (!msg.message) continue;
              
              const messageData = {
                session_id: session.sessionRecord.id,
                message_id: msg.key.id,
                remote_jid: msg.key.remoteJid,
                from_me: msg.key.fromMe || false,
                timestamp: parseInt(msg.messageTimestamp) || Date.now(),
                type: this.getMessageType(msg.message),
                content: this.extractMessageContent(msg.message),
                status: msg.key.fromMe ? 'sent' : 'delivered',
                metadata: {
                  raw_message: msg.message,
                  push_name: msg.pushName,
                  is_history: true,
                  loaded_at: new Date().toISOString()
                }
              };

              await db.Message.upsert(messageData, {
                conflictFields: ['message_id', 'session_id']
              });
              messages.push(messageData);
            }
          }
        }
      } catch (fetchErr) {
        logger.debug(`[${sessionId}] Direct fetch not available:`, fetchErr.message);
      }

      return {
        chatId,
        loaded: messages.length,
        message: messages.length > 0 
          ? `Loaded ${messages.length} additional messages`
          : 'No additional messages available. Messages are synced automatically when session connects.'
      };
    } catch (error) {
      logger.error(`Failed to load more messages for ${sessionId}/${chatId}:`, error);
      throw error;
    }
  }

  /**
   * Force re-sync history for a session
   * Disconnects and reconnects to trigger full history sync
   */
  async resyncHistory(sessionId) {
    try {
      const session = this.sessions.get(sessionId);
      if (!session) {
        throw new Error('Session not found');
      }

      logger.info(`[${sessionId}] Starting history re-sync`);

      // Mark existing messages as pre-sync
      await db.Message.update(
        { metadata: db.Sequelize.fn('JSON_SET', db.Sequelize.col('metadata'), '$.pre_sync', true) },
        { where: { session_id: session.sessionRecord.id } }
      );

      // Reconnect to trigger fresh history sync
      const sock = session.socket;
      if (sock) {
        // End current connection
        sock.end();
      }

      // Wait a moment then reconnect
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      await this.createSession(sessionId, session.sessionRecord);

      return {
        success: true,
        message: 'History re-sync initiated. Messages will be imported in the background.'
      };
    } catch (error) {
      logger.error(`Failed to resync history for ${sessionId}:`, error);
      throw error;
    }
  }
}

module.exports = new WhatsAppService();
