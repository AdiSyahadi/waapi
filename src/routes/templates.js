const express = require('express');
const router = express.Router();
const templateController = require('../controllers/templateController');
const { authenticate } = require('../middleware/auth');
const { requireVerifiedEmail } = require('../middleware/permissions');
const { body } = require('express-validator');
const { validate } = require('../middleware/validator');

// Validation
const createTemplateValidation = [
  body('name').trim().notEmpty().withMessage('Template name is required'),
  body('type').isIn(['text', 'media', 'button', 'list', 'location', 'contact']).withMessage('Invalid template type'),
  body('content').notEmpty().withMessage('Template content is required')
];

const updateTemplateValidation = [
  body('name').optional().trim().notEmpty().withMessage('Template name cannot be empty'),
  body('type').optional().isIn(['text', 'media', 'button', 'list', 'location', 'contact']).withMessage('Invalid template type')
];

const useTemplateValidation = [
  body('sessionId').notEmpty().withMessage('Session ID is required'),
  body('phone').notEmpty().withMessage('Phone number is required')
];

// All routes require authentication and verified email
router.use(authenticate);
router.use(requireVerifiedEmail);

// Routes
router.post('/', createTemplateValidation, validate, templateController.createTemplate);
router.get('/', templateController.getTemplates);
router.get('/:id', templateController.getTemplate);
router.put('/:id', updateTemplateValidation, validate, templateController.updateTemplate);
router.delete('/:id', templateController.deleteTemplate);
router.post('/:id/use', useTemplateValidation, validate, templateController.useTemplate);

module.exports = router;
