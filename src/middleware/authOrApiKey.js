const { authenticate } = require('./auth');
const { authenticateApiKey } = require('./apiKey');

/**
 * Middleware that accepts either JWT token or API key
 * Tries JWT first, then falls back to API key
 */
const authenticateWithApiKeySupport = async (req, res, next) => {
  // Check if X-API-Key header exists
  const apiKey = req.headers['x-api-key'];
  
  if (apiKey) {
    // Use API key authentication
    return authenticateApiKey(req, res, next);
  }
  
  // Fall back to JWT authentication
  return authenticate(req, res, next);
};

module.exports = {
  authenticateWithApiKeySupport
};
