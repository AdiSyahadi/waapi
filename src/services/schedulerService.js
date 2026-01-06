const db = require('../models');
const whatsappService = require('../services/whatsappService');
const { logger } = require('../config/logger');

class SchedulerService {
  constructor() {
    this.isRunning = false;
    this.checkInterval = 10000; // Check every 10 seconds
    this.intervalId = null;
  }

  /**
   * Start the scheduler
   */
  start() {
    if (this.isRunning) {
      logger.info('Scheduler is already running');
      return;
    }

    this.isRunning = true;
    logger.info('Scheduler started');

    // Initial check
    this.processScheduledMessages();

    // Set up interval
    this.intervalId = setInterval(() => {
      this.processScheduledMessages();
    }, this.checkInterval);
  }

  /**
   * Stop the scheduler
   */
  stop() {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    logger.info('Scheduler stopped');
  }

  /**
   * Process pending scheduled messages
   */
  async processScheduledMessages() {
    try {
      const now = new Date();

      // Find messages that are due
      const messages = await db.ScheduledMessage.findAll({
        where: {
          status: 'pending',
          scheduled_at: {
            [db.Sequelize.Op.lte]: now
          }
        },
        limit: 50, // Process 50 at a time
        order: [['scheduled_at', 'ASC']]
      });

      if (messages.length === 0) {
        return;
      }

      logger.info(`Processing ${messages.length} scheduled messages`);

      for (const message of messages) {
        await this.sendScheduledMessage(message);
      }
    } catch (error) {
      logger.error('Error processing scheduled messages:', error);
    }
  }

  /**
   * Send a single scheduled message
   */
  async sendScheduledMessage(scheduledMessage) {
    try {
      // Mark as processing
      await scheduledMessage.update({ status: 'processing' });

      // Get session
      const session = await db.Session.findOne({
        where: { session_id: scheduledMessage.session_id }
      });

      if (!session || session.status !== 'connected') {
        throw new Error('Session not connected');
      }

      const sock = whatsappService.getSession(scheduledMessage.session_id);
      if (!sock) {
        throw new Error('WhatsApp session not active');
      }

      // Format recipient JID
      const jid = scheduledMessage.recipient.includes('@') 
        ? scheduledMessage.recipient 
        : `${scheduledMessage.recipient}@s.whatsapp.net`;

      // Send message based on type
      let result;
      switch (scheduledMessage.message_type) {
        case 'text':
          result = await sock.socket.sendMessage(jid, {
            text: scheduledMessage.content
          });
          break;

        case 'image':
          result = await sock.socket.sendMessage(jid, {
            image: { url: scheduledMessage.media_url },
            caption: scheduledMessage.caption || ''
          });
          break;

        case 'video':
          result = await sock.socket.sendMessage(jid, {
            video: { url: scheduledMessage.media_url },
            caption: scheduledMessage.caption || ''
          });
          break;

        case 'audio':
          result = await sock.socket.sendMessage(jid, {
            audio: { url: scheduledMessage.media_url },
            mimetype: 'audio/mp4'
          });
          break;

        case 'document':
          const metadata = scheduledMessage.metadata || {};
          result = await sock.socket.sendMessage(jid, {
            document: { url: scheduledMessage.media_url },
            mimetype: metadata.mimetype || 'application/octet-stream',
            fileName: metadata.filename || 'document'
          });
          break;

        case 'location':
          const location = JSON.parse(scheduledMessage.content);
          result = await sock.socket.sendMessage(jid, {
            location: {
              degreesLatitude: location.latitude,
              degreesLongitude: location.longitude,
              name: location.name || '',
              address: location.address || ''
            }
          });
          break;

        case 'contact':
          const contact = JSON.parse(scheduledMessage.content);
          result = await sock.socket.sendMessage(jid, {
            contacts: {
              displayName: contact.name,
              contacts: [{
                vcard: `BEGIN:VCARD\nVERSION:3.0\nFN:${contact.name}\nTEL;type=CELL;type=VOICE;waid=${contact.phone}:${contact.phone}\nEND:VCARD`
              }]
            }
          });
          break;

        default:
          throw new Error(`Unknown message type: ${scheduledMessage.message_type}`);
      }

      // Mark as sent
      await scheduledMessage.update({
        status: 'sent',
        sent_at: new Date()
      });

      logger.info(`Scheduled message ${scheduledMessage.id} sent successfully`);
    } catch (error) {
      logger.error(`Failed to send scheduled message ${scheduledMessage.id}:`, error);

      const retryCount = scheduledMessage.retry_count + 1;
      
      if (retryCount < scheduledMessage.max_retries) {
        // Schedule retry (5 minutes delay)
        await scheduledMessage.update({
          status: 'pending',
          retry_count: retryCount,
          scheduled_at: new Date(Date.now() + 5 * 60 * 1000),
          error: error.message
        });
      } else {
        // Mark as failed
        await scheduledMessage.update({
          status: 'failed',
          retry_count: retryCount,
          error: error.message
        });
      }
    }
  }

  /**
   * Schedule a new message
   */
  async scheduleMessage(data) {
    try {
      const scheduledMessage = await db.ScheduledMessage.create({
        user_id: data.user_id,
        session_id: data.session_id,
        recipient: data.recipient,
        message_type: data.message_type || 'text',
        content: data.content,
        media_url: data.media_url,
        caption: data.caption,
        scheduled_at: new Date(data.scheduled_at),
        max_retries: data.max_retries || 3,
        metadata: data.metadata || {}
      });

      logger.info(`Message scheduled: ${scheduledMessage.id} for ${data.scheduled_at}`);
      return scheduledMessage;
    } catch (error) {
      logger.error('Failed to schedule message:', error);
      throw error;
    }
  }

  /**
   * Cancel a scheduled message
   */
  async cancelMessage(messageId, userId) {
    try {
      const message = await db.ScheduledMessage.findOne({
        where: {
          id: messageId,
          user_id: userId,
          status: 'pending'
        }
      });

      if (!message) {
        throw new Error('Scheduled message not found or already processed');
      }

      await message.update({ status: 'cancelled' });
      logger.info(`Scheduled message ${messageId} cancelled`);
      return message;
    } catch (error) {
      logger.error('Failed to cancel scheduled message:', error);
      throw error;
    }
  }

  /**
   * Get scheduled messages for user
   */
  async getScheduledMessages(userId, filters = {}) {
    try {
      const where = { user_id: userId };

      if (filters.session_id) {
        where.session_id = filters.session_id;
      }

      if (filters.status) {
        where.status = filters.status;
      }

      const messages = await db.ScheduledMessage.findAll({
        where,
        order: [['scheduled_at', 'ASC']],
        limit: filters.limit || 100,
        offset: filters.offset || 0
      });

      return messages;
    } catch (error) {
      logger.error('Failed to get scheduled messages:', error);
      throw error;
    }
  }
}

module.exports = new SchedulerService();
