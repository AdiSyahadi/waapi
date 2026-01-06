const whatsappService = require('../services/whatsappService');
const db = require('../models');
const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const fs = require('fs');
const path = require('path');
const { mediaDir } = require('../config/upload');

/**
 * Send text message
 */
const sendTextMessage = async (sock, remoteJid, text, options = {}) => {
  try {
    const sent = await sock.sendMessage(remoteJid, {
      text,
      ...options
    });
    
    return sent;
  } catch (error) {
    throw new Error(`Failed to send text message: ${error.message}`);
  }
};

/**
 * Send media message (image, video, document, audio)
 */
const sendMediaMessage = async (sock, remoteJid, mediaPath, type, caption = '', options = {}) => {
  try {
    const mediaBuffer = fs.readFileSync(mediaPath);
    
    const message = {
      caption,
      ...options
    };

    switch (type) {
      case 'image':
        message.image = mediaBuffer;
        break;
      case 'video':
        message.video = mediaBuffer;
        break;
      case 'audio':
        message.audio = mediaBuffer;
        message.mimetype = 'audio/mp4';
        break;
      case 'document':
        message.document = mediaBuffer;
        message.mimetype = options.mimetype || 'application/pdf';
        message.fileName = options.fileName || path.basename(mediaPath);
        break;
      default:
        throw new Error('Unsupported media type');
    }

    const sent = await sock.sendMessage(remoteJid, message);
    return sent;
  } catch (error) {
    throw new Error(`Failed to send ${type}: ${error.message}`);
  }
};

/**
 * Download media from message
 */
const downloadMedia = async (message) => {
  try {
    const buffer = await downloadMediaMessage(
      message,
      'buffer',
      {},
      {
        logger: console,
        reuploadRequest: sock => sock.updateMediaMessage
      }
    );

    // Save to media directory
    const filename = `${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const filePath = path.join(mediaDir, filename);
    
    fs.writeFileSync(filePath, buffer);
    
    return {
      path: filePath,
      filename,
      buffer
    };
  } catch (error) {
    throw new Error(`Failed to download media: ${error.message}`);
  }
};

/**
 * Send contact
 */
const sendContact = async (sock, remoteJid, contacts) => {
  try {
    const sent = await sock.sendMessage(remoteJid, {
      contacts: {
        displayName: contacts[0].displayName,
        contacts: contacts.map(c => ({
          displayName: c.displayName,
          vcard: c.vcard
        }))
      }
    });
    
    return sent;
  } catch (error) {
    throw new Error(`Failed to send contact: ${error.message}`);
  }
};

/**
 * Send location
 */
const sendLocation = async (sock, remoteJid, latitude, longitude, name = '', address = '') => {
  try {
    const sent = await sock.sendMessage(remoteJid, {
      location: {
        degreesLatitude: latitude,
        degreesLongitude: longitude,
        name,
        address
      }
    });
    
    return sent;
  } catch (error) {
    throw new Error(`Failed to send location: ${error.message}`);
  }
};

/**
 * Format phone number to WhatsApp JID
 */
const formatPhoneNumber = (phone) => {
  // Remove all non-numeric characters
  let cleaned = phone.replace(/\D/g, '');
  
  // Remove leading zeros
  cleaned = cleaned.replace(/^0+/, '');
  
  // Add country code if not present (default to Indonesia +62)
  if (!cleaned.startsWith('62')) {
    cleaned = '62' + cleaned;
  }
  
  return cleaned + '@s.whatsapp.net';
};

/**
 * Check if number is registered on WhatsApp
 */
const checkNumberRegistered = async (sock, phone) => {
  try {
    const jid = formatPhoneNumber(phone);
    const [result] = await sock.onWhatsApp(jid);
    return result?.exists || false;
  } catch (error) {
    return false;
  }
};

/**
 * Get contact info
 */
const getContact = async (sock, jid) => {
  try {
    const contact = await sock.getContact(jid);
    return contact;
  } catch (error) {
    return null;
  }
};

/**
 * Get profile picture
 */
const getProfilePicture = async (sock, jid) => {
  try {
    const ppUrl = await sock.profilePictureUrl(jid, 'image');
    return ppUrl;
  } catch (error) {
    return null;
  }
};

module.exports = {
  sendTextMessage,
  sendMediaMessage,
  downloadMedia,
  sendContact,
  sendLocation,
  formatPhoneNumber,
  checkNumberRegistered,
  getContact,
  getProfilePicture
};
