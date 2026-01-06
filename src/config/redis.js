const Redis = require('ioredis');
require('dotenv').config();

let redisClient;

const getRedisClient = () => {
  if (!redisClient) {
    const redisConfig = {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT) || 6379,
      password: process.env.REDIS_PASSWORD || undefined,
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      reconnectOnError: (err) => {
        console.error('Redis reconnect error:', err.message);
        return true;
      }
    };

    // Support Redis Cloud/Upstash URL
    if (process.env.REDIS_URL) {
      redisClient = new Redis(process.env.REDIS_URL, {
        maxRetriesPerRequest: 3
      });
    } else {
      redisClient = new Redis(redisConfig);
    }

    redisClient.on('connect', () => {
      console.log('✅ Redis connected successfully');
    });

    redisClient.on('error', (err) => {
      console.error('❌ Redis connection error:', err.message);
    });

    redisClient.on('close', () => {
      console.log('⚠️  Redis connection closed');
    });
  }

  return redisClient;
};

const closeRedis = async () => {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
    console.log('Redis connection closed');
  }
};

module.exports = { getRedisClient, closeRedis };
