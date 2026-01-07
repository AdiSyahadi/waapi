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

  // Debug logging
  console.log('[Analytics Middleware] Has X-API-Key:', !!req.headers['x-api-key']);
  console.log('[Analytics Middleware] Has Authorization:', !!req.headers['authorization']);
  console.log('[Analytics Middleware] User ID at middleware entry:', req.user?.id || 'NO USER YET');

  // ONLY track API calls made with API Key (external usage)
  // Skip ALL requests that don't have X-API-Key header (JWT auth = internal dashboard)
  const apiKey = req.headers['x-api-key'];
  if (!apiKey) {
    console.log('[Analytics Middleware] Skipping - no API key');
    return next();
  }

  console.log('[Analytics Middleware] WILL TRACK - has API key');
  const startTime = Date.now();

  // Store original end function
  const originalEnd = res.end;

  // Override end function to capture response
  res.end = function(...args) {
    const responseTime = Date.now() - startTime;
    const success = res.statusCode >= 200 && res.statusCode < 400;

    // Track if user is authenticated via API Key
    if (req.user?.id) {
      console.log('[Analytics Middleware] Recording to DB:', {
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
      console.log('[Analytics Middleware] Not recording - no user at response time');
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
