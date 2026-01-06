const db = require('../models');
const whatsappService = require('../services/whatsappService');

/**
 * Get contact list
 */
const getContactList = async (req, res) => {
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

    // Get contacts from store
    const contacts = Object.values(sock.socket.store?.contacts || {});

    const formattedContacts = contacts.map(contact => ({
      id: contact.id,
      name: contact.name || contact.notify || contact.verifiedName || 'Unknown',
      notify: contact.notify,
      verified_name: contact.verifiedName,
      img_url: contact.imgUrl
    }));

    res.json({
      success: true,
      count: formattedContacts.length,
      contacts: formattedContacts
    });
  } catch (error) {
    console.error('Get contact list error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get contact list',
      error: error.message
    });
  }
};

/**
 * Check if number is registered on WhatsApp
 */
const checkNumberRegistered = async (req, res) => {
  try {
    const { session_id, numbers } = req.body;

    if (!session_id || !numbers || !Array.isArray(numbers) || numbers.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Session ID and numbers array are required'
      });
    }

    if (numbers.length > 100) {
      return res.status(400).json({
        success: false,
        message: 'Maximum 100 numbers per request'
      });
    }

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

    // Format numbers and check registration
    const formattedNumbers = numbers.map(num => {
      const cleaned = num.toString().replace(/\D/g, '');
      return cleaned.includes('@') ? cleaned : `${cleaned}@s.whatsapp.net`;
    });

    const results = await Promise.all(
      formattedNumbers.map(async (jid) => {
        try {
          const [result] = await sock.socket.onWhatsApp(jid);
          return {
            number: jid.split('@')[0],
            jid: jid,
            exists: result?.exists || false
          };
        } catch (error) {
          return {
            number: jid.split('@')[0],
            jid: jid,
            exists: false,
            error: error.message
          };
        }
      })
    );

    res.json({
      success: true,
      count: results.length,
      results
    });
  } catch (error) {
    console.error('Check number registered error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check numbers',
      error: error.message
    });
  }
};

/**
 * Get contact information
 */
const getContactInfo = async (req, res) => {
  try {
    const { session_id, number } = req.query;

    if (!session_id || !number) {
      return res.status(400).json({
        success: false,
        message: 'Session ID and number are required'
      });
    }

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

    // Format JID
    const jid = number.includes('@') ? number : `${number}@s.whatsapp.net`;

    try {
      // Get contact status/about
      const status = await sock.socket.fetchStatus(jid).catch(() => null);
      
      // Get profile picture
      let profilePicUrl = null;
      try {
        profilePicUrl = await sock.socket.profilePictureUrl(jid, 'image').catch(() => null);
      } catch (e) {
        // Profile picture might not be available
      }

      const contactInfo = {
        jid,
        number: jid.split('@')[0],
        status: status?.status || null,
        status_timestamp: status?.setAt ? new Date(status.setAt * 1000) : null,
        profile_picture: profilePicUrl
      };

      res.json({
        success: true,
        contact: contactInfo
      });
    } catch (error) {
      res.status(404).json({
        success: false,
        message: 'Contact not found or information not available',
        error: error.message
      });
    }
  } catch (error) {
    console.error('Get contact info error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get contact information',
      error: error.message
    });
  }
};

/**
 * Get profile picture
 */
const getProfilePicture = async (req, res) => {
  try {
    const { session_id, number, quality = 'high' } = req.query;

    if (!session_id || !number) {
      return res.status(400).json({
        success: false,
        message: 'Session ID and number are required'
      });
    }

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

    // Format JID
    const jid = number.includes('@') ? number : `${number}@s.whatsapp.net`;

    try {
      const type = quality === 'high' ? 'image' : 'preview';
      const profilePicUrl = await sock.socket.profilePictureUrl(jid, type);

      res.json({
        success: true,
        jid,
        number: jid.split('@')[0],
        profile_picture_url: profilePicUrl,
        quality
      });
    } catch (error) {
      res.status(404).json({
        success: false,
        message: 'Profile picture not available',
        error: error.message
      });
    }
  } catch (error) {
    console.error('Get profile picture error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get profile picture',
      error: error.message
    });
  }
};

/**
 * Update own profile picture
 */
const updateProfilePicture = async (req, res) => {
  try {
    const { session_id } = req.body;
    const file = req.file;

    if (!session_id) {
      return res.status(400).json({
        success: false,
        message: 'Session ID is required'
      });
    }

    if (!file) {
      return res.status(400).json({
        success: false,
        message: 'Image file is required'
      });
    }

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

    const fs = require('fs');
    const imageBuffer = fs.readFileSync(file.path);

    // Get own JID
    const jid = sock.socket.user.id;

    await sock.socket.updateProfilePicture(jid, imageBuffer);

    // Clean up uploaded file
    fs.unlinkSync(file.path);

    res.json({
      success: true,
      message: 'Profile picture updated successfully',
      jid
    });
  } catch (error) {
    console.error('Update profile picture error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile picture',
      error: error.message
    });
  }
};

/**
 * Get profile status/about
 */
const getProfileStatus = async (req, res) => {
  try {
    const { session_id, number } = req.query;

    if (!session_id) {
      return res.status(400).json({
        success: false,
        message: 'Session ID is required'
      });
    }

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

    // If number not provided, get own status
    let jid;
    if (number) {
      jid = number.includes('@') ? number : `${number}@s.whatsapp.net`;
    } else {
      jid = sock.socket.user.id;
    }

    try {
      const status = await sock.socket.fetchStatus(jid);

      res.json({
        success: true,
        jid,
        number: jid.split('@')[0],
        status: status?.status || null,
        timestamp: status?.setAt ? new Date(status.setAt * 1000) : null
      });
    } catch (error) {
      res.status(404).json({
        success: false,
        message: 'Status not available',
        error: error.message
      });
    }
  } catch (error) {
    console.error('Get profile status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get profile status',
      error: error.message
    });
  }
};

/**
 * Update own profile status/about
 */
const updateProfileStatus = async (req, res) => {
  try {
    const { session_id, status } = req.body;

    if (!session_id || !status) {
      return res.status(400).json({
        success: false,
        message: 'Session ID and status are required'
      });
    }

    if (status.length > 139) {
      return res.status(400).json({
        success: false,
        message: 'Status must be maximum 139 characters'
      });
    }

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

    await sock.socket.updateProfileStatus(status);

    res.json({
      success: true,
      message: 'Profile status updated successfully',
      status
    });
  } catch (error) {
    console.error('Update profile status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile status',
      error: error.message
    });
  }
};

module.exports = {
  getContactList,
  checkNumberRegistered,
  getContactInfo,
  getProfilePicture,
  updateProfilePicture,
  getProfileStatus,
  updateProfileStatus
};
