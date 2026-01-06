const db = require('../models');
const { Op } = require('sequelize');

/**
 * Admin middleware - Check if user is admin
 */
const isAdmin = async (req, res, next) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }
    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Authorization error',
      error: error.message
    });
  }
};

/**
 * Get dashboard stats
 */
const getDashboardStats = async (req, res) => {
  try {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // User stats
    const totalUsers = await db.User.count();
    const activeUsers = await db.User.count({ where: { status: 'active' } });
    const newUsersToday = await db.User.count({
      where: { created_at: { [Op.gte]: today } }
    });
    const newUsersThisMonth = await db.User.count({
      where: { created_at: { [Op.gte]: thisMonth } }
    });

    // Session stats
    const totalSessions = await db.Session.count();
    const connectedSessions = await db.Session.count({ where: { status: 'connected' } });

    // Message stats
    const totalMessages = await db.Message.count();
    const messagesToday = await db.Message.count({
      where: { created_at: { [Op.gte]: today } }
    });
    const messagesThisMonth = await db.Message.count({
      where: { created_at: { [Op.gte]: thisMonth } }
    });

    // Subscription stats
    const subscriptionStats = await db.Subscription.findAll({
      attributes: [
        'status',
        [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'count']
      ],
      group: ['status']
    });

    res.json({
      success: true,
      stats: {
        users: {
          total: totalUsers,
          active: activeUsers,
          new_today: newUsersToday,
          new_this_month: newUsersThisMonth
        },
        sessions: {
          total: totalSessions,
          connected: connectedSessions,
          disconnected: totalSessions - connectedSessions
        },
        messages: {
          total: totalMessages,
          today: messagesToday,
          this_month: messagesThisMonth
        },
        subscriptions: subscriptionStats.reduce((acc, s) => {
          acc[s.status] = parseInt(s.dataValues.count);
          return acc;
        }, {})
      },
      generated_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get dashboard stats',
      error: error.message
    });
  }
};

/**
 * Get all users (admin)
 */
const getAllUsers = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      status, 
      role, 
      search,
      sort_by = 'created_at',
      sort_order = 'DESC'
    } = req.query;

    const where = {};
    if (status) where.status = status;
    if (role) where.role = role;
    if (search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } }
      ];
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { count, rows: users } = await db.User.findAndCountAll({
      where,
      attributes: { exclude: ['password', 'two_factor_secret'] },
      include: [
        {
          model: db.Subscription,
          as: 'subscription',
          attributes: ['plan_id', 'status', 'current_period_end'],
          include: [
            {
              model: db.Plan,
              as: 'plan',
              attributes: ['id', 'name', 'price', 'slug']
            }
          ]
        }
      ],
      order: [[sort_by, sort_order.toUpperCase()]],
      limit: parseInt(limit),
      offset
    });

    res.json({
      success: true,
      data: users,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        total_pages: Math.ceil(count / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get users',
      error: error.message
    });
  }
};

/**
 * Get user details (admin)
 */
const getUserDetails = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await db.User.findByPk(id, {
      attributes: { exclude: ['password', 'two_factor_secret'] },
      include: [
        {
          model: db.Subscription,
          as: 'subscription',
          include: [{ model: db.Plan, as: 'plan' }]
        },
        {
          model: db.Session,
          as: 'sessions',
          attributes: ['id', 'session_id', 'name', 'status', 'created_at']
        },
        {
          model: db.ApiKey,
          as: 'apiKeys',
          attributes: ['id', 'name', 'last_used_at', 'is_active']
        }
      ]
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get usage stats
    const messageCount = await db.Message.count({
      include: [{
        model: db.Session,
        as: 'session',
        where: { user_id: id }
      }]
    });

    res.json({
      success: true,
      user,
      usage: {
        total_messages: messageCount,
        total_sessions: user.sessions?.length || 0,
        total_api_keys: user.apiKeys?.length || 0
      }
    });
  } catch (error) {
    console.error('Get user details error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get user details',
      error: error.message
    });
  }
};

/**
 * Update user (admin)
 */
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, status, role, email_verified } = req.body;

    const user = await db.User.findByPk(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (status !== undefined) updateData.status = status;
    if (role !== undefined) updateData.role = role;
    if (email_verified !== undefined) updateData.email_verified = email_verified;

    await user.update(updateData);

    // Log action
    await db.AuditLog.create({
      user_id: req.user.id,
      action: 'admin.user.update',
      resource_type: 'user',
      resource_id: id,
      description: `Admin updated user: ${user.email}`,
      ip_address: req.ip,
      user_agent: req.headers['user-agent'],
      metadata: { changes: updateData }
    });

    res.json({
      success: true,
      message: 'User updated successfully',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        status: user.status,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update user',
      error: error.message
    });
  }
};

/**
 * Delete user (admin)
 */
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await db.User.findByPk(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Prevent self-deletion
    if (user.id === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete your own account'
      });
    }

    const userEmail = user.email;
    await user.destroy();

    // Log action
    await db.AuditLog.create({
      user_id: req.user.id,
      action: 'admin.user.delete',
      resource_type: 'user',
      resource_id: id,
      description: `Admin deleted user: ${userEmail}`,
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });

    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete user',
      error: error.message
    });
  }
};

/**
 * Get all sessions (admin)
 */
const getAllSessions = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, user_id } = req.query;

    const where = {};
    if (status) where.status = status;
    if (user_id) where.user_id = user_id;

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { count, rows: sessions } = await db.Session.findAndCountAll({
      where,
      include: [{
        model: db.User,
        as: 'user',
        attributes: ['id', 'name', 'email']
      }],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset
    });

    res.json({
      success: true,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        total_pages: Math.ceil(count / parseInt(limit))
      },
      sessions
    });
  } catch (error) {
    console.error('Get all sessions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get sessions',
      error: error.message
    });
  }
};

/**
 * Get audit logs (admin)
 */
const getAuditLogs = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 50, 
      user_id, 
      action, 
      resource_type,
      start_date,
      end_date
    } = req.query;

    const where = {};
    if (user_id) where.user_id = user_id;
    if (action) where.action = { [Op.like]: `%${action}%` };
    if (resource_type) where.resource_type = resource_type;
    
    if (start_date || end_date) {
      where.created_at = {};
      if (start_date) where.created_at[Op.gte] = new Date(start_date);
      if (end_date) where.created_at[Op.lte] = new Date(end_date);
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { count, rows: logs } = await db.AuditLog.findAndCountAll({
      where,
      include: [{
        model: db.User,
        as: 'user',
        attributes: ['id', 'name', 'email']
      }],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset
    });

    res.json({
      success: true,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        total_pages: Math.ceil(count / parseInt(limit))
      },
      logs
    });
  } catch (error) {
    console.error('Get audit logs error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get audit logs',
      error: error.message
    });
  }
};

/**
 * Get system metrics (admin)
 */
const getSystemMetrics = async (req, res) => {
  try {
    const { period = '7d' } = req.query;

    let days;
    switch (period) {
      case '24h': days = 1; break;
      case '7d': days = 7; break;
      case '30d': days = 30; break;
      case '90d': days = 90; break;
      default: days = 7;
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Messages per day
    const messageMetrics = await db.Message.findAll({
      attributes: [
        [db.sequelize.fn('DATE', db.sequelize.col('created_at')), 'date'],
        [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'count']
      ],
      where: {
        created_at: { [Op.gte]: startDate }
      },
      group: [db.sequelize.fn('DATE', db.sequelize.col('created_at'))],
      order: [[db.sequelize.fn('DATE', db.sequelize.col('created_at')), 'ASC']]
    });

    // New users per day
    const userMetrics = await db.User.findAll({
      attributes: [
        [db.sequelize.fn('DATE', db.sequelize.col('created_at')), 'date'],
        [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'count']
      ],
      where: {
        created_at: { [Op.gte]: startDate }
      },
      group: [db.sequelize.fn('DATE', db.sequelize.col('created_at'))],
      order: [[db.sequelize.fn('DATE', db.sequelize.col('created_at')), 'ASC']]
    });

    // Webhook delivery stats
    const webhookMetrics = await db.WebhookLog.findAll({
      attributes: [
        'status',
        [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'count']
      ],
      where: {
        delivered_at: { [Op.gte]: startDate }
      },
      group: ['status']
    });

    res.json({
      success: true,
      period,
      metrics: {
        messages: messageMetrics.map(m => ({
          date: m.dataValues.date,
          count: parseInt(m.dataValues.count)
        })),
        new_users: userMetrics.map(u => ({
          date: u.dataValues.date,
          count: parseInt(u.dataValues.count)
        })),
        webhooks: webhookMetrics.reduce((acc, w) => {
          acc[w.status] = parseInt(w.dataValues.count);
          return acc;
        }, {})
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

/**
 * Manage subscription (admin)
 */
const manageSubscription = async (req, res) => {
  try {
    const { user_id, plan_id, status, expires_at } = req.body;

    if (!user_id) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    let subscription = await db.Subscription.findOne({
      where: { user_id }
    });

    if (!subscription) {
      // Create new subscription
      subscription = await db.Subscription.create({
        user_id,
        plan_id: plan_id || 'free',
        status: status || 'active',
        expires_at: expires_at ? new Date(expires_at) : null
      });
    } else {
      // Update existing
      const updateData = {};
      if (plan_id !== undefined) updateData.plan_id = plan_id;
      if (status !== undefined) updateData.status = status;
      if (expires_at !== undefined) updateData.expires_at = expires_at ? new Date(expires_at) : null;

      await subscription.update(updateData);
    }

    // Log action
    await db.AuditLog.create({
      user_id: req.user.id,
      action: 'admin.subscription.update',
      resource_type: 'subscription',
      resource_id: subscription.id,
      description: `Admin updated subscription for user: ${user_id}`,
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });

    res.json({
      success: true,
      message: 'Subscription updated successfully',
      subscription
    });
  } catch (error) {
    console.error('Manage subscription error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to manage subscription',
      error: error.message
    });
  }
};

/**
 * Activate subscription manually (admin) - untuk transfer bank manual
 */
const activateSubscriptionManually = async (req, res) => {
  try {
    const { 
      user_id, 
      plan_id, 
      payment_method = 'bank_transfer',
      amount_paid,
      transfer_proof_url,
      payment_reference,
      notes,
      duration_days = 30
    } = req.body;

    if (!user_id || !plan_id) {
      return res.status(400).json({
        success: false,
        message: 'user_id and plan_id are required'
      });
    }

    // Get user
    const user = await db.User.findByPk(user_id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get plan
    const plan = await db.Plan.findByPk(plan_id);
    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'Plan not found'
      });
    }

    // Start transaction
    const result = await db.sequelize.transaction(async (t) => {
      // Check existing subscription
      let subscription = await db.Subscription.findOne({
        where: { user_id },
        transaction: t
      });

      const now = new Date();
      const expiresAt = new Date(now.getTime() + (duration_days * 24 * 60 * 60 * 1000));

      if (!subscription) {
        // Create new subscription
        subscription = await db.Subscription.create({
          user_id,
          plan_id,
          status: 'active',
          current_period_start: now,
          current_period_end: expiresAt,
          expires_at: expiresAt
        }, { transaction: t });
      } else {
        // Update existing subscription
        await subscription.update({
          plan_id,
          status: 'active',
          current_period_start: now,
          current_period_end: expiresAt,
          expires_at: expiresAt
        }, { transaction: t });
      }

      // Create invoice record
      const invoice = await db.Invoice.create({
        userId: user_id,
        subscriptionId: subscription.id,
        amount: amount_paid || plan.price,
        currency: 'IDR',
        status: 'paid',
        paymentMethod: payment_method,
        paidAt: now,
        invoiceNumber: `INV-MANUAL-${user_id.substring(0, 8)}-${Date.now()}`,
        metadata: {
          activated_by_admin: req.user.id,
          admin_name: req.user.name,
          transfer_proof_url,
          payment_reference,
          notes,
          manual_activation: true
        }
      }, { transaction: t });

      // Update user's subscription reference
      await user.update({
        subscription_id: subscription.id,
        plan_id: plan_id
      }, { transaction: t });

      // Log action
      await db.AuditLog.create({
        user_id: req.user.id,
        action: 'admin.subscription.manual_activate',
        resource_type: 'subscription',
        resource_id: subscription.id,
        description: `Admin manually activated ${plan.name} subscription for user: ${user.email}`,
        ip_address: req.ip,
        user_agent: req.headers['user-agent'],
        metadata: {
          user_id,
          plan_id,
          amount_paid,
          payment_method,
          payment_reference,
          invoice_id: invoice.id
        }
      }, { transaction: t });

      return { subscription, invoice };
    });

    res.json({
      success: true,
      message: `Subscription activated successfully for ${user.email}`,
      data: {
        subscription: result.subscription,
        invoice: result.invoice,
        user: {
          id: user.id,
          name: user.name,
          email: user.email
        },
        plan: {
          id: plan.id,
          name: plan.name,
          price: plan.price
        }
      }
    });
  } catch (error) {
    console.error('Manual subscription activation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to activate subscription manually',
      error: error.message
    });
  }
};

/**
 * Get plans (admin)
 */
const getPlans = async (req, res) => {
  try {
    const plans = await db.Plan.findAll({
      order: [['price', 'ASC']]
    });

    res.json({
      success: true,
      plans
    });
  } catch (error) {
    console.error('Get plans error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get plans',
      error: error.message
    });
  }
};

/**
 * Create/Update plan (admin)
 */
const managePlan = async (req, res) => {
  try {
    const { id, name, description, price, features, limits, is_active } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Plan name is required'
      });
    }

    let plan;
    if (id) {
      plan = await db.Plan.findByPk(id);
      if (!plan) {
        return res.status(404).json({
          success: false,
          message: 'Plan not found'
        });
      }

      await plan.update({
        name,
        description,
        price,
        features,
        limits,
        is_active
      });
    } else {
      plan = await db.Plan.create({
        name,
        description,
        price: price || 0,
        features: features || {},
        limits: limits || {},
        is_active: is_active !== false
      });
    }

    res.json({
      success: true,
      message: id ? 'Plan updated successfully' : 'Plan created successfully',
      plan
    });
  } catch (error) {
    console.error('Manage plan error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to manage plan',
      error: error.message
    });
  }
};

/**
 * Suspend user (admin)
 */
const suspendUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const user = await db.User.findByPk(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.id === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'Cannot suspend your own account'
      });
    }

    await user.update({
      status: 'suspended',
      suspended_at: new Date(),
      suspended_reason: reason || 'No reason provided'
    });

    // Log action
    await db.AuditLog.create({
      user_id: req.user.id,
      action: 'admin.user.suspend',
      resource_type: 'user',
      resource_id: id,
      description: `Admin suspended user: ${user.email}`,
      ip_address: req.ip,
      user_agent: req.headers['user-agent'],
      metadata: { reason }
    });

    res.json({
      success: true,
      message: 'User suspended successfully',
      user: {
        id: user.id,
        email: user.email,
        status: user.status,
        suspended_at: user.suspended_at,
        suspended_reason: user.suspended_reason
      }
    });
  } catch (error) {
    console.error('Suspend user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to suspend user',
      error: error.message
    });
  }
};

/**
 * Unsuspend user (admin)
 */
const unsuspendUser = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await db.User.findByPk(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.status !== 'suspended') {
      return res.status(400).json({
        success: false,
        message: 'User is not suspended'
      });
    }

    await user.update({
      status: 'active',
      suspended_at: null,
      suspended_reason: null
    });

    // Log action
    await db.AuditLog.create({
      user_id: req.user.id,
      action: 'admin.user.unsuspend',
      resource_type: 'user',
      resource_id: id,
      description: `Admin unsuspended user: ${user.email}`,
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });

    res.json({
      success: true,
      message: 'User unsuspended successfully',
      user: {
        id: user.id,
        email: user.email,
        status: user.status
      }
    });
  } catch (error) {
    console.error('Unsuspend user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to unsuspend user',
      error: error.message
    });
  }
};

/**
 * Activate user (admin) - for pending or inactive users
 * POST /api/v1/admin/users/:id/activate
 */
const activateUser = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await db.User.findByPk(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.status === 'active') {
      return res.status(400).json({
        success: false,
        message: 'User is already active'
      });
    }

    await user.update({
      status: 'active',
      email_verified: true,
      email_verified_at: new Date(),
      verification_token: null,
      suspended_at: null,
      suspended_reason: null
    });

    // Log action
    await db.AuditLog.create({
      user_id: req.user.id,
      action: 'admin.user.activate',
      resource_type: 'user',
      resource_id: id,
      description: `Admin activated user: ${user.email} (previous status: ${user.status})`,
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });

    res.json({
      success: true,
      message: 'User activated successfully',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        status: 'active',
        email_verified: true
      }
    });
  } catch (error) {
    console.error('Activate user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to activate user',
      error: error.message
    });
  }
};

/**
 * Force disconnect session (admin)
 */
const forceDisconnectSession = async (req, res) => {
  try {
    const { id } = req.params;

    const session = await db.Session.findByPk(id, {
      include: [{ model: db.User, as: 'user' }]
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    // Update session status
    await session.update({
      status: 'disconnected'
    });

    // Try to disconnect from WhatsApp service
    try {
      const whatsappService = require('../services/whatsappService');
      const socket = whatsappService.getSession(session.session_id);
      if (socket) {
        await socket.logout();
      }
    } catch (e) {
      console.log('WhatsApp logout error (ignored):', e.message);
    }

    // Log action
    await db.AuditLog.create({
      user_id: req.user.id,
      action: 'admin.session.disconnect',
      resource_type: 'session',
      resource_id: id,
      description: `Admin force disconnected session: ${session.session_id}`,
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });

    res.json({
      success: true,
      message: 'Session disconnected successfully'
    });
  } catch (error) {
    console.error('Force disconnect error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to disconnect session',
      error: error.message
    });
  }
};

/**
 * Get system health (admin)
 */
const getSystemHealth = async (req, res) => {
  try {
    const os = require('os');
    
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      system: {
        platform: os.platform(),
        arch: os.arch(),
        hostname: os.hostname(),
        cpus: os.cpus().length,
        total_memory: Math.round(os.totalmem() / 1024 / 1024) + ' MB',
        free_memory: Math.round(os.freemem() / 1024 / 1024) + ' MB',
        memory_usage: Math.round((1 - os.freemem() / os.totalmem()) * 100) + '%',
        load_average: os.loadavg()
      },
      process: {
        pid: process.pid,
        memory: {
          rss: Math.round(process.memoryUsage().rss / 1024 / 1024) + ' MB',
          heap_total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + ' MB',
          heap_used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + ' MB'
        },
        node_version: process.version
      },
      database: {
        status: 'connected'
      }
    };

    // Test database
    try {
      await db.sequelize.authenticate();
    } catch (e) {
      health.database.status = 'disconnected';
      health.database.error = e.message;
      health.status = 'degraded';
    }

    res.json({
      success: true,
      health
    });
  } catch (error) {
    console.error('Get system health error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get system health',
      error: error.message
    });
  }
};

module.exports = {
  isAdmin,
  getDashboardStats,
  getAllUsers,
  getUserDetails,
  updateUser,
  deleteUser,
  getAllSessions,
  getAuditLogs,
  getSystemMetrics,
  manageSubscription,
  activateSubscriptionManually,
  getPlans,
  managePlan,
  suspendUser,
  unsuspendUser,
  activateUser,
  forceDisconnectSession,
  getSystemHealth
};
