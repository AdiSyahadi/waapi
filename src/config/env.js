const Joi = require('joi');
require('dotenv').config();

// Schema untuk environment variables
const envSchema = Joi.object({
  // Server
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().default(3000),
  HOST: Joi.string().default('0.0.0.0'),

  // Database
  DB_HOST: Joi.string().required(),
  DB_PORT: Joi.number().default(3306),
  DB_USER: Joi.string().required(),
  DB_PASSWORD: Joi.string().allow('').default(''),
  DB_NAME: Joi.string().required(),
  DB_DIALECT: Joi.string().valid('mysql', 'postgres', 'sqlite').default('mysql'),

  // Redis
  REDIS_HOST: Joi.string().default('localhost'),
  REDIS_PORT: Joi.number().default(6379),
  REDIS_PASSWORD: Joi.string().allow('').optional(),
  REDIS_URL: Joi.string().optional(),

  // JWT
  JWT_SECRET: Joi.string().min(32).required(),
  JWT_EXPIRES_IN: Joi.string().default('7d'),
  JWT_REFRESH_SECRET: Joi.string().min(32).required(),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('30d'),

  // Encryption
  ENCRYPTION_KEY: Joi.string().length(32).required(),

  // Session
  SESSION_TIMEOUT: Joi.number().default(300000), // 5 minutes
  MAX_SESSIONS_PER_USER: Joi.number().default(5),

  // WhatsApp
  MAX_RECONNECT_ATTEMPTS: Joi.number().default(5),
  RECONNECT_INTERVAL: Joi.number().default(5000),

  // File Upload
  MAX_FILE_SIZE: Joi.number().default(16777216), // 16MB
  ALLOWED_FILE_TYPES: Joi.string().default('image/jpeg,image/png,image/gif,video/mp4,audio/mpeg,application/pdf'),

  // Rate Limiting
  RATE_LIMIT_WINDOW: Joi.number().default(900000), // 15 minutes
  RATE_LIMIT_MAX: Joi.number().default(100),

  // Email (SMTP)
  SMTP_HOST: Joi.string().when('NODE_ENV', {
    is: 'production',
    then: Joi.required(),
    otherwise: Joi.optional()
  }),
  SMTP_PORT: Joi.number().default(587),
  SMTP_SECURE: Joi.boolean().default(false),
  SMTP_USER: Joi.string().when('NODE_ENV', {
    is: 'production',
    then: Joi.required(),
    otherwise: Joi.optional()
  }),
  SMTP_PASSWORD: Joi.string().when('NODE_ENV', {
    is: 'production',
    then: Joi.required(),
    otherwise: Joi.optional()
  }),
  SMTP_FROM: Joi.string().email().default('noreply@whatsappapi.com'),

  // Payment - Stripe
  STRIPE_SECRET_KEY: Joi.string().when('NODE_ENV', {
    is: 'production',
    then: Joi.required(),
    otherwise: Joi.optional()
  }),
  STRIPE_PUBLISHABLE_KEY: Joi.string().when('NODE_ENV', {
    is: 'production',
    then: Joi.required(),
    otherwise: Joi.optional()
  }),
  STRIPE_WEBHOOK_SECRET: Joi.string().optional(),

  // Payment - PayPal
  PAYPAL_CLIENT_ID: Joi.string().optional(),
  PAYPAL_CLIENT_SECRET: Joi.string().optional(),
  PAYPAL_MODE: Joi.string().valid('sandbox', 'live').default('sandbox'),

  // AWS S3 (optional)
  AWS_ACCESS_KEY_ID: Joi.string().optional(),
  AWS_SECRET_ACCESS_KEY: Joi.string().optional(),
  AWS_REGION: Joi.string().default('us-east-1'),
  AWS_S3_BUCKET: Joi.string().optional(),

  // Logging
  LOG_LEVEL: Joi.string()
    .valid('error', 'warn', 'info', 'http', 'verbose', 'debug', 'silly')
    .default('info'),

  // Webhook
  WEBHOOK_MAX_RETRIES: Joi.number().default(3),
  WEBHOOK_RETRY_DELAY: Joi.number().default(5000),
  WEBHOOK_TIMEOUT: Joi.number().default(30000),

  // Frontend URL
  FRONTEND_URL: Joi.string().uri().default('http://localhost:3000'),

  // API
  API_VERSION: Joi.string().default('v1'),
  API_PREFIX: Joi.string().default('/api')
}).unknown(true); // Allow unknown keys for flexibility

// Validate environment variables
const validateEnv = () => {
  const { error, value } = envSchema.validate(process.env, {
    abortEarly: false,
    stripUnknown: false
  });

  if (error) {
    const errors = error.details.map(detail => {
      return `  - ${detail.path.join('.')}: ${detail.message}`;
    });
    
    console.error('❌ Environment validation failed:');
    console.error(errors.join('\n'));
    
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Invalid environment configuration');
    } else {
      console.warn('⚠️  Running with invalid config in development mode');
    }
  } else {
    console.log('✅ Environment variables validated successfully');
  }

  return value;
};

// Export validated config
const config = validateEnv();

module.exports = {
  validateEnv,
  config
};
