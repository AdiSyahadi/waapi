const db = require('../models');
const whatsappService = require('../services/whatsappService');
const { Op } = require('sequelize');

/**
 * Sync contacts from WhatsApp to database
 * POST /api/v1/contacts/sync
 */
const syncContacts = async (req, res) => {
  try {
    const { session_id, include_profile_pictures = false } = req.body;

    if (!session_id) {
      return res.status(400).json({
        success: false,
        message: 'Session ID is required'
      });
    }

    // Verify session
    const session = await db.Session.findOne({
      where: {
        session_id,
        user_id: req.user.id
      }
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    if (session.status !== 'connected') {
      return res.status(400).json({
        success: false,
        message: 'Session is not connected'
      });
    }

    const sock = whatsappService.getSession(session_id);
    if (!sock) {
      return res.status(400).json({
        success: false,
        message: 'WhatsApp session not active'
      });
    }

    // Get contacts from WhatsApp store
    const waContacts = Object.values(sock.socket.store?.contacts || {});
    
    // Also get recent chats to capture contacts we've messaged
    const chats = await sock.socket.store?.chats?.all?.() || [];
    
    let synced = 0;
    let updated = 0;
    let failed = 0;

    const now = new Date();

    // Process each contact
    for (const contact of waContacts) {
      try {
        if (!contact.id || contact.id === 'status@broadcast') continue;

        const jid = contact.id;
        const phone = jid.split('@')[0];
        
        // Try to get profile picture if requested
        let profilePictureUrl = null;
        if (include_profile_pictures) {
          try {
            profilePictureUrl = await sock.socket.profilePictureUrl(jid, 'image');
          } catch (e) {
            // Ignore - some contacts don't have profile pictures
          }
        }

        const contactData = {
          session_id: session.id,
          jid,
          phone,
          name: contact.name || contact.notify || contact.verifiedName || null,
          push_name: contact.notify || null,
          verified_name: contact.verifiedName || null,
          is_business: !!contact.verifiedName,
          profile_picture_url: profilePictureUrl,
          synced_at: now
        };

        // Upsert contact
        const [contactRecord, created] = await db.Contact.upsert(contactData, {
          conflictFields: ['session_id', 'jid'],
          returning: true
        });

        if (created) {
          synced++;
        } else {
          updated++;
        }
      } catch (error) {
        console.error(`Failed to sync contact ${contact.id}:`, error.message);
        failed++;
      }
    }

    // Also sync contacts from recent chats
    for (const chat of chats) {
      try {
        if (!chat.id || chat.id === 'status@broadcast' || chat.id.endsWith('@g.us')) continue;

        const jid = chat.id;
        const phone = jid.split('@')[0];

        // Check if already exists
        const existing = await db.Contact.findOne({
          where: { session_id: session.id, jid }
        });

        if (!existing) {
          await db.Contact.create({
            session_id: session.id,
            jid,
            phone,
            name: chat.name || null,
            synced_at: now
          });
          synced++;
        }
      } catch (error) {
        // Ignore duplicate errors
        if (!error.message?.includes('Duplicate')) {
          failed++;
        }
      }
    }

    res.json({
      success: true,
      message: 'Contacts synced successfully',
      data: {
        synced,
        updated,
        failed,
        total: synced + updated
      }
    });
  } catch (error) {
    console.error('Sync contacts error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to sync contacts',
      error: error.message
    });
  }
};

/**
 * Get synced contacts with filters
 * GET /api/v1/contacts/synced
 */
const getSyncedContacts = async (req, res) => {
  try {
    const { 
      session_id, 
      search, 
      tags, 
      page = 1, 
      limit = 50,
      sort_by = 'last_message_at',
      sort_order = 'DESC'
    } = req.query;

    if (!session_id) {
      return res.status(400).json({
        success: false,
        message: 'Session ID is required'
      });
    }

    // Verify session
    const session = await db.Session.findOne({
      where: {
        session_id,
        user_id: req.user.id
      }
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    const offset = (page - 1) * limit;

    // Build where clause
    const where = { session_id: session.id };

    if (search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { custom_name: { [Op.like]: `%${search}%` } },
        { phone: { [Op.like]: `%${search}%` } },
        { push_name: { [Op.like]: `%${search}%` } }
      ];
    }

    // Validate sort field
    const allowedSortFields = ['last_message_at', 'name', 'phone', 'created_at', 'synced_at'];
    const sortField = allowedSortFields.includes(sort_by) ? sort_by : 'last_message_at';
    const sortDir = sort_order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const { count, rows: contacts } = await db.Contact.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [[sortField, sortDir]]
    });

    res.json({
      success: true,
      data: {
        contacts,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(count / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get synced contacts error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get contacts',
      error: error.message
    });
  }
};

/**
 * Update contact (custom fields for CRM)
 * PUT /api/v1/contacts/:contactId
 */
const updateContact = async (req, res) => {
  try {
    const { contactId } = req.params;
    const { custom_name, custom_tags, custom_notes } = req.body;

    const contact = await db.Contact.findByPk(contactId, {
      include: [{
        model: db.Session,
        as: 'session',
        where: { user_id: req.user.id }
      }]
    });

    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Contact not found'
      });
    }

    // Update custom fields
    const updateData = {};
    if (custom_name !== undefined) updateData.custom_name = custom_name;
    if (custom_tags !== undefined) updateData.custom_tags = custom_tags;
    if (custom_notes !== undefined) updateData.custom_notes = custom_notes;

    await contact.update(updateData);

    res.json({
      success: true,
      message: 'Contact updated successfully',
      data: contact
    });
  } catch (error) {
    console.error('Update contact error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update contact',
      error: error.message
    });
  }
};

/**
 * Delete synced contact
 * DELETE /api/v1/contacts/:contactId
 */
const deleteContact = async (req, res) => {
  try {
    const { contactId } = req.params;

    const contact = await db.Contact.findByPk(contactId, {
      include: [{
        model: db.Session,
        as: 'session',
        where: { user_id: req.user.id }
      }]
    });

    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Contact not found'
      });
    }

    await contact.destroy();

    res.json({
      success: true,
      message: 'Contact deleted successfully'
    });
  } catch (error) {
    console.error('Delete contact error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete contact',
      error: error.message
    });
  }
};

// ===== CHAT ASSIGNMENT FUNCTIONS =====

/**
 * Assign chat to agent
 * POST /api/v1/chats/assign
 */
const assignChat = async (req, res) => {
  try {
    const { session_id, chat_jid, assigned_to, priority, tags, notes } = req.body;

    if (!session_id || !chat_jid) {
      return res.status(400).json({
        success: false,
        message: 'Session ID and chat JID are required'
      });
    }

    // Verify session
    const session = await db.Session.findOne({
      where: {
        session_id,
        user_id: req.user.id
      }
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    // Verify assigned agent exists (if provided)
    if (assigned_to) {
      const agent = await db.User.findByPk(assigned_to);
      if (!agent) {
        return res.status(404).json({
          success: false,
          message: 'Assigned agent not found'
        });
      }
    }

    // Create or update assignment
    const assignmentData = {
      session_id: session.id,
      chat_jid,
      assigned_to: assigned_to || null,
      assigned_by: req.user.id,
      priority: priority || 'medium',
      tags: tags || [],
      notes: notes || null
    };

    const [assignment, created] = await db.ChatAssignment.upsert(assignmentData, {
      conflictFields: ['session_id', 'chat_jid'],
      returning: true
    });

    res.status(created ? 201 : 200).json({
      success: true,
      message: created ? 'Chat assigned successfully' : 'Assignment updated successfully',
      data: assignment
    });
  } catch (error) {
    console.error('Assign chat error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to assign chat',
      error: error.message
    });
  }
};

/**
 * Get chat assignments
 * GET /api/v1/chats/assignments
 */
const getAssignments = async (req, res) => {
  try {
    const { 
      session_id, 
      status, 
      assigned_to, 
      priority,
      page = 1, 
      limit = 50 
    } = req.query;

    if (!session_id) {
      return res.status(400).json({
        success: false,
        message: 'Session ID is required'
      });
    }

    // Verify session
    const session = await db.Session.findOne({
      where: {
        session_id,
        user_id: req.user.id
      }
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    const offset = (page - 1) * limit;

    // Build where clause
    const where = { session_id: session.id };
    if (status) where.status = status;
    if (assigned_to) where.assigned_to = assigned_to;
    if (priority) where.priority = priority;

    const { count, rows: assignments } = await db.ChatAssignment.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset: parseInt(offset),
      include: [
        {
          model: db.User,
          as: 'assignedAgent',
          attributes: ['id', 'name', 'email']
        },
        {
          model: db.User,
          as: 'assignedByUser',
          attributes: ['id', 'name', 'email']
        }
      ],
      order: [
        ['priority', 'DESC'],
        ['created_at', 'DESC']
      ]
    });

    res.json({
      success: true,
      data: {
        assignments,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(count / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get assignments error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get assignments',
      error: error.message
    });
  }
};

/**
 * Update chat assignment status
 * PUT /api/v1/chats/assignments/:assignmentId
 */
const updateAssignment = async (req, res) => {
  try {
    const { assignmentId } = req.params;
    const { status, priority, assigned_to, tags, notes } = req.body;

    const assignment = await db.ChatAssignment.findByPk(assignmentId, {
      include: [{
        model: db.Session,
        as: 'session',
        where: { user_id: req.user.id }
      }]
    });

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: 'Assignment not found'
      });
    }

    // Build update data
    const updateData = {};
    if (status !== undefined) {
      updateData.status = status;
      if (status === 'resolved' && !assignment.resolved_at) {
        updateData.resolved_at = new Date();
      }
    }
    if (priority !== undefined) updateData.priority = priority;
    if (assigned_to !== undefined) updateData.assigned_to = assigned_to;
    if (tags !== undefined) updateData.tags = tags;
    if (notes !== undefined) updateData.notes = notes;

    await assignment.update(updateData);

    res.json({
      success: true,
      message: 'Assignment updated successfully',
      data: assignment
    });
  } catch (error) {
    console.error('Update assignment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update assignment',
      error: error.message
    });
  }
};

/**
 * Get assignment for specific chat
 * GET /api/v1/chats/assignments/chat/:chatJid
 */
const getAssignmentByChat = async (req, res) => {
  try {
    const { chatJid } = req.params;
    const { session_id } = req.query;

    if (!session_id) {
      return res.status(400).json({
        success: false,
        message: 'Session ID is required'
      });
    }

    // Verify session
    const session = await db.Session.findOne({
      where: {
        session_id,
        user_id: req.user.id
      }
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    const assignment = await db.ChatAssignment.findOne({
      where: {
        session_id: session.id,
        chat_jid: chatJid
      },
      include: [
        {
          model: db.User,
          as: 'assignedAgent',
          attributes: ['id', 'name', 'email']
        }
      ]
    });

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: 'No assignment found for this chat'
      });
    }

    res.json({
      success: true,
      data: assignment
    });
  } catch (error) {
    console.error('Get assignment by chat error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get assignment',
      error: error.message
    });
  }
};

/**
 * Unassign chat
 * DELETE /api/v1/chats/assignments/:assignmentId
 */
const unassignChat = async (req, res) => {
  try {
    const { assignmentId } = req.params;

    const assignment = await db.ChatAssignment.findByPk(assignmentId, {
      include: [{
        model: db.Session,
        as: 'session',
        where: { user_id: req.user.id }
      }]
    });

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: 'Assignment not found'
      });
    }

    await assignment.destroy();

    res.json({
      success: true,
      message: 'Chat unassigned successfully'
    });
  } catch (error) {
    console.error('Unassign chat error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to unassign chat',
      error: error.message
    });
  }
};

/**
 * Get agent workload stats
 * GET /api/v1/chats/assignments/stats
 */
const getAgentStats = async (req, res) => {
  try {
    const { session_id } = req.query;

    if (!session_id) {
      return res.status(400).json({
        success: false,
        message: 'Session ID is required'
      });
    }

    // Verify session
    const session = await db.Session.findOne({
      where: {
        session_id,
        user_id: req.user.id
      }
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    // Get stats per agent
    const stats = await db.ChatAssignment.findAll({
      where: { session_id: session.id },
      attributes: [
        'assigned_to',
        'status',
        [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'count']
      ],
      include: [{
        model: db.User,
        as: 'assignedAgent',
        attributes: ['id', 'name', 'email']
      }],
      group: ['assigned_to', 'status', 'assignedAgent.id'],
      raw: false
    });

    // Get overall stats
    const overall = await db.ChatAssignment.findAll({
      where: { session_id: session.id },
      attributes: [
        'status',
        [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'count']
      ],
      group: ['status'],
      raw: true
    });

    res.json({
      success: true,
      data: {
        by_agent: stats,
        overall: overall.reduce((acc, item) => {
          acc[item.status] = parseInt(item.count);
          return acc;
        }, {})
      }
    });
  } catch (error) {
    console.error('Get agent stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get stats',
      error: error.message
    });
  }
};

module.exports = {
  // Contact Sync
  syncContacts,
  getSyncedContacts,
  updateContact,
  deleteContact,
  
  // Chat Assignment
  assignChat,
  getAssignments,
  updateAssignment,
  getAssignmentByChat,
  unassignChat,
  getAgentStats
};
