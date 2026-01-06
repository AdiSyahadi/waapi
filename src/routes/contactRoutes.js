const express = require('express');
const router = express.Router();
const contactController = require('../controllers/contactController');
const { authenticate } = require('../middleware/auth');
const { upload } = require('../config/upload');

/**
 * @route   GET /api/v1/contacts/list
 * @desc    Get all contacts
 * @access  Private
 */
router.get('/list', 
  authenticate,
  contactController.getContactList
);

/**
 * @route   POST /api/v1/contacts/check
 * @desc    Check if numbers are registered on WhatsApp (bulk check, max 100)
 * @access  Private
 */
router.post('/check', 
  authenticate,
  contactController.checkNumberRegistered
);

/**
 * @route   GET /api/v1/contacts/info
 * @desc    Get contact information (name, status, profile picture, last seen)
 * @access  Private
 */
router.get('/info', 
  authenticate,
  contactController.getContactInfo
);

/**
 * @route   GET /api/v1/contacts/profile-picture
 * @desc    Get profile picture URL (high/low quality)
 * @access  Private
 */
router.get('/profile-picture', 
  authenticate,
  contactController.getProfilePicture
);

/**
 * @route   PUT /api/v1/contacts/profile-picture
 * @desc    Update own profile picture
 * @access  Private
 */
router.put('/profile-picture', 
  authenticate,
  upload.single('image'),
  contactController.updateProfilePicture
);

/**
 * @route   GET /api/v1/contacts/status
 * @desc    Get profile status/about (own or contact)
 * @access  Private
 */
router.get('/status', 
  authenticate,
  contactController.getProfileStatus
);

/**
 * @route   PUT /api/v1/contacts/status
 * @desc    Update own profile status/about (max 139 chars)
 * @access  Private
 */
router.put('/status', 
  authenticate,
  contactController.updateProfileStatus
);

module.exports = router;
