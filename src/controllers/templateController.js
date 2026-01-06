const db = require('../models');
const whatsappService = require('../services/whatsappService');
const messageService = require('../services/messageService');

/**
 * Create new template
 */
const createTemplate = async (req, res) => {
  try {
    const { name, type, content, variables, category } = req.body;

    // Check if template name already exists for user
    const existing = await db.Template.findOne({
      where: {
        user_id: req.user.id,
        name
      }
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'Template with this name already exists'
      });
    }

    const template = await db.Template.create({
      user_id: req.user.id,
      organization_id: req.user.organization_id,
      name,
      type,
      content,
      variables: variables || [],
      category
    });

    res.status(201).json({
      success: true,
      message: 'Template created successfully',
      data: { template: template.toJSON() }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to create template',
      error: error.message
    });
  }
};

/**
 * Get all templates
 */
const getTemplates = async (req, res) => {
  try {
    const { page = 1, limit = 20, type, category, search } = req.query;
    const offset = (page - 1) * limit;

    const where = { 
      user_id: req.user.id,
      is_active: true
    };

    if (type) {
      where.type = type;
    }

    if (category) {
      where.category = category;
    }

    if (search) {
      where[db.Sequelize.Op.or] = [
        { name: { [db.Sequelize.Op.like]: `%${search}%` } },
        { content: { [db.Sequelize.Op.like]: `%${search}%` } }
      ];
    }

    const templates = await db.Template.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['usage_count', 'DESC'], ['created_at', 'DESC']]
    });

    res.json({
      success: true,
      data: {
        templates: templates.rows,
        pagination: {
          total: templates.count,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(templates.count / limit)
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get templates',
      error: error.message
    });
  }
};

/**
 * Get single template
 */
const getTemplate = async (req, res) => {
  try {
    const { id } = req.params;

    const template = await db.Template.findOne({
      where: {
        id,
        user_id: req.user.id
      }
    });

    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template not found'
      });
    }

    res.json({
      success: true,
      data: { template: template.toJSON() }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get template',
      error: error.message
    });
  }
};

/**
 * Update template
 */
const updateTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, type, content, variables, category, is_active } = req.body;

    const template = await db.Template.findOne({
      where: {
        id,
        user_id: req.user.id
      }
    });

    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template not found'
      });
    }

    // Check name uniqueness if name is being changed
    if (name && name !== template.name) {
      const existing = await db.Template.findOne({
        where: {
          user_id: req.user.id,
          name,
          id: { [db.Sequelize.Op.ne]: id }
        }
      });

      if (existing) {
        return res.status(400).json({
          success: false,
          message: 'Template with this name already exists'
        });
      }
    }

    await template.update({
      name: name || template.name,
      type: type || template.type,
      content: content || template.content,
      variables: variables !== undefined ? variables : template.variables,
      category: category !== undefined ? category : template.category,
      is_active: is_active !== undefined ? is_active : template.is_active
    });

    res.json({
      success: true,
      message: 'Template updated successfully',
      data: { template: template.toJSON() }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update template',
      error: error.message
    });
  }
};

/**
 * Delete template
 */
const deleteTemplate = async (req, res) => {
  try {
    const { id } = req.params;

    const template = await db.Template.findOne({
      where: {
        id,
        user_id: req.user.id
      }
    });

    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template not found'
      });
    }

    await template.destroy();

    res.json({
      success: true,
      message: 'Template deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete template',
      error: error.message
    });
  }
};

/**
 * Use template to send message
 */
const useTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const { sessionId, phone, variables } = req.body;

    if (!sessionId || !phone) {
      return res.status(400).json({
        success: false,
        message: 'Session ID and phone number are required'
      });
    }

    // Get template
    const template = await db.Template.findOne({
      where: {
        id,
        user_id: req.user.id,
        is_active: true
      }
    });

    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template not found'
      });
    }

    // Get session
    const session = await db.Session.findOne({
      where: {
        session_id: sessionId,
        user_id: req.user.id
      }
    });

    if (!session || session.status !== 'connected') {
      return res.status(400).json({
        success: false,
        message: 'Session not found or not connected'
      });
    }

    // Get socket
    const sock = whatsappService.getSession(sessionId);
    if (!sock) {
      return res.status(400).json({
        success: false,
        message: 'Session socket not found'
      });
    }

    // Replace variables in content
    let content = template.content;
    if (variables && typeof variables === 'object') {
      Object.keys(variables).forEach(key => {
        const regex = new RegExp(`{{${key}}}`, 'g');
        content = content.replace(regex, variables[key]);
      });
    }

    // Format phone number
    const jid = messageService.formatPhoneNumber(phone);

    // Send based on template type
    let sent;
    switch (template.type) {
      case 'text':
        sent = await messageService.sendTextMessage(sock, jid, content);
        break;
      
      // Add other types as needed
      default:
        sent = await messageService.sendTextMessage(sock, jid, content);
    }

    // Save to database
    const messageRecord = await db.Message.create({
      session_id: session.id,
      message_id: sent.key.id,
      remote_jid: jid,
      from_me: true,
      type: template.type,
      content,
      status: 'sent',
      timestamp: Date.now(),
      sent_at: new Date()
    });

    // Increment usage count
    await template.increment('usage_count');

    res.json({
      success: true,
      message: 'Template sent successfully',
      data: {
        message: messageRecord.toJSON(),
        whatsapp_id: sent.key.id,
        template: template.name
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to use template',
      error: error.message
    });
  }
};

module.exports = {
  createTemplate,
  getTemplates,
  getTemplate,
  updateTemplate,
  deleteTemplate,
  useTemplate
};
