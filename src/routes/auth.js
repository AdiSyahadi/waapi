const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const verificationController = require('../controllers/verificationController');
const twoFactorController = require('../controllers/twoFactorController');
const { authenticate } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');
const { body } = require('express-validator');
const { validate } = require('../middleware/validator');

// Validation rules
const registerValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('phone').optional().isMobilePhone().withMessage('Valid phone number required')
];

const loginValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required')
];

const refreshTokenValidation = [
  body('refreshToken').notEmpty().withMessage('Refresh token is required')
];

// Auth routes (with rate limiting)
router.post('/register', authLimiter, registerValidation, validate, authController.register);
router.post('/login', authLimiter, loginValidation, validate, authController.login);
router.post('/refresh', refreshTokenValidation, validate, authController.refreshToken);
router.get('/profile', authenticate, authController.getProfile);
router.post('/logout', authenticate, authController.logout);

// Email verification routes
router.post('/verify-email', verificationController.verifyEmail);
router.post('/resend-verification', verificationController.resendVerification);

// Password reset routes
router.post('/forgot-password', verificationController.forgotPassword);
router.post('/reset-password', verificationController.resetPassword);
router.post('/change-password', authenticate, verificationController.changePassword);

// 2FA routes
router.post('/2fa/setup', authenticate, twoFactorController.setup2FA);
router.post('/2fa/enable', authenticate, twoFactorController.enable2FA);
router.post('/2fa/disable', authenticate, twoFactorController.disable2FA);
router.post('/2fa/verify', twoFactorController.verify2FA);

module.exports = router;
