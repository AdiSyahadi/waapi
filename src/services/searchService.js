/**
 * Search Service - Proper Full-text Search Implementation
 * Fixes Issue #9: Basic LIKE search was slow and case-sensitive
 * 
 * Uses MySQL FULLTEXT index for:
 * - Fast text search across messages
 * - Relevance scoring
 * - Boolean mode for advanced queries
 * - Natural language mode for simple queries
 */

const db = require('../models');
const { Op } = require('sequelize');
const logger = require('../config/logger');

class SearchService {
  
  /**
   * Full-text search on messages
   * Uses MySQL FULLTEXT index with relevance scoring
   * 
   * @param {Object} options Search options
   * @param {UUID} options.sessionId - Session UUID (database id)
   * @param {string} options.query - Search query
   * @param {string} options.jid - Optional: filter by specific chat
   * @param {string} options.type - Optional: filter by message type
   * @param {Date} options.fromDate - Optional: start date
   * @param {Date} options.toDate - Optional: end date
   * @param {boolean} options.fromMe - Optional: filter by sender
   * @param {string} options.mode - 'natural' (default) or 'boolean'
   * @param {number} options.limit - Max results (default 50)
   * @param {number} options.offset - Offset for pagination
   */
  async searchMessages(options) {
    const {
      sessionId,
      query,
      jid,
      type,
      fromDate,
      toDate,
      fromMe,
      mode = 'natural',
      limit = 50,
      offset = 0
    } = options;

    if (!query || query.trim().length < 2) {
      throw new Error('Search query must be at least 2 characters');
    }

    const searchQuery = query.trim();
    
    // Determine search mode
    const searchMode = mode === 'boolean' ? 'IN BOOLEAN MODE' : 'IN NATURAL LANGUAGE MODE';
    
    // Build WHERE conditions
    const conditions = ['session_id = :sessionId'];
    const replacements = { sessionId, searchQuery };

    if (jid) {
      conditions.push('remote_jid = :jid');
      replacements.jid = jid;
    }

    if (type) {
      conditions.push('type = :type');
      replacements.type = type;
    }

    if (fromDate) {
      conditions.push('timestamp >= :fromDate');
      replacements.fromDate = new Date(fromDate).getTime();
    }

    if (toDate) {
      conditions.push('timestamp <= :toDate');
      replacements.toDate = new Date(toDate).getTime();
    }

    if (typeof fromMe === 'boolean') {
      conditions.push('from_me = :fromMe');
      replacements.fromMe = fromMe;
    }

    // Main search query with relevance score
    const whereClause = conditions.join(' AND ');
    
    const sql = `
      SELECT 
        id,
        message_id,
        session_id,
        remote_jid,
        from_me,
        type,
        content,
        media_url,
        timestamp,
        status,
        MATCH(content) AGAINST(:searchQuery ${searchMode}) as relevance
      FROM messages
      WHERE ${whereClause}
        AND MATCH(content) AGAINST(:searchQuery ${searchMode})
      ORDER BY relevance DESC, timestamp DESC
      LIMIT :limit OFFSET :offset
    `;

    replacements.limit = parseInt(limit);
    replacements.offset = parseInt(offset);

    try {
      // Execute search
      const [results] = await db.sequelize.query(sql, {
        replacements,
        type: db.Sequelize.QueryTypes.SELECT
      });

      // Get total count (without LIMIT)
      const countSql = `
        SELECT COUNT(*) as total
        FROM messages
        WHERE ${whereClause}
          AND MATCH(content) AGAINST(:searchQuery ${searchMode})
      `;

      const [countResult] = await db.sequelize.query(countSql, {
        replacements: { sessionId, searchQuery, jid, type, fromDate, toDate, fromMe },
        type: db.Sequelize.QueryTypes.SELECT
      });

      const total = countResult?.total || 0;

      // Group results by chat for context
      const groupedByChat = {};
      for (const msg of results) {
        if (!groupedByChat[msg.remote_jid]) {
          groupedByChat[msg.remote_jid] = [];
        }
        groupedByChat[msg.remote_jid].push({
          id: msg.id,
          messageId: msg.message_id,
          content: msg.content,
          type: msg.type,
          fromMe: msg.from_me,
          timestamp: msg.timestamp,
          status: msg.status,
          relevance: parseFloat(msg.relevance).toFixed(4)
        });
      }

      return {
        results: results.map(msg => ({
          id: msg.id,
          messageId: msg.message_id,
          remoteJid: msg.remote_jid,
          content: msg.content,
          type: msg.type,
          fromMe: msg.from_me,
          timestamp: msg.timestamp,
          timestampISO: new Date(parseInt(msg.timestamp)).toISOString(),
          status: msg.status,
          relevance: parseFloat(msg.relevance).toFixed(4),
          // Highlight match (simple version)
          highlight: this.highlightMatch(msg.content, searchQuery)
        })),
        groupedByChat,
        pagination: {
          total,
          limit: parseInt(limit),
          offset: parseInt(offset),
          hasMore: parseInt(offset) + results.length < total
        }
      };
    } catch (error) {
      // Fallback to LIKE if FULLTEXT fails (e.g., index not ready)
      logger.warn('FULLTEXT search failed, falling back to LIKE:', error.message);
      return this.searchMessagesLike(options);
    }
  }

  /**
   * Fallback LIKE search (used if FULLTEXT not available)
   * Improved with case-insensitive LOWER() comparison
   */
  async searchMessagesLike(options) {
    const {
      sessionId,
      query,
      jid,
      type,
      fromDate,
      toDate,
      fromMe,
      limit = 50,
      offset = 0
    } = options;

    const where = {
      session_id: sessionId,
      // Case-insensitive search using Sequelize
      content: db.sequelize.where(
        db.sequelize.fn('LOWER', db.sequelize.col('content')),
        { [Op.like]: `%${query.toLowerCase()}%` }
      )
    };

    if (jid) where.remote_jid = jid;
    if (type) where.type = type;
    if (fromDate) where.timestamp = { [Op.gte]: new Date(fromDate).getTime() };
    if (toDate) where.timestamp = { ...where.timestamp, [Op.lte]: new Date(toDate).getTime() };
    if (typeof fromMe === 'boolean') where.from_me = fromMe;

    const { rows, count } = await db.Message.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['timestamp', 'DESC']]
    });

    return {
      results: rows.map(msg => ({
        id: msg.id,
        messageId: msg.message_id,
        remoteJid: msg.remote_jid,
        content: msg.content,
        type: msg.type,
        fromMe: msg.from_me,
        timestamp: msg.timestamp,
        timestampISO: new Date(parseInt(msg.timestamp)).toISOString(),
        status: msg.status,
        relevance: null,
        highlight: this.highlightMatch(msg.content, query)
      })),
      pagination: {
        total: count,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: parseInt(offset) + rows.length < count
      },
      fallback: true // Indicate LIKE was used
    };
  }

  /**
   * Search contacts
   */
  async searchContacts(sessionId, query, options = {}) {
    const { limit = 50, offset = 0 } = options;

    const lowerQuery = query.toLowerCase();

    const where = {
      session_id: sessionId,
      [Op.or]: [
        db.sequelize.where(
          db.sequelize.fn('LOWER', db.sequelize.col('phone')),
          { [Op.like]: `%${lowerQuery}%` }
        ),
        db.sequelize.where(
          db.sequelize.fn('LOWER', db.sequelize.col('push_name')),
          { [Op.like]: `%${lowerQuery}%` }
        ),
        db.sequelize.where(
          db.sequelize.fn('LOWER', db.sequelize.col('custom_name')),
          { [Op.like]: `%${lowerQuery}%` }
        ),
        db.sequelize.where(
          db.sequelize.fn('LOWER', db.sequelize.col('custom_notes')),
          { [Op.like]: `%${lowerQuery}%` }
        )
      ]
    };

    const { rows, count } = await db.Contact.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['last_message_at', 'DESC']]
    });

    return {
      results: rows,
      pagination: {
        total: count,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: parseInt(offset) + rows.length < count
      }
    };
  }

  /**
   * Global search across messages, contacts, and chats
   */
  async globalSearch(sessionId, query, options = {}) {
    const { limit = 20 } = options;

    const [messages, contacts] = await Promise.all([
      this.searchMessages({ sessionId, query, limit }),
      this.searchContacts(sessionId, query, { limit })
    ]);

    return {
      messages: messages.results,
      contacts: contacts.results,
      totalMessages: messages.pagination.total,
      totalContacts: contacts.pagination.total
    };
  }

  /**
   * Highlight search matches in content
   */
  highlightMatch(content, query) {
    if (!content || !query) return content;
    
    const words = query.toLowerCase().split(/\s+/).filter(w => w.length > 1);
    let highlighted = content;
    
    for (const word of words) {
      const regex = new RegExp(`(${this.escapeRegex(word)})`, 'gi');
      highlighted = highlighted.replace(regex, '**$1**');
    }
    
    return highlighted;
  }

  /**
   * Escape special regex characters
   */
  escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Boolean mode query helper
   * Converts natural query to boolean mode operators
   * 
   * Examples:
   * - "hello world" -> "+hello +world" (AND)
   * - "hello -spam" -> "+hello -spam" (NOT spam)
   * - "hello*" -> "+hello*" (prefix match)
   */
  toBooleanQuery(query) {
    const words = query.trim().split(/\s+/);
    return words.map(word => {
      if (word.startsWith('-')) return word; // Keep NOT operator
      if (word.startsWith('+')) return word; // Keep AND operator
      if (word.endsWith('*')) return `+${word}`; // Prefix match
      return `+${word}`; // Default to AND
    }).join(' ');
  }
}

module.exports = new SearchService();
