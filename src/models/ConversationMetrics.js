/**
 * ConversationMetrics Model - SLA and Response Time Tracking
 * Fixes Issue #8: No SLA/response time tracking for agent performance
 * 
 * Tracks per-conversation:
 * - First response time
 * - Average response time
 * - Resolution time
 * - SLA compliance
 * - Customer satisfaction
 */
module.exports = (sequelize, DataTypes) => {
  const ConversationMetrics = sequelize.define('ConversationMetrics', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    session_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'sessions',
        key: 'id'
      }
    },
    chat_jid: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    agent_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      },
      comment: 'Agent handling this conversation'
    },
    // Conversation timing
    conversation_started_at: {
      type: DataTypes.DATE,
      allowNull: false,
      comment: 'When customer first messaged'
    },
    first_response_at: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'When agent first responded'
    },
    first_response_time_seconds: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Time to first response in seconds'
    },
    conversation_resolved_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    resolution_time_seconds: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Total time to resolution in seconds'
    },
    // Message counts
    customer_message_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    agent_message_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    total_message_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    // Response metrics
    avg_response_time_seconds: {
      type: DataTypes.FLOAT,
      allowNull: true,
      comment: 'Average time between customer message and agent response'
    },
    max_response_time_seconds: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    // Status
    status: {
      type: DataTypes.ENUM('active', 'waiting_customer', 'waiting_agent', 'resolved', 'abandoned'),
      defaultValue: 'active'
    },
    // SLA tracking
    sla_breached: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    sla_breach_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    sla_target_seconds: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'SLA target for first response'
    },
    // Customer satisfaction
    csat_score: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Customer satisfaction score 1-5'
    },
    csat_feedback: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    // Metadata
    tags: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: []
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    metadata: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: {}
    }
  }, {
    tableName: 'conversation_metrics',
    underscored: true,
    timestamps: true
  });

  ConversationMetrics.associate = (models) => {
    ConversationMetrics.belongsTo(models.Session, {
      foreignKey: 'session_id',
      as: 'session'
    });
    ConversationMetrics.belongsTo(models.User, {
      foreignKey: 'agent_id',
      as: 'agent'
    });
  };

  /**
   * Start tracking a new conversation
   */
  ConversationMetrics.startConversation = async function(sessionId, chatJid, slaTargetSeconds = 300) {
    // Check if there's an active conversation
    const existing = await this.findOne({
      where: {
        session_id: sessionId,
        chat_jid: chatJid,
        status: ['active', 'waiting_agent', 'waiting_customer']
      }
    });

    if (existing) {
      // Update existing conversation
      existing.customer_message_count += 1;
      existing.total_message_count += 1;
      existing.status = 'waiting_agent';
      await existing.save();
      return existing;
    }

    // Create new conversation
    return await this.create({
      session_id: sessionId,
      chat_jid: chatJid,
      conversation_started_at: new Date(),
      customer_message_count: 1,
      total_message_count: 1,
      status: 'waiting_agent',
      sla_target_seconds: slaTargetSeconds
    });
  };

  /**
   * Record agent's first response
   */
  ConversationMetrics.recordFirstResponse = async function(sessionId, chatJid, agentId) {
    const conversation = await this.findOne({
      where: {
        session_id: sessionId,
        chat_jid: chatJid,
        status: ['active', 'waiting_agent', 'waiting_customer']
      },
      order: [['created_at', 'DESC']]
    });

    if (!conversation) return null;

    const now = new Date();
    
    // Only update first response if not set
    if (!conversation.first_response_at) {
      const firstResponseTime = Math.floor(
        (now - conversation.conversation_started_at) / 1000
      );
      
      conversation.first_response_at = now;
      conversation.first_response_time_seconds = firstResponseTime;
      conversation.agent_id = agentId;

      // Check SLA breach
      if (conversation.sla_target_seconds && firstResponseTime > conversation.sla_target_seconds) {
        conversation.sla_breached = true;
        conversation.sla_breach_at = now;
      }
    }

    conversation.agent_message_count += 1;
    conversation.total_message_count += 1;
    conversation.status = 'waiting_customer';
    
    await conversation.save();
    return conversation;
  };

  /**
   * Record customer message (updates metrics)
   */
  ConversationMetrics.recordCustomerMessage = async function(sessionId, chatJid) {
    const conversation = await this.findOne({
      where: {
        session_id: sessionId,
        chat_jid: chatJid,
        status: ['active', 'waiting_agent', 'waiting_customer']
      },
      order: [['created_at', 'DESC']]
    });

    if (conversation) {
      conversation.customer_message_count += 1;
      conversation.total_message_count += 1;
      conversation.status = 'waiting_agent';
      await conversation.save();
      return conversation;
    }

    // Start new conversation if none exists
    return await this.startConversation(sessionId, chatJid);
  };

  /**
   * Resolve conversation
   */
  ConversationMetrics.resolveConversation = async function(sessionId, chatJid, notes = null) {
    const conversation = await this.findOne({
      where: {
        session_id: sessionId,
        chat_jid: chatJid,
        status: ['active', 'waiting_agent', 'waiting_customer']
      },
      order: [['created_at', 'DESC']]
    });

    if (!conversation) return null;

    const now = new Date();
    const resolutionTime = Math.floor(
      (now - conversation.conversation_started_at) / 1000
    );

    conversation.conversation_resolved_at = now;
    conversation.resolution_time_seconds = resolutionTime;
    conversation.status = 'resolved';
    if (notes) conversation.notes = notes;

    await conversation.save();
    return conversation;
  };

  /**
   * Get agent performance stats
   */
  ConversationMetrics.getAgentStats = async function(agentId, startDate, endDate) {
    const { Op } = sequelize.Sequelize;
    
    const conversations = await this.findAll({
      where: {
        agent_id: agentId,
        conversation_started_at: {
          [Op.between]: [startDate, endDate]
        }
      }
    });

    const resolved = conversations.filter(c => c.status === 'resolved');
    const slaMet = resolved.filter(c => !c.sla_breached);
    
    const avgFirstResponse = resolved.length > 0
      ? resolved.reduce((sum, c) => sum + (c.first_response_time_seconds || 0), 0) / resolved.length
      : null;
    
    const avgResolution = resolved.length > 0
      ? resolved.reduce((sum, c) => sum + (c.resolution_time_seconds || 0), 0) / resolved.length
      : null;

    const csatResponses = resolved.filter(c => c.csat_score !== null);
    const avgCsat = csatResponses.length > 0
      ? csatResponses.reduce((sum, c) => sum + c.csat_score, 0) / csatResponses.length
      : null;

    return {
      totalConversations: conversations.length,
      resolvedConversations: resolved.length,
      activeConversations: conversations.length - resolved.length,
      avgFirstResponseSeconds: avgFirstResponse ? Math.round(avgFirstResponse) : null,
      avgResolutionSeconds: avgResolution ? Math.round(avgResolution) : null,
      slaCompliance: resolved.length > 0 ? ((slaMet.length / resolved.length) * 100).toFixed(1) : null,
      csatAverage: avgCsat ? avgCsat.toFixed(1) : null,
      csatResponses: csatResponses.length
    };
  };

  return ConversationMetrics;
};
