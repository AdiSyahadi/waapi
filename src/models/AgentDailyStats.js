/**
 * AgentDailyStats Model - Aggregated daily performance metrics
 * Fixes Issue #8: Pre-aggregated stats for fast dashboard queries
 * 
 * Instead of calculating stats on-the-fly, this table stores
 * daily aggregated metrics per agent for quick retrieval.
 */
module.exports = (sequelize, DataTypes) => {
  const AgentDailyStats = sequelize.define('AgentDailyStats', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    agent_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    session_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'sessions',
        key: 'id'
      }
    },
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    // Conversation counts
    conversations_handled: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    conversations_resolved: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    conversations_transferred: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    // Message counts
    messages_sent: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    messages_received: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    // Response times
    avg_first_response_seconds: {
      type: DataTypes.FLOAT,
      allowNull: true
    },
    avg_response_time_seconds: {
      type: DataTypes.FLOAT,
      allowNull: true
    },
    avg_resolution_time_seconds: {
      type: DataTypes.FLOAT,
      allowNull: true
    },
    // SLA
    sla_met_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    sla_breached_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    sla_compliance_rate: {
      type: DataTypes.FLOAT,
      allowNull: true,
      comment: 'Percentage 0-100'
    },
    // CSAT
    csat_responses: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    csat_total_score: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    csat_average: {
      type: DataTypes.FLOAT,
      allowNull: true
    },
    // Time tracking
    online_duration_minutes: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    busy_duration_minutes: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    }
  }, {
    tableName: 'agent_daily_stats',
    underscored: true,
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['agent_id', 'session_id', 'date'],
        name: 'agent_stats_unique'
      }
    ]
  });

  AgentDailyStats.associate = (models) => {
    AgentDailyStats.belongsTo(models.User, {
      foreignKey: 'agent_id',
      as: 'agent'
    });
    AgentDailyStats.belongsTo(models.Session, {
      foreignKey: 'session_id',
      as: 'session'
    });
  };

  /**
   * Get or create today's stats record for an agent
   */
  AgentDailyStats.getOrCreateToday = async function(agentId, sessionId = null) {
    const today = new Date().toISOString().split('T')[0];
    
    const [stats, created] = await this.findOrCreate({
      where: {
        agent_id: agentId,
        session_id: sessionId,
        date: today
      },
      defaults: {}
    });

    return stats;
  };

  /**
   * Increment a counter for today
   */
  AgentDailyStats.incrementStat = async function(agentId, sessionId, field, amount = 1) {
    const stats = await this.getOrCreateToday(agentId, sessionId);
    stats[field] = (stats[field] || 0) + amount;
    await stats.save();
    return stats;
  };

  /**
   * Update response time averages
   */
  AgentDailyStats.updateResponseTime = async function(agentId, sessionId, firstResponseSeconds, resolutionSeconds = null) {
    const stats = await this.getOrCreateToday(agentId, sessionId);
    
    // Recalculate averages
    const resolved = stats.conversations_resolved + 1;
    
    if (firstResponseSeconds !== null) {
      const currentTotal = (stats.avg_first_response_seconds || 0) * (resolved - 1);
      stats.avg_first_response_seconds = (currentTotal + firstResponseSeconds) / resolved;
    }

    if (resolutionSeconds !== null) {
      const currentTotal = (stats.avg_resolution_time_seconds || 0) * (resolved - 1);
      stats.avg_resolution_time_seconds = (currentTotal + resolutionSeconds) / resolved;
    }

    await stats.save();
    return stats;
  };

  /**
   * Get stats for date range
   */
  AgentDailyStats.getStatsRange = async function(agentId, startDate, endDate, sessionId = null) {
    const { Op } = sequelize.Sequelize;
    
    const where = {
      agent_id: agentId,
      date: {
        [Op.between]: [startDate, endDate]
      }
    };
    
    if (sessionId) {
      where.session_id = sessionId;
    }

    const stats = await this.findAll({
      where,
      order: [['date', 'ASC']]
    });

    // Aggregate totals
    const totals = {
      conversationsHandled: 0,
      conversationsResolved: 0,
      messagesSent: 0,
      messagesReceived: 0,
      slaMetCount: 0,
      slaBreachedCount: 0,
      csatResponses: 0,
      csatTotalScore: 0,
      onlineMinutes: 0
    };

    for (const day of stats) {
      totals.conversationsHandled += day.conversations_handled;
      totals.conversationsResolved += day.conversations_resolved;
      totals.messagesSent += day.messages_sent;
      totals.messagesReceived += day.messages_received;
      totals.slaMetCount += day.sla_met_count;
      totals.slaBreachedCount += day.sla_breached_count;
      totals.csatResponses += day.csat_responses;
      totals.csatTotalScore += day.csat_total_score;
      totals.onlineMinutes += day.online_duration_minutes;
    }

    return {
      daily: stats,
      totals: {
        ...totals,
        slaComplianceRate: totals.slaMetCount + totals.slaBreachedCount > 0
          ? ((totals.slaMetCount / (totals.slaMetCount + totals.slaBreachedCount)) * 100).toFixed(1)
          : null,
        csatAverage: totals.csatResponses > 0
          ? (totals.csatTotalScore / totals.csatResponses).toFixed(1)
          : null
      }
    };
  };

  return AgentDailyStats;
};
