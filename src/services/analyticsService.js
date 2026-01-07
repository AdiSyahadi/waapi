const { MessageAnalytics, ApiAnalytics, SessionAnalytics, ActivityLog, User, Session, Subscription, Transaction, Invoice, Plan, Message, sequelize } = require('../models');
const { Op, fn, col, literal } = require('sequelize');

class AnalyticsService {
  /**
   * Track message event
   */
  async trackMessage(userId, sessionId, eventType, count = 1) {
    const today = new Date().toISOString().split('T')[0];

    const [analytics] = await MessageAnalytics.findOrCreate({
      where: { userId, sessionId, date: today },
      defaults: { userId, sessionId, date: today }
    });

    const fieldMap = {
      sent: 'messagesSent',
      delivered: 'messagesDelivered',
      read: 'messagesRead',
      failed: 'messagesFailed',
      received: 'messagesReceived',
      media: 'mediaSent',
      broadcast: 'broadcastsSent',
      broadcast_recipients: 'broadcastRecipients'
    };

    const field = fieldMap[eventType];
    if (field) {
      await analytics.increment(field, { by: count });
    }

    return analytics;
  }

  /**
   * Track API request
   */
  async trackApiRequest(userId, endpoint, method, success, responseTime) {
    const today = new Date().toISOString().split('T')[0];

    const [analytics, created] = await ApiAnalytics.findOrCreate({
      where: { userId, endpoint, method, date: today },
      defaults: { userId, endpoint, method, date: today }
    });

    const updateData = {
      totalRequests: analytics.totalRequests + 1,
      successfulRequests: analytics.successfulRequests + (success ? 1 : 0),
      failedRequests: analytics.failedRequests + (success ? 0 : 1)
    };

    // Calculate running average for response time
    const totalBefore = analytics.totalRequests;
    const avgBefore = analytics.avgResponseTime;
    updateData.avgResponseTime = ((avgBefore * totalBefore) + responseTime) / (totalBefore + 1);

    await analytics.update(updateData);
    return analytics;
  }

  /**
   * Track session event
   */
  async trackSessionEvent(userId, sessionId, eventType) {
    const today = new Date().toISOString().split('T')[0];

    const [analytics] = await SessionAnalytics.findOrCreate({
      where: { userId, sessionId, date: today },
      defaults: { userId, sessionId, date: today }
    });

    const fieldMap = {
      disconnect: 'disconnections',
      reconnect: 'reconnections',
      qr_scan: 'qrScans',
      uptime: 'uptimeMinutes'
    };

    const field = fieldMap[eventType];
    if (field) {
      await analytics.increment(field);
    }

    return analytics;
  }

  /**
   * Log activity
   */
  async logActivity(userId, eventType, data = {}, req = null) {
    return await ActivityLog.create({
      userId,
      sessionId: data.sessionId || null,
      eventType,
      eventData: data,
      ipAddress: req ? (req.ip || req.connection?.remoteAddress) : null,
      userAgent: req ? req.get('User-Agent') : null
    });
  }

  /**
   * Get message statistics for a user
   */
  async getMessageStats(userId, startDate, endDate, sessionId = null) {
    const where = {
      userId,
      date: { [Op.between]: [startDate, endDate] }
    };

    if (sessionId) {
      where.sessionId = sessionId;
    }

    const stats = await MessageAnalytics.findAll({
      where,
      attributes: [
        'date',
        [fn('SUM', col('messages_sent')), 'messagesSent'],
        [fn('SUM', col('messages_delivered')), 'messagesDelivered'],
        [fn('SUM', col('messages_read')), 'messagesRead'],
        [fn('SUM', col('messages_failed')), 'messagesFailed'],
        [fn('SUM', col('messages_received')), 'messagesReceived'],
        [fn('SUM', col('media_sent')), 'mediaSent'],
        [fn('SUM', col('broadcasts_sent')), 'broadcastsSent'],
        [fn('SUM', col('broadcast_recipients')), 'broadcastRecipients']
      ],
      group: ['date'],
      order: [['date', 'ASC']]
    });

    // Calculate totals
    const totals = await MessageAnalytics.findOne({
      where,
      attributes: [
        [fn('SUM', col('messages_sent')), 'totalSent'],
        [fn('SUM', col('messages_delivered')), 'totalDelivered'],
        [fn('SUM', col('messages_read')), 'totalRead'],
        [fn('SUM', col('messages_failed')), 'totalFailed'],
        [fn('SUM', col('messages_received')), 'totalReceived'],
        [fn('SUM', col('media_sent')), 'totalMedia'],
        [fn('SUM', col('broadcasts_sent')), 'totalBroadcasts']
      ],
      raw: true
    });

    // Fallback: If no analytics data, get from messages table directly
    if (!totals || parseInt(totals?.totalSent || 0) === 0) {
      console.log('[Analytics Fallback] Querying messages table directly for userId:', userId);
      
      // Get user's sessions first
      const userSessions = await Session.findAll({
        where: { user_id: userId },
        attributes: ['id'],
        raw: true
      });
      
      const sessionIds = userSessions.map(s => s.id);
      console.log('[Analytics Fallback] Found', sessionIds.length, 'sessions for user');
      
      if (sessionIds.length === 0) {
        console.log('[Analytics Fallback] No sessions found, returning empty data');
        return {
          daily: [],
          totals: {
            sent: 0,
            delivered: 0,
            read: 0,
            failed: 0,
            received: 0,
            media: 0,
            broadcasts: 0
          },
          deliveryRate: 0,
          readRate: 0
        };
      }

      const messageWhere = {
        session_id: sessionIds,
        created_at: { [Op.between]: [new Date(startDate), new Date(endDate)] }
      };

      if (sessionId) {
        messageWhere.session_id = sessionId;
      }

      const totalMessages = await Message.count({ where: messageWhere });
      const deliveredMessages = await Message.count({ where: { ...messageWhere, status: 'delivered' } });
      const readMessages = await Message.count({ where: { ...messageWhere, status: 'read' } });
      const failedMessages = await Message.count({ where: { ...messageWhere, status: 'failed' } });

      console.log('[Analytics Fallback] Found messages:', {
        total: totalMessages,
        delivered: deliveredMessages,
        read: readMessages,
        failed: failedMessages
      });

      return {
        daily: [],
        totals: {
          sent: totalMessages,
          delivered: deliveredMessages,
          read: readMessages,
          failed: failedMessages,
          received: 0,
          media: 0,
          broadcasts: 0
        },
        deliveryRate: totalMessages > 0 
          ? ((deliveredMessages / totalMessages) * 100).toFixed(2) 
          : 0,
        readRate: deliveredMessages > 0 
          ? ((readMessages / deliveredMessages) * 100).toFixed(2) 
          : 0
      };
    }

    return {
      daily: stats,
      totals: {
        sent: parseInt(totals?.totalSent || 0),
        delivered: parseInt(totals?.totalDelivered || 0),
        read: parseInt(totals?.totalRead || 0),
        failed: parseInt(totals?.totalFailed || 0),
        received: parseInt(totals?.totalReceived || 0),
        media: parseInt(totals?.totalMedia || 0),
        broadcasts: parseInt(totals?.totalBroadcasts || 0)
      },
      deliveryRate: totals?.totalSent > 0 
        ? ((totals.totalDelivered / totals.totalSent) * 100).toFixed(2) 
        : 0,
      readRate: totals?.totalDelivered > 0 
        ? ((totals.totalRead / totals.totalDelivered) * 100).toFixed(2) 
        : 0
    };
  }

  /**
   * Get API usage statistics
   */
  async getApiStats(userId, startDate, endDate) {
    const where = {
      userId,
      date: { [Op.between]: [startDate, endDate] }
    };

    // Daily totals
    const daily = await ApiAnalytics.findAll({
      where,
      attributes: [
        'date',
        [fn('SUM', col('total_requests')), 'totalRequests'],
        [fn('SUM', col('successful_requests')), 'successfulRequests'],
        [fn('SUM', col('failed_requests')), 'failedRequests'],
        [fn('AVG', col('avg_response_time')), 'avgResponseTime']
      ],
      group: ['date'],
      order: [['date', 'ASC']]
    });

    // Top endpoints
    const topEndpoints = await ApiAnalytics.findAll({
      where,
      attributes: [
        'endpoint',
        'method',
        [fn('SUM', col('total_requests')), 'totalRequests']
      ],
      group: ['endpoint', 'method'],
      order: [[fn('SUM', col('total_requests')), 'DESC']],
      limit: 10
    });

    // Totals
    const totals = await ApiAnalytics.findOne({
      where,
      attributes: [
        [fn('SUM', col('total_requests')), 'totalRequests'],
        [fn('SUM', col('successful_requests')), 'successfulRequests'],
        [fn('SUM', col('failed_requests')), 'failedRequests'],
        [fn('AVG', col('avg_response_time')), 'avgResponseTime']
      ],
      raw: true
    });

    return {
      daily,
      topEndpoints,
      totals: {
        requests: parseInt(totals?.totalRequests || 0),
        successful: parseInt(totals?.successfulRequests || 0),
        failed: parseInt(totals?.failedRequests || 0),
        avgResponseTime: parseFloat(totals?.avgResponseTime || 0).toFixed(2)
      },
      successRate: totals?.totalRequests > 0
        ? ((totals.successfulRequests / totals.totalRequests) * 100).toFixed(2)
        : 100
    };
  }

  /**
   * Get session statistics
   */
  async getSessionStats(userId, startDate, endDate) {
    const where = {
      userId,
      date: { [Op.between]: [startDate, endDate] }
    };

    const stats = await SessionAnalytics.findAll({
      where,
      attributes: [
        'sessionId',
        [fn('SUM', col('uptime_minutes')), 'totalUptime'],
        [fn('SUM', col('disconnections')), 'totalDisconnections'],
        [fn('SUM', col('reconnections')), 'totalReconnections'],
        [fn('SUM', col('qr_scans')), 'totalQrScans']
      ],
      group: ['sessionId']
    });

    // Get current session status
    const sessions = await Session.findAll({
      where: { userId },
      attributes: ['sessionId', 'name', 'status', 'lastActive']
    });

    return {
      sessions: stats.map(s => ({
        sessionId: s.sessionId,
        uptimeHours: (parseInt(s.dataValues.totalUptime || 0) / 60).toFixed(2),
        disconnections: parseInt(s.dataValues.totalDisconnections || 0),
        reconnections: parseInt(s.dataValues.totalReconnections || 0),
        qrScans: parseInt(s.dataValues.totalQrScans || 0)
      })),
      currentStatus: sessions.map(s => ({
        sessionId: s.sessionId,
        name: s.name,
        status: s.status,
        lastActive: s.lastActive
      }))
    };
  }

  /**
   * Get recent activity
   */
  async getRecentActivity(userId, limit = 50) {
    // Try to get from activity logs first
    const activityLogs = await ActivityLog.findAll({
      where: { userId },
      order: [['createdAt', 'DESC']],
      limit
    });

    if (activityLogs && activityLogs.length > 0) {
      return activityLogs.map(log => ({
        event: log.eventType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        timestamp: log.createdAt,
        status: 'success',
        details: log.eventData
      }));
    }

    // Fallback: Get recent messages as activity via session
    try {
      // Get user's sessions first
      const userSessions = await Session.findAll({
        where: { user_id: userId },
        attributes: ['id'],
        raw: true
      });
      
      const sessionIds = userSessions.map(s => s.id);
      
      if (sessionIds.length === 0) {
        return [{
          event: 'No activity yet',
          timestamp: new Date(),
          status: 'info',
          details: { message: 'Start sending messages to see activity here' }
        }];
      }

      const recentMessages = await Message.findAll({
        where: { session_id: sessionIds },
        order: [['created_at', 'DESC']],
        limit: limit,
        attributes: ['id', 'type', 'status', 'created_at', 'remote_jid']
      });

      if (recentMessages.length === 0) {
        return [{
          event: 'No messages yet',
          timestamp: new Date(),
          status: 'info',
          details: { message: 'Start sending messages to see activity here' }
        }];
      }

      return recentMessages.map(msg => ({
        event: `Message ${msg.type || 'text'} sent to ${msg.remote_jid}`,
        timestamp: msg.created_at,
        status: msg.status === 'sent' || msg.status === 'delivered' || msg.status === 'read' ? 'success' : 'failed',
        details: { messageId: msg.id, type: msg.type }
      }));
    } catch (error) {
      console.error('[getRecentActivity] Error:', error);
      return [{
        event: 'Error loading activity',
        timestamp: new Date(),
        status: 'error',
        details: { error: error.message }
      }];
    }
  }

  /**
   * Get dashboard overview (user)
   */
  async getUserDashboard(userId) {
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const startDate = thirtyDaysAgo.toISOString().split('T')[0];
    const endDate = today.toISOString().split('T')[0];

    // Get various stats in parallel
    const [messageStats, apiStats, sessions, subscription, recentActivity] = await Promise.all([
      this.getMessageStats(userId, startDate, endDate),
      this.getApiStats(userId, startDate, endDate),
      Session.count({ where: { user_id: userId, status: 'connected' } }),
      Subscription.findOne({
        where: { user_id: userId, status: 'active' },
        include: [{ model: Plan, as: 'plan' }]
      }),
      this.getRecentActivity(userId, 10)
    ]);

    return {
      overview: {
        activeSessions: sessions,
        plan: subscription?.plan?.name || 'Free',
        messagesSentToday: messageStats.totals.sent,
        deliveryRate: messageStats.deliveryRate,
        apiRequestsToday: apiStats.totals.requests,
        apiSuccessRate: apiStats.successRate
      },
      messageStats,
      apiStats,
      recentActivity
    };
  }

  /**
   * Get admin dashboard (platform-wide)
   */
  async getAdminDashboard() {
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // User stats
    const totalUsers = await User.count();
    const activeUsers = await User.count({ where: { status: 'active' } });
    const newUsersThisWeek = await User.count({
      where: { createdAt: { [Op.gte]: sevenDaysAgo } }
    });
    const newUsersThisMonth = await User.count({
      where: { createdAt: { [Op.gte]: thirtyDaysAgo } }
    });

    // Session stats
    const totalSessions = await Session.count();
    const connectedSessions = await Session.count({ where: { status: 'connected' } });

    // Subscription stats
    const activeSubscriptions = await Subscription.count({
      where: { status: 'active' }
    });

    const subscriptionsByPlan = await Subscription.findAll({
      where: { status: 'active' },
      attributes: [
        'planId',
        [fn('COUNT', col('Subscription.id')), 'count']
      ],
      include: [{ model: Plan, as: 'plan', attributes: ['name'] }],
      group: ['planId', 'plan.id'],
      raw: true
    });

    // Message stats (platform-wide)
    const messageStats = await MessageAnalytics.findOne({
      where: {
        date: { [Op.gte]: thirtyDaysAgo.toISOString().split('T')[0] }
      },
      attributes: [
        [fn('SUM', col('messages_sent')), 'totalSent'],
        [fn('SUM', col('messages_delivered')), 'totalDelivered'],
        [fn('SUM', col('broadcasts_sent')), 'totalBroadcasts']
      ],
      raw: true
    });

    // Revenue stats
    const revenueThisMonth = await Transaction.sum('amount', {
      where: {
        status: 'succeeded',
        createdAt: { [Op.gte]: thirtyDaysAgo }
      }
    }) || 0;

    // Daily new users (last 30 days)
    const dailyNewUsers = await User.findAll({
      where: { createdAt: { [Op.gte]: thirtyDaysAgo } },
      attributes: [
        [fn('DATE', col('created_at')), 'date'],
        [fn('COUNT', col('id')), 'count']
      ],
      group: [fn('DATE', col('created_at'))],
      order: [[fn('DATE', col('created_at')), 'ASC']],
      raw: true
    });

    // Daily messages (last 30 days)
    const dailyMessages = await MessageAnalytics.findAll({
      where: {
        date: { [Op.gte]: thirtyDaysAgo.toISOString().split('T')[0] }
      },
      attributes: [
        'date',
        [fn('SUM', col('messages_sent')), 'messagesSent']
      ],
      group: ['date'],
      order: [['date', 'ASC']]
    });

    return {
      users: {
        total: totalUsers,
        active: activeUsers,
        newThisWeek: newUsersThisWeek,
        newThisMonth: newUsersThisMonth,
        dailyGrowth: dailyNewUsers
      },
      sessions: {
        total: totalSessions,
        connected: connectedSessions,
        connectionRate: totalSessions > 0 
          ? ((connectedSessions / totalSessions) * 100).toFixed(2) 
          : 0
      },
      subscriptions: {
        active: activeSubscriptions,
        byPlan: subscriptionsByPlan.map(s => ({
          plan: s['plan.name'],
          count: parseInt(s.count)
        }))
      },
      messages: {
        totalSent: parseInt(messageStats?.totalSent || 0),
        totalDelivered: parseInt(messageStats?.totalDelivered || 0),
        totalBroadcasts: parseInt(messageStats?.totalBroadcasts || 0),
        dailyTrend: dailyMessages
      },
      revenue: {
        thisMonth: parseFloat(revenueThisMonth).toFixed(2)
      }
    };
  }

  /**
   * Export analytics data
   */
  async exportAnalytics(userId, type, startDate, endDate, format = 'json') {
    let data;

    switch (type) {
      case 'messages':
        data = await MessageAnalytics.findAll({
          where: {
            userId,
            date: { [Op.between]: [startDate, endDate] }
          },
          order: [['date', 'ASC']]
        });
        break;

      case 'api':
        data = await ApiAnalytics.findAll({
          where: {
            userId,
            date: { [Op.between]: [startDate, endDate] }
          },
          order: [['date', 'ASC']]
        });
        break;

      case 'sessions':
        data = await SessionAnalytics.findAll({
          where: {
            userId,
            date: { [Op.between]: [startDate, endDate] }
          },
          order: [['date', 'ASC']]
        });
        break;

      case 'activity':
        data = await ActivityLog.findAll({
          where: {
            userId,
            createdAt: { [Op.between]: [startDate, endDate] }
          },
          order: [['createdAt', 'ASC']]
        });
        break;

      default:
        throw new Error('Invalid export type');
    }

    if (format === 'csv') {
      return this.convertToCSV(data);
    }

    return data;
  }

  /**
   * Convert data to CSV format
   */
  convertToCSV(data) {
    if (!data || data.length === 0) return '';

    const rows = data.map(item => item.toJSON ? item.toJSON() : item);
    const headers = Object.keys(rows[0]);
    
    const csvRows = [
      headers.join(','),
      ...rows.map(row => 
        headers.map(header => {
          const value = row[header];
          if (typeof value === 'object') {
            return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
          }
          return `"${String(value || '').replace(/"/g, '""')}"`;
        }).join(',')
      )
    ];

    return csvRows.join('\n');
  }

  /**
   * Cleanup old analytics data
   */
  async cleanupOldData(daysToKeep = 90) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    const cutoff = cutoffDate.toISOString().split('T')[0];

    const [messageDeleted] = await MessageAnalytics.destroy({
      where: { date: { [Op.lt]: cutoff } }
    });

    const [apiDeleted] = await ApiAnalytics.destroy({
      where: { date: { [Op.lt]: cutoff } }
    });

    const [sessionDeleted] = await SessionAnalytics.destroy({
      where: { date: { [Op.lt]: cutoff } }
    });

    const [activityDeleted] = await ActivityLog.destroy({
      where: { createdAt: { [Op.lt]: cutoffDate } }
    });

    return {
      messageAnalytics: messageDeleted,
      apiAnalytics: apiDeleted,
      sessionAnalytics: sessionDeleted,
      activityLogs: activityDeleted
    };
  }
}

module.exports = new AnalyticsService();
