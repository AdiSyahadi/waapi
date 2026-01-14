/**
 * Metrics Controller - SLA and Performance Reporting
 * Fixes Issue #8: No SLA/response time tracking for agent performance
 * 
 * Provides endpoints for:
 * - Agent performance metrics
 * - SLA compliance reports
 * - Response time analytics
 * - CSAT tracking
 */

const db = require('../models');
const { Op } = require('sequelize');
const logger = require('../utils/logger');

/**
 * Get agent performance stats
 * GET /api/v1/metrics/agents/:agentId/performance
 */
const getAgentPerformance = async (req, res) => {
  try {
    const { agentId } = req.params;
    const { 
      startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      endDate = new Date().toISOString().split('T')[0],
      sessionId
    } = req.query;

    // Verify agent exists
    const agent = await db.User.findByPk(agentId, {
      attributes: ['id', 'name', 'email']
    });

    if (!agent) {
      return res.status(404).json({
        success: false,
        message: 'Agent not found'
      });
    }

    // Get daily stats
    const dailyStats = await db.AgentDailyStats.getStatsRange(
      agentId,
      startDate,
      endDate,
      sessionId || null
    );

    // Get real-time conversation metrics
    const activeConversations = await db.ConversationMetrics.count({
      where: {
        agent_id: agentId,
        status: { [Op.in]: ['active', 'waiting_customer', 'waiting_agent'] }
      }
    });

    res.json({
      success: true,
      data: {
        agent: {
          id: agent.id,
          name: agent.name,
          email: agent.email
        },
        period: {
          startDate,
          endDate
        },
        summary: {
          ...dailyStats.totals,
          activeConversations
        },
        dailyBreakdown: dailyStats.daily.map(day => ({
          date: day.date,
          conversationsHandled: day.conversations_handled,
          conversationsResolved: day.conversations_resolved,
          messagesSent: day.messages_sent,
          messagesReceived: day.messages_received,
          avgFirstResponseSeconds: day.avg_first_response_seconds,
          avgResolutionSeconds: day.avg_resolution_time_seconds,
          slaMetCount: day.sla_met_count,
          slaBreachedCount: day.sla_breached_count,
          slaComplianceRate: day.sla_compliance_rate,
          csatAverage: day.csat_average
        }))
      }
    });
  } catch (error) {
    logger.error('Get agent performance error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get agent performance',
      error: error.message
    });
  }
};

/**
 * Get all agents performance summary
 * GET /api/v1/metrics/agents/summary
 */
const getAgentsSummary = async (req, res) => {
  try {
    const { 
      startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      endDate = new Date().toISOString().split('T')[0],
      sessionId
    } = req.query;

    // Get all agents with stats
    const statsWhere = {
      date: { [Op.between]: [startDate, endDate] }
    };
    if (sessionId) {
      const session = await db.Session.findOne({
        where: { session_id: sessionId, user_id: req.user.id }
      });
      if (session) {
        statsWhere.session_id = session.id;
      }
    }

    const agentStats = await db.AgentDailyStats.findAll({
      where: statsWhere,
      attributes: [
        'agent_id',
        [db.Sequelize.fn('SUM', db.Sequelize.col('conversations_handled')), 'total_conversations'],
        [db.Sequelize.fn('SUM', db.Sequelize.col('conversations_resolved')), 'total_resolved'],
        [db.Sequelize.fn('SUM', db.Sequelize.col('messages_sent')), 'total_messages_sent'],
        [db.Sequelize.fn('AVG', db.Sequelize.col('avg_first_response_seconds')), 'avg_first_response'],
        [db.Sequelize.fn('AVG', db.Sequelize.col('avg_resolution_time_seconds')), 'avg_resolution'],
        [db.Sequelize.fn('SUM', db.Sequelize.col('sla_met_count')), 'total_sla_met'],
        [db.Sequelize.fn('SUM', db.Sequelize.col('sla_breached_count')), 'total_sla_breached'],
        [db.Sequelize.fn('AVG', db.Sequelize.col('csat_average')), 'avg_csat']
      ],
      include: [{
        model: db.User,
        as: 'agent',
        attributes: ['id', 'name', 'email']
      }],
      group: ['agent_id', 'agent.id'],
      raw: false
    });

    const summary = agentStats.map(stat => {
      const slaMet = parseInt(stat.dataValues.total_sla_met) || 0;
      const slaBreached = parseInt(stat.dataValues.total_sla_breached) || 0;
      const slaTotal = slaMet + slaBreached;

      return {
        agent: stat.agent ? {
          id: stat.agent.id,
          name: stat.agent.name,
          email: stat.agent.email
        } : { id: stat.agent_id },
        totalConversations: parseInt(stat.dataValues.total_conversations) || 0,
        totalResolved: parseInt(stat.dataValues.total_resolved) || 0,
        totalMessagesSent: parseInt(stat.dataValues.total_messages_sent) || 0,
        avgFirstResponseSeconds: Math.round(parseFloat(stat.dataValues.avg_first_response) || 0),
        avgResolutionSeconds: Math.round(parseFloat(stat.dataValues.avg_resolution) || 0),
        slaComplianceRate: slaTotal > 0 ? ((slaMet / slaTotal) * 100).toFixed(1) : null,
        avgCsat: stat.dataValues.avg_csat ? parseFloat(stat.dataValues.avg_csat).toFixed(1) : null
      };
    });

    res.json({
      success: true,
      data: {
        period: { startDate, endDate },
        agents: summary.sort((a, b) => b.totalConversations - a.totalConversations)
      }
    });
  } catch (error) {
    logger.error('Get agents summary error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get agents summary',
      error: error.message
    });
  }
};

/**
 * Get SLA compliance report
 * GET /api/v1/metrics/sla/report
 */
const getSlaReport = async (req, res) => {
  try {
    const { 
      startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      endDate = new Date().toISOString().split('T')[0],
      sessionId,
      agentId
    } = req.query;

    const where = {
      conversation_started_at: { [Op.between]: [startDate, endDate] },
      status: 'resolved'
    };

    if (sessionId) {
      const session = await db.Session.findOne({
        where: { session_id: sessionId, user_id: req.user.id }
      });
      if (session) {
        where.session_id = session.id;
      }
    }

    if (agentId) {
      where.agent_id = agentId;
    }

    const conversations = await db.ConversationMetrics.findAll({
      where,
      attributes: [
        [db.Sequelize.fn('COUNT', db.Sequelize.col('id')), 'total'],
        [db.Sequelize.fn('SUM', db.Sequelize.literal('CASE WHEN sla_breached = false THEN 1 ELSE 0 END')), 'met'],
        [db.Sequelize.fn('SUM', db.Sequelize.literal('CASE WHEN sla_breached = true THEN 1 ELSE 0 END')), 'breached'],
        [db.Sequelize.fn('AVG', db.Sequelize.col('first_response_time_seconds')), 'avg_first_response'],
        [db.Sequelize.fn('AVG', db.Sequelize.col('resolution_time_seconds')), 'avg_resolution'],
        [db.Sequelize.fn('MAX', db.Sequelize.col('first_response_time_seconds')), 'max_first_response'],
        [db.Sequelize.fn('MIN', db.Sequelize.col('first_response_time_seconds')), 'min_first_response']
      ],
      raw: true
    });

    const stats = conversations[0];
    const total = parseInt(stats.total) || 0;
    const met = parseInt(stats.met) || 0;
    const breached = parseInt(stats.breached) || 0;

    // Get SLA breaches by hour for pattern analysis
    const breachesByHour = await db.ConversationMetrics.findAll({
      where: {
        ...where,
        sla_breached: true
      },
      attributes: [
        [db.Sequelize.fn('HOUR', db.Sequelize.col('conversation_started_at')), 'hour'],
        [db.Sequelize.fn('COUNT', db.Sequelize.col('id')), 'count']
      ],
      group: [db.Sequelize.fn('HOUR', db.Sequelize.col('conversation_started_at'))],
      raw: true
    });

    res.json({
      success: true,
      data: {
        period: { startDate, endDate },
        summary: {
          totalConversations: total,
          slaMet: met,
          slaBreached: breached,
          complianceRate: total > 0 ? ((met / total) * 100).toFixed(1) + '%' : 'N/A'
        },
        responseTimes: {
          avgFirstResponseSeconds: Math.round(parseFloat(stats.avg_first_response) || 0),
          avgFirstResponseFormatted: formatDuration(parseFloat(stats.avg_first_response) || 0),
          avgResolutionSeconds: Math.round(parseFloat(stats.avg_resolution) || 0),
          avgResolutionFormatted: formatDuration(parseFloat(stats.avg_resolution) || 0),
          maxFirstResponseSeconds: parseInt(stats.max_first_response) || 0,
          minFirstResponseSeconds: parseInt(stats.min_first_response) || 0
        },
        breachPatterns: breachesByHour.map(b => ({
          hour: b.hour,
          count: parseInt(b.count)
        }))
      }
    });
  } catch (error) {
    logger.error('Get SLA report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get SLA report',
      error: error.message
    });
  }
};

/**
 * Get conversation details with metrics
 * GET /api/v1/metrics/conversations/:conversationId
 */
const getConversationMetrics = async (req, res) => {
  try {
    const { conversationId } = req.params;

    const conversation = await db.ConversationMetrics.findByPk(conversationId, {
      include: [
        {
          model: db.User,
          as: 'agent',
          attributes: ['id', 'name', 'email']
        }
      ]
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found'
      });
    }

    res.json({
      success: true,
      data: {
        id: conversation.id,
        chatJid: conversation.chat_jid,
        status: conversation.status,
        agent: conversation.agent ? {
          id: conversation.agent.id,
          name: conversation.agent.name,
          email: conversation.agent.email
        } : null,
        timing: {
          startedAt: conversation.conversation_started_at,
          firstResponseAt: conversation.first_response_at,
          resolvedAt: conversation.conversation_resolved_at,
          firstResponseSeconds: conversation.first_response_time_seconds,
          firstResponseFormatted: formatDuration(conversation.first_response_time_seconds || 0),
          resolutionSeconds: conversation.resolution_time_seconds,
          resolutionFormatted: formatDuration(conversation.resolution_time_seconds || 0)
        },
        messages: {
          customerCount: conversation.customer_message_count,
          agentCount: conversation.agent_message_count,
          total: conversation.total_message_count
        },
        sla: {
          targetSeconds: conversation.sla_target_seconds,
          breached: conversation.sla_breached,
          breachedAt: conversation.sla_breach_at
        },
        satisfaction: {
          score: conversation.csat_score,
          feedback: conversation.csat_feedback
        },
        tags: conversation.tags,
        notes: conversation.notes
      }
    });
  } catch (error) {
    logger.error('Get conversation metrics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get conversation metrics',
      error: error.message
    });
  }
};

/**
 * Submit CSAT score for a conversation
 * POST /api/v1/metrics/conversations/:conversationId/csat
 */
const submitCsat = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { score, feedback } = req.body;

    if (!score || score < 1 || score > 5) {
      return res.status(400).json({
        success: false,
        message: 'Score must be between 1 and 5'
      });
    }

    const conversation = await db.ConversationMetrics.findByPk(conversationId);

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found'
      });
    }

    conversation.csat_score = score;
    conversation.csat_feedback = feedback || null;
    await conversation.save();

    // Update agent daily stats
    if (conversation.agent_id) {
      const stats = await db.AgentDailyStats.getOrCreateToday(
        conversation.agent_id,
        conversation.session_id
      );
      stats.csat_responses += 1;
      stats.csat_total_score += score;
      stats.csat_average = stats.csat_total_score / stats.csat_responses;
      await stats.save();
    }

    res.json({
      success: true,
      message: 'CSAT submitted successfully',
      data: {
        conversationId,
        score,
        feedback
      }
    });
  } catch (error) {
    logger.error('Submit CSAT error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit CSAT',
      error: error.message
    });
  }
};

/**
 * Get CSAT summary
 * GET /api/v1/metrics/csat/summary
 */
const getCsatSummary = async (req, res) => {
  try {
    const { 
      startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      endDate = new Date().toISOString().split('T')[0],
      sessionId
    } = req.query;

    const where = {
      csat_score: { [Op.not]: null },
      conversation_resolved_at: { [Op.between]: [startDate, endDate] }
    };

    if (sessionId) {
      const session = await db.Session.findOne({
        where: { session_id: sessionId, user_id: req.user.id }
      });
      if (session) {
        where.session_id = session.id;
      }
    }

    // Overall stats
    const stats = await db.ConversationMetrics.findAll({
      where,
      attributes: [
        [db.Sequelize.fn('COUNT', db.Sequelize.col('id')), 'total_responses'],
        [db.Sequelize.fn('AVG', db.Sequelize.col('csat_score')), 'average_score'],
        [db.Sequelize.fn('SUM', db.Sequelize.literal('CASE WHEN csat_score >= 4 THEN 1 ELSE 0 END')), 'promoters'],
        [db.Sequelize.fn('SUM', db.Sequelize.literal('CASE WHEN csat_score = 3 THEN 1 ELSE 0 END')), 'passive'],
        [db.Sequelize.fn('SUM', db.Sequelize.literal('CASE WHEN csat_score <= 2 THEN 1 ELSE 0 END')), 'detractors']
      ],
      raw: true
    });

    // Distribution
    const distribution = await db.ConversationMetrics.findAll({
      where,
      attributes: [
        'csat_score',
        [db.Sequelize.fn('COUNT', db.Sequelize.col('id')), 'count']
      ],
      group: ['csat_score'],
      order: [['csat_score', 'ASC']],
      raw: true
    });

    const summary = stats[0];
    const total = parseInt(summary.total_responses) || 0;
    const promoters = parseInt(summary.promoters) || 0;
    const detractors = parseInt(summary.detractors) || 0;

    // Calculate NPS-like score
    const nps = total > 0 ? Math.round(((promoters - detractors) / total) * 100) : null;

    res.json({
      success: true,
      data: {
        period: { startDate, endDate },
        summary: {
          totalResponses: total,
          averageScore: summary.average_score ? parseFloat(summary.average_score).toFixed(2) : null,
          promoters: promoters,
          passive: parseInt(summary.passive) || 0,
          detractors: detractors,
          nps: nps
        },
        distribution: distribution.map(d => ({
          score: d.csat_score,
          count: parseInt(d.count),
          percentage: total > 0 ? ((parseInt(d.count) / total) * 100).toFixed(1) : '0'
        }))
      }
    });
  } catch (error) {
    logger.error('Get CSAT summary error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get CSAT summary',
      error: error.message
    });
  }
};

// Helper function to format seconds as human-readable duration
function formatDuration(seconds) {
  if (!seconds || seconds === 0) return '0s';
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  const parts = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);
  
  return parts.join(' ');
}

module.exports = {
  getAgentPerformance,
  getAgentsSummary,
  getSlaReport,
  getConversationMetrics,
  submitCsat,
  getCsatSummary
};
