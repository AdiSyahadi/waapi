const db = require('../models');
const whatsappService = require('../services/whatsappService');

/**
 * Create new group
 */
const createGroup = async (req, res) => {
  try {
    const { session_id, name, description, participants } = req.body;

    if (!session_id || !name || !participants || participants.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Session ID, group name, and at least 2 participants are required'
      });
    }

    // Verify session belongs to user
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

    // Get WhatsApp socket
    const sock = whatsappService.getSession(session_id);
    if (!sock) {
      return res.status(400).json({
        success: false,
        message: 'WhatsApp session not active'
      });
    }

    // Format participants (add @s.whatsapp.net if not present)
    const formattedParticipants = participants.map(p => 
      p.includes('@') ? p : `${p}@s.whatsapp.net`
    );

    // Create group
    const result = await sock.socket.groupCreate(name, formattedParticipants);

    // Update description if provided
    if (description && result.id) {
      await sock.socket.groupUpdateDescription(result.id, description);
    }

    res.json({
      success: true,
      message: 'Group created successfully',
      group: {
        id: result.id,
        name,
        description: description || '',
        participants: formattedParticipants
      }
    });
  } catch (error) {
    console.error('Create group error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create group',
      error: error.message
    });
  }
};

/**
 * Get group information
 */
const getGroupInfo = async (req, res) => {
  try {
    const { session_id, group_id } = req.query;

    if (!session_id || !group_id) {
      return res.status(400).json({
        success: false,
        message: 'Session ID and Group ID are required'
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

    const sock = whatsappService.getSession(session_id);
    if (!sock) {
      return res.status(400).json({
        success: false,
        message: 'WhatsApp session not active'
      });
    }

    // Get group metadata
    const metadata = await sock.socket.groupMetadata(group_id);

    res.json({
      success: true,
      group: {
        id: metadata.id,
        subject: metadata.subject,
        owner: metadata.owner,
        creation: metadata.creation,
        desc: metadata.desc,
        descId: metadata.descId,
        participants: metadata.participants.map(p => ({
          id: p.id,
          admin: p.admin || null,
          isSuperAdmin: p.admin === 'superadmin'
        })),
        size: metadata.size,
        restrict: metadata.restrict,
        announce: metadata.announce
      }
    });
  } catch (error) {
    console.error('Get group info error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get group information',
      error: error.message
    });
  }
};

/**
 * Update group name
 */
const updateGroupName = async (req, res) => {
  try {
    const { session_id, group_id, name } = req.body;

    if (!session_id || !group_id || !name) {
      return res.status(400).json({
        success: false,
        message: 'Session ID, Group ID, and new name are required'
      });
    }

    const session = await db.Session.findOne({
      where: { session_id, user_id: req.user.id }
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    const sock = whatsappService.getSession(session_id);
    if (!sock) {
      return res.status(400).json({
        success: false,
        message: 'WhatsApp session not active'
      });
    }

    await sock.socket.groupUpdateSubject(group_id, name);

    res.json({
      success: true,
      message: 'Group name updated successfully',
      group_id,
      name
    });
  } catch (error) {
    console.error('Update group name error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update group name',
      error: error.message
    });
  }
};

/**
 * Update group description
 */
const updateGroupDescription = async (req, res) => {
  try {
    const { session_id, group_id, description } = req.body;

    if (!session_id || !group_id) {
      return res.status(400).json({
        success: false,
        message: 'Session ID and Group ID are required'
      });
    }

    const session = await db.Session.findOne({
      where: { session_id, user_id: req.user.id }
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    const sock = whatsappService.getSession(session_id);
    if (!sock) {
      return res.status(400).json({
        success: false,
        message: 'WhatsApp session not active'
      });
    }

    await sock.socket.groupUpdateDescription(group_id, description || '');

    res.json({
      success: true,
      message: 'Group description updated successfully',
      group_id,
      description
    });
  } catch (error) {
    console.error('Update group description error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update group description',
      error: error.message
    });
  }
};

/**
 * Update group picture
 */
const updateGroupPicture = async (req, res) => {
  try {
    const { session_id, group_id } = req.body;
    const file = req.file;

    if (!session_id || !group_id) {
      return res.status(400).json({
        success: false,
        message: 'Session ID and Group ID are required'
      });
    }

    if (!file) {
      return res.status(400).json({
        success: false,
        message: 'Image file is required'
      });
    }

    const session = await db.Session.findOne({
      where: { session_id, user_id: req.user.id }
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    const sock = whatsappService.getSession(session_id);
    if (!sock) {
      return res.status(400).json({
        success: false,
        message: 'WhatsApp session not active'
      });
    }

    const fs = require('fs');
    const imageBuffer = fs.readFileSync(file.path);

    await sock.socket.updateProfilePicture(group_id, imageBuffer);

    // Clean up uploaded file
    fs.unlinkSync(file.path);

    res.json({
      success: true,
      message: 'Group picture updated successfully',
      group_id
    });
  } catch (error) {
    console.error('Update group picture error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update group picture',
      error: error.message
    });
  }
};

/**
 * Add participants to group
 */
const addParticipants = async (req, res) => {
  try {
    const { session_id, group_id, participants } = req.body;

    if (!session_id || !group_id || !participants || participants.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Session ID, Group ID, and participants are required'
      });
    }

    const session = await db.Session.findOne({
      where: { session_id, user_id: req.user.id }
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    const sock = whatsappService.getSession(session_id);
    if (!sock) {
      return res.status(400).json({
        success: false,
        message: 'WhatsApp session not active'
      });
    }

    // Format participants
    const formattedParticipants = participants.map(p => 
      p.includes('@') ? p : `${p}@s.whatsapp.net`
    );

    const result = await sock.socket.groupParticipantsUpdate(
      group_id,
      formattedParticipants,
      'add'
    );

    res.json({
      success: true,
      message: 'Participants added successfully',
      group_id,
      result
    });
  } catch (error) {
    console.error('Add participants error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add participants',
      error: error.message
    });
  }
};

/**
 * Remove participants from group
 */
const removeParticipants = async (req, res) => {
  try {
    const { session_id, group_id, participants } = req.body;

    if (!session_id || !group_id || !participants || participants.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Session ID, Group ID, and participants are required'
      });
    }

    const session = await db.Session.findOne({
      where: { session_id, user_id: req.user.id }
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    const sock = whatsappService.getSession(session_id);
    if (!sock) {
      return res.status(400).json({
        success: false,
        message: 'WhatsApp session not active'
      });
    }

    // Format participants
    const formattedParticipants = participants.map(p => 
      p.includes('@') ? p : `${p}@s.whatsapp.net`
    );

    const result = await sock.socket.groupParticipantsUpdate(
      group_id,
      formattedParticipants,
      'remove'
    );

    res.json({
      success: true,
      message: 'Participants removed successfully',
      group_id,
      result
    });
  } catch (error) {
    console.error('Remove participants error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove participants',
      error: error.message
    });
  }
};

/**
 * Promote participant to admin
 */
const promoteToAdmin = async (req, res) => {
  try {
    const { session_id, group_id, participants } = req.body;

    if (!session_id || !group_id || !participants || participants.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Session ID, Group ID, and participants are required'
      });
    }

    const session = await db.Session.findOne({
      where: { session_id, user_id: req.user.id }
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    const sock = whatsappService.getSession(session_id);
    if (!sock) {
      return res.status(400).json({
        success: false,
        message: 'WhatsApp session not active'
      });
    }

    // Format participants
    const formattedParticipants = participants.map(p => 
      p.includes('@') ? p : `${p}@s.whatsapp.net`
    );

    const result = await sock.socket.groupParticipantsUpdate(
      group_id,
      formattedParticipants,
      'promote'
    );

    res.json({
      success: true,
      message: 'Participants promoted to admin successfully',
      group_id,
      result
    });
  } catch (error) {
    console.error('Promote to admin error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to promote participants',
      error: error.message
    });
  }
};

/**
 * Demote admin to participant
 */
const demoteAdmin = async (req, res) => {
  try {
    const { session_id, group_id, participants } = req.body;

    if (!session_id || !group_id || !participants || participants.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Session ID, Group ID, and participants are required'
      });
    }

    const session = await db.Session.findOne({
      where: { session_id, user_id: req.user.id }
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    const sock = whatsappService.getSession(session_id);
    if (!sock) {
      return res.status(400).json({
        success: false,
        message: 'WhatsApp session not active'
      });
    }

    // Format participants
    const formattedParticipants = participants.map(p => 
      p.includes('@') ? p : `${p}@s.whatsapp.net`
    );

    const result = await sock.socket.groupParticipantsUpdate(
      group_id,
      formattedParticipants,
      'demote'
    );

    res.json({
      success: true,
      message: 'Admins demoted to participant successfully',
      group_id,
      result
    });
  } catch (error) {
    console.error('Demote admin error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to demote admins',
      error: error.message
    });
  }
};

/**
 * Leave group
 */
const leaveGroup = async (req, res) => {
  try {
    const { session_id, group_id } = req.body;

    if (!session_id || !group_id) {
      return res.status(400).json({
        success: false,
        message: 'Session ID and Group ID are required'
      });
    }

    const session = await db.Session.findOne({
      where: { session_id, user_id: req.user.id }
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    const sock = whatsappService.getSession(session_id);
    if (!sock) {
      return res.status(400).json({
        success: false,
        message: 'WhatsApp session not active'
      });
    }

    await sock.socket.groupLeave(group_id);

    res.json({
      success: true,
      message: 'Left group successfully',
      group_id
    });
  } catch (error) {
    console.error('Leave group error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to leave group',
      error: error.message
    });
  }
};

/**
 * Get group invite link
 */
const getInviteLink = async (req, res) => {
  try {
    const { session_id, group_id } = req.query;

    if (!session_id || !group_id) {
      return res.status(400).json({
        success: false,
        message: 'Session ID and Group ID are required'
      });
    }

    const session = await db.Session.findOne({
      where: { session_id, user_id: req.user.id }
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    const sock = whatsappService.getSession(session_id);
    if (!sock) {
      return res.status(400).json({
        success: false,
        message: 'WhatsApp session not active'
      });
    }

    const inviteCode = await sock.socket.groupInviteCode(group_id);
    const inviteLink = `https://chat.whatsapp.com/${inviteCode}`;

    res.json({
      success: true,
      group_id,
      invite_code: inviteCode,
      invite_link: inviteLink
    });
  } catch (error) {
    console.error('Get invite link error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get invite link',
      error: error.message
    });
  }
};

/**
 * Revoke group invite link
 */
const revokeInviteLink = async (req, res) => {
  try {
    const { session_id, group_id } = req.body;

    if (!session_id || !group_id) {
      return res.status(400).json({
        success: false,
        message: 'Session ID and Group ID are required'
      });
    }

    const session = await db.Session.findOne({
      where: { session_id, user_id: req.user.id }
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    const sock = whatsappService.getSession(session_id);
    if (!sock) {
      return res.status(400).json({
        success: false,
        message: 'WhatsApp session not active'
      });
    }

    await sock.socket.groupRevokeInvite(group_id);
    
    // Get new invite code
    const newInviteCode = await sock.socket.groupInviteCode(group_id);
    const newInviteLink = `https://chat.whatsapp.com/${newInviteCode}`;

    res.json({
      success: true,
      message: 'Invite link revoked and new link generated',
      group_id,
      new_invite_code: newInviteCode,
      new_invite_link: newInviteLink
    });
  } catch (error) {
    console.error('Revoke invite link error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to revoke invite link',
      error: error.message
    });
  }
};

module.exports = {
  createGroup,
  getGroupInfo,
  updateGroupName,
  updateGroupDescription,
  updateGroupPicture,
  addParticipants,
  removeParticipants,
  promoteToAdmin,
  demoteAdmin,
  leaveGroup,
  getInviteLink,
  revokeInviteLink
};
