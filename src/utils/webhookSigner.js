const crypto = require('crypto');

/**
 * Generate HMAC-SHA256 signature for webhook
 * @param {string} payload - JSON stringified payload
 * @param {string} secret - Webhook secret key
 * @returns {string} HMAC signature
 */
function generateWebhookSignature(payload, secret) {
  if (!secret) {
    throw new Error('Webhook secret is required');
  }

  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(payload);
  return hmac.digest('hex');
}

/**
 * Verify webhook signature
 * @param {string} payload - JSON stringified payload
 * @param {string} signature - Received signature
 * @param {string} secret - Webhook secret key
 * @returns {boolean} Is signature valid
 */
function verifyWebhookSignature(payload, signature, secret) {
  if (!signature || !secret) {
    return false;
  }

  const expectedSignature = generateWebhookSignature(payload, secret);
  
  // Use timing-safe comparison to prevent timing attacks
  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch (error) {
    return false;
  }
}

/**
 * Generate random webhook secret
 * @returns {string} Random secret (64 hex characters)
 */
function generateWebhookSecret() {
  return crypto.randomBytes(32).toString('hex');
}

module.exports = {
  generateWebhookSignature,
  verifyWebhookSignature,
  generateWebhookSecret
};
