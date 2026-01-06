const axios = require('axios');
const db = require('../models');
const { logger } = require('../config/logger');
const { generateWebhookSignature } = require('../utils/webhookSigner');
const { addMessageJob } = require('../config/queue');

class WebhookService {
  constructor() {
    this.maxRetries = 3;
    this.retryDelay = 1000; // 1 second initial delay
  }

  /**
   * Send webhook with retry logic
   */
  async sendWebhook(webhookUrl, payload, secret, retryCount = 0) {
    try {
      const payloadString = JSON.stringify(payload);
      const signature = secret ? generateWebhookSignature(payloadString, secret) : null;

      const headers = {
        'Content-Type': 'application/json',
        'User-Agent': 'WhatsApp-API-Webhook/1.0'
      };

      if (signature) {
        headers['X-Webhook-Signature'] = signature;
      }

      const response = await axios.post(webhookUrl, payload, {
        headers,
        timeout: 10000, // 10 second timeout
        validateStatus: (status) => status >= 200 && status < 300
      });

      // Log successful delivery
      await this.logWebhookDelivery({
        url: webhookUrl,
        event: payload.event,
        status: 'success',
        statusCode: response.status,
        payload: payloadString,
        response: JSON.stringify(response.data),
        retryCount
      });

      return {
        success: true,
        status: response.status,
        data: response.data
      };
    } catch (error) {
      const statusCode = error.response?.status || 0;
      const errorMessage = error.message;

      // Log failed delivery
      await this.logWebhookDelivery({
        url: webhookUrl,
        event: payload.event,
        status: 'failed',
        statusCode,
        payload: JSON.stringify(payload),
        error: errorMessage,
        retryCount
      });

      // Retry logic with exponential backoff
      if (retryCount < this.maxRetries) {
        const delay = this.retryDelay * Math.pow(2, retryCount);
        logger.info(`Retrying webhook in ${delay}ms (attempt ${retryCount + 1}/${this.maxRetries})`);
        
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.sendWebhook(webhookUrl, payload, secret, retryCount + 1);
      }

      logger.error(`Webhook failed after ${this.maxRetries} retries:`, error.message);
      return {
        success: false,
        error: errorMessage,
        statusCode
      };
    }
  }

  /**
   * Queue webhook for async delivery
   */
  async queueWebhook(sessionId, eventType, eventData, sessionRecord) {
    try {
      // Check if session has webhook configured
      if (!sessionRecord.webhook_url) {
        return;
      }

      // Check if event type is subscribed
      const webhookEvents = sessionRecord.webhook_events || ['*'];
      const isSubscribed = webhookEvents.includes('*') || 
                          webhookEvents.includes(eventType) ||
                          webhookEvents.some(pattern => {
                            // Support wildcard patterns like "message.*"
                            const regex = new RegExp('^' + pattern.replace('*', '.*') + '$');
                            return regex.test(eventType);
                          });

      if (!isSubscribed) {
        return;
      }

      const payload = {
        event: eventType,
        timestamp: new Date().toISOString(),
        session_id: sessionId,
        data: eventData
      };

      // Try to send immediately (non-blocking)
      this.sendWebhook(
        sessionRecord.webhook_url,
        payload,
        sessionRecord.webhook_secret
      ).catch(error => {
        logger.error(`Webhook delivery error for ${sessionId}:`, error);
      });

      // Also add to queue if BullMQ is available
      if (addMessageJob) {
        await addMessageJob('webhook-delivery', {
          webhookUrl: sessionRecord.webhook_url,
          payload,
          secret: sessionRecord.webhook_secret,
          sessionId
        }).catch(() => {
          // Queue not available, already sent directly above
        });
      }
    } catch (error) {
      logger.error('Queue webhook error:', error);
    }
  }

  /**
   * Log webhook delivery
   */
  async logWebhookDelivery(data) {
    try {
      await db.WebhookLog.create({
        url: data.url,
        event: data.event,
        status: data.status,
        status_code: data.statusCode,
        payload: data.payload,
        response: data.response || null,
        error: data.error || null,
        retry_count: data.retryCount || 0,
        delivered_at: new Date()
      });
    } catch (error) {
      logger.error('Failed to log webhook delivery:', error);
    }
  }

  /**
   * Test webhook URL
   */
  async testWebhook(webhookUrl, secret = null) {
    const testPayload = {
      event: 'webhook.test',
      timestamp: new Date().toISOString(),
      data: {
        message: 'This is a test webhook from WhatsApp API',
        test: true
      }
    };

    return this.sendWebhook(webhookUrl, testPayload, secret);
  }

  /**
   * Get webhook logs
   */
  async getWebhookLogs(filters = {}) {
    try {
      const where = {};
      
      if (filters.url) {
        where.url = filters.url;
      }
      
      if (filters.event) {
        where.event = filters.event;
      }
      
      if (filters.status) {
        where.status = filters.status;
      }

      if (filters.startDate || filters.endDate) {
        where.delivered_at = {};
        if (filters.startDate) {
          where.delivered_at[db.Sequelize.Op.gte] = new Date(filters.startDate);
        }
        if (filters.endDate) {
          where.delivered_at[db.Sequelize.Op.lte] = new Date(filters.endDate);
        }
      }

      const logs = await db.WebhookLog.findAll({
        where,
        order: [['delivered_at', 'DESC']],
        limit: filters.limit || 100,
        offset: filters.offset || 0
      });

      return logs;
    } catch (error) {
      logger.error('Get webhook logs error:', error);
      throw error;
    }
  }

  /**
   * Handle incoming message event
   */
  handleMessageEvent(sessionId, messageData, sessionRecord) {
    const eventType = messageData.fromMe ? 'message.sent' : 'message.received';
    
    this.queueWebhook(sessionId, eventType, {
      message_id: messageData.key?.id,
      from: messageData.key?.remoteJid,
      participant: messageData.key?.participant,
      message_type: Object.keys(messageData.message || {})[0],
      message: messageData.message,
      timestamp: messageData.messageTimestamp,
      from_me: messageData.fromMe
    }, sessionRecord);
  }

  /**
   * Handle message status update event
   */
  handleMessageStatusEvent(sessionId, statusUpdate, sessionRecord) {
    this.queueWebhook(sessionId, 'message.status', {
      message_id: statusUpdate.key?.id,
      from: statusUpdate.key?.remoteJid,
      status: statusUpdate.status, // sent, delivered, read
      timestamp: statusUpdate.timestamp || Date.now()
    }, sessionRecord);
  }

  /**
   * Handle connection event
   */
  handleConnectionEvent(sessionId, connectionStatus, sessionRecord) {
    this.queueWebhook(sessionId, 'connection.update', {
      status: connectionStatus,
      timestamp: Date.now()
    }, sessionRecord);
  }

  /**
   * Handle group event
   */
  handleGroupEvent(sessionId, eventType, groupData, sessionRecord) {
    this.queueWebhook(sessionId, `group.${eventType}`, {
      group_id: groupData.id,
      data: groupData,
      timestamp: Date.now()
    }, sessionRecord);
  }

  /**
   * Handle presence event
   */
  handlePresenceEvent(sessionId, presenceData, sessionRecord) {
    this.queueWebhook(sessionId, 'presence.update', {
      jid: presenceData.id,
      presence: presenceData.presences?.[presenceData.id]?.lastKnownPresence,
      timestamp: Date.now()
    }, sessionRecord);
  }
}

module.exports = new WebhookService();
