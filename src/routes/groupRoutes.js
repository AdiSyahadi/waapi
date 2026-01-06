const express = require('express');
const router = express.Router();
const groupController = require('../controllers/groupController');
const { authenticate } = require('../middleware/auth');
const { checkSubscriptionLimit } = require('../middleware/permissions');
const { upload } = require('../config/upload');

/**
 * @route   POST /api/v1/groups/create
 * @desc    Create new WhatsApp group
 * @access  Private
 */
router.post('/create', 
  authenticate, 
  checkSubscriptionLimit('groups'),
  groupController.createGroup
);

/**
 * @route   GET /api/v1/groups/info
 * @desc    Get group information
 * @access  Private
 */
router.get('/info', 
  authenticate,
  groupController.getGroupInfo
);

/**
 * @route   PUT /api/v1/groups/name
 * @desc    Update group name (admin only)
 * @access  Private
 */
router.put('/name', 
  authenticate,
  groupController.updateGroupName
);

/**
 * @route   PUT /api/v1/groups/description
 * @desc    Update group description (admin only)
 * @access  Private
 */
router.put('/description', 
  authenticate,
  groupController.updateGroupDescription
);

/**
 * @route   PUT /api/v1/groups/picture
 * @desc    Update group picture (admin only)
 * @access  Private
 */
router.put('/picture', 
  authenticate,
  upload.single('image'),
  groupController.updateGroupPicture
);

/**
 * @route   POST /api/v1/groups/participants/add
 * @desc    Add participants to group (admin only)
 * @access  Private
 */
router.post('/participants/add', 
  authenticate,
  groupController.addParticipants
);

/**
 * @route   POST /api/v1/groups/participants/remove
 * @desc    Remove participants from group (admin only)
 * @access  Private
 */
router.post('/participants/remove', 
  authenticate,
  groupController.removeParticipants
);

/**
 * @route   POST /api/v1/groups/participants/promote
 * @desc    Promote participant to admin (super admin only)
 * @access  Private
 */
router.post('/participants/promote', 
  authenticate,
  groupController.promoteToAdmin
);

/**
 * @route   POST /api/v1/groups/participants/demote
 * @desc    Demote admin to participant (super admin only)
 * @access  Private
 */
router.post('/participants/demote', 
  authenticate,
  groupController.demoteAdmin
);

/**
 * @route   POST /api/v1/groups/leave
 * @desc    Leave group
 * @access  Private
 */
router.post('/leave', 
  authenticate,
  groupController.leaveGroup
);

/**
 * @route   GET /api/v1/groups/invite
 * @desc    Get group invite link
 * @access  Private
 */
router.get('/invite', 
  authenticate,
  groupController.getInviteLink
);

/**
 * @route   POST /api/v1/groups/invite/revoke
 * @desc    Revoke group invite link and generate new one (admin only)
 * @access  Private
 */
router.post('/invite/revoke', 
  authenticate,
  groupController.revokeInviteLink
);

module.exports = router;
