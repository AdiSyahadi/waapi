const analyticsService = require('../services/analyticsService');

/**
 * Middleware to track API requests
 */
const trackApiRequest = async (req, res, next) => {
  // Skip tracking for certain routes
  const skipRoutes = ['/health', '/api/docs', '/favicon.ico'];
  if (skipRoutes.some(route => req.path.startsWith(route))) {
    return next();
  }

  const startTime = Date.now();

  // Store original end function
  const originalEnd = res.end;

  // Override end function to capture response
  res.end = function(...args) {
    const responseTime = Date.now() - startTime;
    const success = res.statusCode >= 200 && res.statusCode < 400;

    // Track if user is authenticated
    if (req.user?.id) {
      // Don't await - fire and forget
      analyticsService.trackApiRequest(
        req.user.id,
        req.route?.path || req.path,
        req.method,
        success,
        responseTime
      ).catch(err => console.error('Failed to track API request:', err.message));
    }

    // Call original end
    originalEnd.apply(res, args);
  };

  next();
};

/**
 * Middleware to log activity
 */
const logActivity = (eventType) => {
  return async (req, res, next) => {
    if (req.user?.id) {
      analyticsService.logActivity(
        req.user.id,
        eventType,
        {
          path: req.path,
          method: req.method,
          body: req.body,
          sessionId: req.body?.sessionId || req.params?.sessionId
        },
        req
      ).catch(err => console.error('Failed to log activity:', err.message));
    }
    next();
  };
};

module.exports = {
  trackApiRequest,
  logActivity
};
