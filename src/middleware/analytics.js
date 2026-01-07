const analyticsService = require('../services/analyticsService');

/**
 * Middleware to track API requests
 */
const trackApiRequest = async (req, res, next) => {
  console.log('[Analytics Middleware] REQUEST:', req.method, req.path);
  
  // Skip tracking for certain routes
  const skipRoutes = ['/health', '/api/docs', '/favicon.ico'];
  if (skipRoutes.some(route => req.path.startsWith(route))) {
    console.log('[Analytics Middleware] Skipping - in skipRoutes');
    return next();
  }

  const startTime = Date.now();

  // Store original end function
  const originalEnd = res.end;

  // Override end function to capture response
  res.end = function(...args) {
    const responseTime = Date.now() - startTime;
    const success = res.statusCode >= 200 && res.statusCode < 400;

    // ONLY track API calls made with API Key (external usage)
    // Skip JWT auth requests (internal dashboard)
    if (req.user?.id && req.isApiKeyAuth === true) {
      console.log('[Analytics Middleware] Recording to DB - API Key auth:', {
        userId: req.user.id,
        path: req.route?.path || req.path,
        method: req.method,
        success,
        responseTime
      });
      // Don't await - fire and forget
      analyticsService.trackApiRequest(
        req.user.id,
        req.route?.path || req.path,
        req.method,
        success,
        responseTime
      ).catch(err => console.error('Failed to track API request:', err.message));
    } else {
      console.log('[Analytics Middleware] Not recording - JWT auth or no user');
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
