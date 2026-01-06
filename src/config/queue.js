const { Queue, Worker, QueueScheduler } = require('bullmq');
const { getRedisClient } = require('./redis');
require('dotenv').config();

const REDIS_ENABLED = process.env.REDIS_ENABLED === 'true';

// Connection options for BullMQ
const connection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  lazyConnect: true,
  maxRetriesPerRequest: 1
};

let messageQueue = null;
let webhookQueue = null;
let sessionQueue = null;
let scheduledMessageQueue = null;
let messageScheduler = null;
let webhookScheduler = null;
let sessionScheduler = null;
let scheduledScheduler = null;

// Try to initialize queues only if Redis is enabled
if (REDIS_ENABLED) {
  try {
    messageQueue = new Queue('whatsapp-messages', { connection });
    webhookQueue = new Queue('webhook-delivery', { connection });
    sessionQueue = new Queue('session-management', { connection });
    scheduledMessageQueue = new Queue('scheduled-messages', { connection });
    messageScheduler = new QueueScheduler('whatsapp-messages', { connection });
    webhookScheduler = new QueueScheduler('webhook-delivery', { connection });
    sessionScheduler = new QueueScheduler('session-management', { connection });
    scheduledScheduler = new QueueScheduler('scheduled-messages', { connection });
    console.log('BullMQ queues initialized successfully');
  } catch (error) {
    console.warn('BullMQ queue initialization failed:', error.message);
  }
} else {
  console.warn('Redis disabled - BullMQ queues not initialized');
}

// Helper functions
const addMessageJob = async (data, options = {}) => {
  if (!messageQueue) {
    console.warn('Message queue not available - skipping job');
    return null;
  }
  try {
    const job = await messageQueue.add('send-message', data, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000
      },
      ...options
    });
    return job;
  } catch (error) {
    console.error('Error adding message job:', error);
    return null;
  }
};

const addWebhookJob = async (data, options = {}) => {
  if (!webhookQueue) {
    console.warn('Webhook queue not available - skipping job');
    return null;
  }
  try {
    const job = await webhookQueue.add('deliver-webhook', data, {
      attempts: 5,
      backoff: {
        type: 'exponential',
        delay: 1000
      },
      ...options
    });
    return job;
  } catch (error) {
    console.error('Error adding webhook job:', error);
    return null;
  }
};

const addSessionJob = async (jobName, data, options = {}) => {
  if (!sessionQueue) {
    console.warn('Session queue not available - skipping job');
    return null;
  }
  try {
    const job = await sessionQueue.add(jobName, data, {
      attempts: 3,
      backoff: {
        type: 'fixed',
        delay: 5000
      },
      ...options
    });
    return job;
  } catch (error) {
    console.error('Error adding session job:', error);
    return null;
  }
};

const addScheduledMessageJob = async (data, sendAt) => {
  if (!scheduledMessageQueue) {
    console.warn('Scheduled message queue not available - skipping job');
    return null;
  }
  try {
    const delay = sendAt.getTime() - Date.now();
    const job = await scheduledMessageQueue.add('scheduled-message', data, {
      delay: delay > 0 ? delay : 0,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000
      }
    });
    return job;
  } catch (error) {
    console.error('Error adding scheduled message:', error);
    return null;
  }
};

module.exports = {
  messageQueue,
  webhookQueue,
  sessionQueue,
  scheduledMessageQueue,
  addMessageJob,
  addWebhookJob,
  addSessionJob,
  addScheduledMessageJob
};
