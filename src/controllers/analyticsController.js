const analyticsService = require('../services/analyticsService');
const { MessageAnalytics, ApiAnalytics, SessionAnalytics, ActivityLog, User, Session } = require('../models');
const { Op } = require('sequelize');

/**
 * Get user dashboard overview
 * GET /api/analytics/dashboard
 */
exports.getDashboard = async (req, res) => {
  try {
    const dashboard = await analyticsService.getUserDashboard(req.user.id);

    res.json({
      success: true,
      data: dashboard
    });
  } catch (error) {
    console.error('Get dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get dashboard',
      error: error.message
    });
  }
};

/**
 * Get message statistics
 * GET /api/analytics/messages
 */
exports.getMessageStats = async (req, res) => {
  try {
    const { startDate, endDate, sessionId } = req.query;

    // Default to last 30 days
    const end = endDate || new Date().toISOString().split('T')[0];
    const start = startDate || (() => {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      return d.toISOString().split('T')[0];
    })();

    const stats = await analyticsService.getMessageStats(
      req.user.id,
      start,
      end,
      sessionId
    );

    res.json({
      success: true,
      data: {
        period: { startDate: start, endDate: end },
        ...stats
      }
    });
  } catch (error) {
    console.error('Get message stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get message statistics',
      error: error.message
    });
  }
};

/**
 * Get API usage statistics
 * GET /api/analytics/api
 */
exports.getApiStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const end = endDate || new Date().toISOString().split('T')[0];
    const start = startDate || (() => {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      return d.toISOString().split('T')[0];
    })();

    const stats = await analyticsService.getApiStats(req.user.id, start, end);

    res.json({
      success: true,
      data: {
        period: { startDate: start, endDate: end },
        ...stats
      }
    });
  } catch (error) {
    console.error('Get API stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get API statistics',
      error: error.message
    });
  }
};

/**
 * Get session statistics
 * GET /api/analytics/sessions
 */
exports.getSessionStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const end = endDate || new Date().toISOString().split('T')[0];
    const start = startDate || (() => {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      return d.toISOString().split('T')[0];
    })();

    const stats = await analyticsService.getSessionStats(req.user.id, start, end);

    res.json({
      success: true,
      data: {
        period: { startDate: start, endDate: end },
        ...stats
      }
    });
  } catch (error) {
    console.error('Get session stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get session statistics',
      error: error.message
    });
  }
};

/**
 * Get recent activity
 * GET /api/analytics/activity
 */
exports.getRecentActivity = async (req, res) => {
  try {
    const { limit = 50, eventType } = req.query;

    const where = { userId: req.user.id };
    if (eventType) {
      where.eventType = eventType;
    }

    const activity = await ActivityLog.findAll({
      where,
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit)
    });

    res.json({
      success: true,
      data: activity
    });
  } catch (error) {
    console.error('Get activity error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get activity logs',
      error: error.message
    });
  }
};

/**
 * Export analytics data
 * GET /api/analytics/export
 */
exports.exportAnalytics = async (req, res) => {
  try {
    const { type, startDate, endDate, format = 'json' } = req.query;

    if (!type || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'type, startDate, and endDate are required'
      });
    }

    const validTypes = ['messages', 'api', 'sessions', 'activity'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        message: `Invalid type. Must be one of: ${validTypes.join(', ')}`
      });
    }

    const data = await analyticsService.exportAnalytics(
      req.user.id,
      type,
      startDate,
      endDate,
      format
    );

    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=${type}_analytics_${startDate}_${endDate}.csv`);
      return res.send(data);
    }

    res.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Export analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export analytics',
      error: error.message
    });
  }
};

/**
 * Get realtime stats (WebSocket-friendly endpoint)
 * GET /api/analytics/realtime
 */
exports.getRealtimeStats = async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    const [messageStats, activeSessions] = await Promise.all([
      MessageAnalytics.findOne({
        where: {
          userId: req.user.id,
          date: today
        },
        attributes: [
          'messagesSent', 'messagesDelivered', 'messagesRead',
          'messagesFailed', 'messagesReceived'
        ]
      }),
      Session.count({
        where: { userId: req.user.id, status: 'connected' }
      })
    ]);

    res.json({
      success: true,
      data: {
        timestamp: new Date().toISOString(),
        today: {
          messagesSent: messageStats?.messagesSent || 0,
          messagesDelivered: messageStats?.messagesDelivered || 0,
          messagesRead: messageStats?.messagesRead || 0,
          messagesFailed: messageStats?.messagesFailed || 0,
          messagesReceived: messageStats?.messagesReceived || 0
        },
        activeSessions
      }
    });
  } catch (error) {
    console.error('Get realtime stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get realtime stats',
      error: error.message
    });
  }
};

// ==================== ADMIN ENDPOINTS ====================

/**
 * Admin: Get platform dashboard
 * GET /api/analytics/admin/dashboard
 */
exports.getAdminDashboard = async (req, res) => {
  try {
    const dashboard = await analyticsService.getAdminDashboard();

    res.json({
      success: true,
      data: dashboard
    });
  } catch (error) {
    console.error('Get admin dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get admin dashboard',
      error: error.message
    });
  }
};

/**
 * Admin: Get platform-wide message stats
 * GET /api/analytics/admin/messages
 */
exports.getAdminMessageStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const end = endDate || new Date().toISOString().split('T')[0];
    const start = startDate || (() => {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      return d.toISOString().split('T')[0];
    })();

    const stats = await MessageAnalytics.findAll({
      where: {
        date: { [Op.between]: [start, end] }
      },
      attributes: [
        'date',
        [MessageAnalytics.sequelize.fn('SUM', MessageAnalytics.sequelize.col('messages_sent')), 'totalSent'],
        [MessageAnalytics.sequelize.fn('SUM', MessageAnalytics.sequelize.col('messages_delivered')), 'totalDelivered'],
        [MessageAnalytics.sequelize.fn('SUM', MessageAnalytics.sequelize.col('messages_failed')), 'totalFailed'],
        [MessageAnalytics.sequelize.fn('COUNT', MessageAnalytics.sequelize.fn('DISTINCT', MessageAnalytics.sequelize.col('user_id'))), 'activeUsers']
      ],
      group: ['date'],
      order: [['date', 'ASC']]
    });

    // Top users by message volume
    const topUsers = await MessageAnalytics.findAll({
      where: {
        date: { [Op.between]: [start, end] }
      },
      attributes: [
        'userId',
        [MessageAnalytics.sequelize.fn('SUM', MessageAnalytics.sequelize.col('messages_sent')), 'totalSent']
      ],
      include: [{
        model: User,
        as: 'user',
        attributes: ['email', 'name']
      }],
      group: ['userId', 'user.id'],
      order: [[MessageAnalytics.sequelize.fn('SUM', MessageAnalytics.sequelize.col('messages_sent')), 'DESC']],
      limit: 10
    });

    res.json({
      success: true,
      data: {
        period: { startDate: start, endDate: end },
        daily: stats,
        topUsers: topUsers.map(u => ({
          userId: u.userId,
          email: u.user?.email,
          name: u.user?.name,
          totalSent: parseInt(u.dataValues.totalSent)
        }))
      }
    });
  } catch (error) {
    console.error('Get admin message stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get admin message stats',
      error: error.message
    });
  }
};

/**
 * Admin: Get user analytics
 * GET /api/analytics/admin/users/:userId
 */
exports.getAdminUserAnalytics = async (req, res) => {
  try {
    const { userId } = req.params;
    const { startDate, endDate } = req.query;

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const end = endDate || new Date().toISOString().split('T')[0];
    const start = startDate || (() => {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      return d.toISOString().split('T')[0];
    })();

    const [messageStats, apiStats, sessionStats, recentActivity] = await Promise.all([
      analyticsService.getMessageStats(userId, start, end),
      analyticsService.getApiStats(userId, start, end),
      analyticsService.getSessionStats(userId, start, end),
      analyticsService.getRecentActivity(userId, 20)
    ]);

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          createdAt: user.createdAt
        },
        period: { startDate: start, endDate: end },
        messageStats,
        apiStats,
        sessionStats,
        recentActivity
      }
    });
  } catch (error) {
    console.error('Get admin user analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get user analytics',
      error: error.message
    });
  }
};

/**
 * Admin: Cleanup old analytics data
 * POST /api/analytics/admin/cleanup
 */
exports.cleanupAnalytics = async (req, res) => {
  try {
    const { daysToKeep = 90 } = req.body;

    const result = await analyticsService.cleanupOldData(daysToKeep);

    res.json({
      success: true,
      message: 'Analytics cleanup completed',
      data: result
    });
  } catch (error) {
    console.error('Cleanup analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cleanup analytics',
      error: error.message
    });
  }
};

/**
 * Admin: Get system metrics
 * GET /api/analytics/admin/system
 */
exports.getSystemMetrics = async (req, res) => {
  try {
    const uptime = process.uptime();
    const memoryUsage = process.memoryUsage();
    
    // Database stats
    const [userCount, sessionCount, messageToday] = await Promise.all([
      User.count(),
      Session.count({ where: { status: 'connected' } }),
      MessageAnalytics.sum('messages_sent', {
        where: { date: new Date().toISOString().split('T')[0] }
      })
    ]);

    res.json({
      success: true,
      data: {
        server: {
          uptime: {
            seconds: uptime,
            formatted: `${Math.floor(uptime / 86400)}d ${Math.floor((uptime % 86400) / 3600)}h ${Math.floor((uptime % 3600) / 60)}m`
          },
          memory: {
            heapUsed: `${(memoryUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`,
            heapTotal: `${(memoryUsage.heapTotal / 1024 / 1024).toFixed(2)} MB`,
            rss: `${(memoryUsage.rss / 1024 / 1024).toFixed(2)} MB`
          },
          nodeVersion: process.version,
          platform: process.platform
        },
        database: {
          totalUsers: userCount,
          connectedSessions: sessionCount,
          messagesToday: messageToday || 0
        },
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Get system metrics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get system metrics',
      error: error.message
    });
  }
};
