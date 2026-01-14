/**
 * Session Resolution Middleware
 * Fixes Issue #6: Session ID confusion (2 formats)
 * 
 * The API has two session identifiers:
 * 1. `id` (UUID) - Internal database primary key
 * 2. `session_id` (string) - User-facing session identifier (can include timestamp)
 * 
 * This middleware normalizes session resolution so that:
 * - API consumers can use EITHER format
 * - Internal code always works with the database record
 * - Response always includes both formats for clarity
 */

const db = require('../models');
const logger = require('../config/logger');

/**
 * Middleware to resolve session from various ID formats
 * Attaches `req.session` and `req.sessionRecord` to the request
 * 
 * Supports:
 * - session_id (string with optional timestamp suffix)
 * - id (UUID database primary key)
 * - name (session name for convenience)
 */
const resolveSession = async (req, res, next) => {
  try {
    const sessionIdentifier = req.params.sessionId || req.params.session_id || req.query.sessionId;
    
    if (!sessionIdentifier) {
      return next(); // No session to resolve
    }

    let session = null;

    // Strategy 1: Try exact match on session_id (most common)
    session = await db.Session.findOne({
      where: {
        session_id: sessionIdentifier,
        user_id: req.user?.id
      }
    });

    // Strategy 2: Try UUID match on id (database PK)
    if (!session && isUUID(sessionIdentifier)) {
      session = await db.Session.findOne({
        where: {
          id: sessionIdentifier,
          user_id: req.user?.id
        }
      });
    }

    // Strategy 3: Try matching by base session_id (without timestamp suffix)
    // Pattern: uuid_timestamp (e.g., 266cdcce-97a1-4d70-a6c5-b561b90acdfd_1768202501412)
    if (!session) {
      const baseId = sessionIdentifier.split('_')[0];
      if (isUUID(baseId)) {
        session = await db.Session.findOne({
          where: {
            session_id: { [db.Sequelize.Op.like]: `${baseId}%` },
            user_id: req.user?.id
          },
          order: [['created_at', 'DESC']] // Get most recent if multiple
        });
      }
    }

    // Strategy 4: Try matching by name (convenience)
    if (!session) {
      session = await db.Session.findOne({
        where: {
          name: sessionIdentifier,
          user_id: req.user?.id
        }
      });
    }

    if (session) {
      // Attach to request for use by controllers
      req.sessionRecord = session;
      req.resolvedSessionId = session.session_id; // Canonical session_id
      req.resolvedSessionDbId = session.id; // Database primary key
    }

    next();
  } catch (error) {
    logger.error('Session resolution error:', error);
    next(error);
  }
};

/**
 * Strict session resolution - fails if session not found
 */
const requireSession = async (req, res, next) => {
  await resolveSession(req, res, async () => {
    if (!req.sessionRecord) {
      return res.status(404).json({
        success: false,
        message: 'Session not found',
        hint: 'Use either session_id (e.g., "uuid_timestamp") or database id (UUID)'
      });
    }
    next();
  });
};

/**
 * Session resolution with connection check
 */
const requireConnectedSession = async (req, res, next) => {
  await resolveSession(req, res, async () => {
    if (!req.sessionRecord) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    if (req.sessionRecord.status !== 'connected') {
      return res.status(400).json({
        success: false,
        message: 'Session is not connected',
        data: {
          sessionId: req.sessionRecord.session_id,
          status: req.sessionRecord.status
        }
      });
    }

    next();
  });
};

/**
 * Helper to check if string is valid UUID
 */
function isUUID(str) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

/**
 * Format session response with consistent ID fields
 * Use this in controllers to standardize response format
 */
function formatSessionResponse(session) {
  return {
    // Primary identifiers - clearly documented
    id: session.id,                    // Database UUID (for internal references)
    sessionId: session.session_id,     // API identifier (use this for API calls)
    
    // Aliases for compatibility
    session_id: session.session_id,    // Deprecated: use sessionId
    
    // Session info
    name: session.name,
    phone: session.phone_number,
    status: session.status,
    
    // Timestamps
    createdAt: session.created_at,
    lastConnectedAt: session.last_connected_at,
    
    // Connection state
    isConnected: session.status === 'connected',
    
    // Webhook config
    webhookUrl: session.webhook_url,
    webhookEvents: session.webhook_events
  };
}

/**
 * Parse session identifier from various formats
 * Returns { baseId, timestamp, original }
 */
function parseSessionId(identifier) {
  if (!identifier) return null;
  
  const parts = identifier.split('_');
  
  if (parts.length >= 2) {
    // Format: uuid_timestamp or uuid_timestamp_more
    return {
      baseId: parts[0],
      timestamp: parts[1],
      original: identifier,
      format: 'session_id'
    };
  }
  
  if (isUUID(identifier)) {
    return {
      baseId: identifier,
      timestamp: null,
      original: identifier,
      format: 'uuid'
    };
  }
  
  return {
    baseId: null,
    timestamp: null,
    original: identifier,
    format: 'name'
  };
}

module.exports = {
  resolveSession,
  requireSession,
  requireConnectedSession,
  formatSessionResponse,
  parseSessionId,
  isUUID
};
