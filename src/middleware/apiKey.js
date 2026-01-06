const db = require('../models');
const crypto = require('crypto');

/**
 * Authenticate request with API Key
 */
const authenticateApiKey = async (req, res, next) => {
  try {
    // Get API key from header
    const apiKey = req.headers['x-api-key'];
    
    if (!apiKey) {
      return res.status(401).json({
        success: false,
        message: 'API key required'
      });
    }

    // Find API key in database
    const keyRecord = await db.ApiKey.findOne({
      where: { 
        key: apiKey,
        status: 'active'
      },
      include: [{
        model: db.User,
        as: 'user',
        include: [{
          model: db.Subscription,
          as: 'subscription',
          include: [{
            model: db.Plan,
            as: 'plan'
          }]
        }]
      }]
    });

    if (!keyRecord) {
      return res.status(401).json({
        success: false,
        message: 'Invalid API key'
      });
    }

    // Check expiration
    if (keyRecord.expires_at && new Date(keyRecord.expires_at) < new Date()) {
      return res.status(401).json({
        success: false,
        message: 'API key has expired'
      });
    }

    // Check IP whitelist
    const ipWhitelist = keyRecord.ip_whitelist;
    if (ipWhitelist && Array.isArray(ipWhitelist) && ipWhitelist.length > 0) {
      const clientIp = req.ip || req.connection.remoteAddress;
      console.log('IP Whitelist check:', {
        whitelist: ipWhitelist,
        clientIp,
        whitelisted: ipWhitelist.includes(clientIp)
      });
      if (!ipWhitelist.includes(clientIp)) {
        return res.status(403).json({
          success: false,
          message: 'IP address not whitelisted',
          clientIp,
          whitelist: ipWhitelist
        });
      }
    }

    // Update last used
    await keyRecord.update({
      last_used_at: new Date(),
      last_used_ip: req.ip || req.connection.remoteAddress
    });

    // Attach to request
    req.apiKey = keyRecord;
    req.user = keyRecord.user;
    
    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error authenticating API key',
      error: error.message
    });
  }
};

/**
 * Check API key permissions
 */
const requireApiPermission = (...permissions) => {
  return (req, res, next) => {
    if (!req.apiKey) {
      return res.status(401).json({
        success: false,
        message: 'API key authentication required'
      });
    }

    const keyPermissions = req.apiKey.permissions || [];
    
    // Check if key has required permissions
    const hasPermission = permissions.every(p => keyPermissions.includes(p));
    
    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: 'API key does not have required permissions',
        required: permissions,
        current: keyPermissions
      });
    }

    next();
  };
};

module.exports = {
  authenticateApiKey,
  requireApiPermission
};
