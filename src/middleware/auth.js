const { verifyAccessToken } = require('../utils/jwt');
const db = require('../models');

/**
 * Middleware to authenticate JWT token
 */
const authenticate = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    
    console.log('[Auth Middleware] Authorization header:', authHeader ? `${authHeader.substring(0, 30)}...` : 'MISSING');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('[Auth Middleware] No token provided or invalid format');
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    console.log('[Auth Middleware] Token extracted:', `${token.substring(0, 30)}...`);

    // Verify token
    console.log('[Auth Middleware] Verifying token...');
    const decoded = verifyAccessToken(token);
    console.log('[Auth Middleware] Token verified, user ID:', decoded.id);

    // Get user from database
    const user = await db.User.findByPk(decoded.id, {
      include: [
        {
          model: db.Subscription,
          as: 'subscription',
          include: [{
            model: db.Plan,
            as: 'plan'
          }]
        },
        {
          model: db.Organization,
          as: 'organization'
        }
      ]
    });

    if (!user) {
      console.log('[Auth Middleware] User not found in database');
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }

    console.log('[Auth Middleware] User found:', user.email, 'Status:', user.status, 'Role:', user.role);

    if (user.status !== 'active') {
      console.log('[Auth Middleware] User status is not active:', user.status);
      return res.status(403).json({
        success: false,
        message: 'Account is not active'
      });
    }

    // Attach user to request
    req.user = user;
    console.log('[Auth Middleware] Authentication successful for user:', user.email);
    next();
  } catch (error) {
    console.error('[Auth Middleware] Authentication failed:', error.message);
    console.error('[Auth Middleware] Error stack:', error.stack);
    return res.status(401).json({
      success: false,
      message: error.message || 'Invalid token'
    });
  }
};

/**
 * Optional authentication - doesn't fail if no token
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const decoded = verifyAccessToken(token);
      const user = await db.User.findByPk(decoded.id);
      
      if (user && user.status === 'active') {
        req.user = user;
      }
    }
  } catch (error) {
    // Ignore errors for optional auth
  }
  
  next();
};

module.exports = {
  authenticate,
  optionalAuth
};
