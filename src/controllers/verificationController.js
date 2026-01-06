const db = require('../models');
const { generateRandomToken, hashToken } = require('../utils/jwt');
const { sendVerificationEmail, sendPasswordResetEmail, sendWelcomeEmail } = require('../utils/email');

/**
 * Verify email with token
 */
const verifyEmail = async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Verification token required'
      });
    }

    // Hash token to compare with stored hash
    const hashedToken = hashToken(token);

    // Find user with matching token
    const user = await db.User.findOne({
      where: {
        verification_token: hashedToken,
        email_verified: false
      }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired verification token'
      });
    }

    // Update user
    await user.update({
      email_verified: true,
      email_verified_at: new Date(),
      verification_token: null,
      status: 'active'
    });

    // Send welcome email
    try {
      await sendWelcomeEmail(user);
    } catch (emailError) {
      console.error('Failed to send welcome email:', emailError);
    }

    // Create audit log
    await db.AuditLog.create({
      user_id: user.id,
      action: 'user.email_verified',
      resource_type: 'user',
      resource_id: user.id,
      description: 'Email verified',
      ip_address: req.ip || req.connection.remoteAddress,
      user_agent: req.headers['user-agent']
    });

    res.json({
      success: true,
      message: 'Email verified successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Email verification failed',
      error: error.message
    });
  }
};

/**
 * Resend verification email
 */
const resendVerification = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    // Find user
    const user = await db.User.findOne({ where: { email } });

    if (!user) {
      // Don't reveal if email exists
      return res.json({
        success: true,
        message: 'If the email exists, a verification link has been sent'
      });
    }

    if (user.email_verified) {
      return res.status(400).json({
        success: false,
        message: 'Email is already verified'
      });
    }

    // Generate new token
    const verificationToken = generateRandomToken();
    const hashedToken = hashToken(verificationToken);

    await user.update({
      verification_token: hashedToken
    });

    // Send verification email
    await sendVerificationEmail(user, verificationToken);

    res.json({
      success: true,
      message: 'Verification email sent'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to resend verification email',
      error: error.message
    });
  }
};

/**
 * Request password reset
 */
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    // Find user
    const user = await db.User.findOne({ where: { email } });

    if (!user) {
      // Don't reveal if email exists
      return res.json({
        success: true,
        message: 'If the email exists, a password reset link has been sent'
      });
    }

    // Generate reset token
    const resetToken = generateRandomToken();
    const hashedToken = hashToken(resetToken);

    // Set token and expiry (1 hour)
    await user.update({
      password_reset_token: hashedToken,
      password_reset_expires: new Date(Date.now() + 60 * 60 * 1000)
    });

    // Send reset email
    await sendPasswordResetEmail(user, resetToken);

    // Create audit log
    await db.AuditLog.create({
      user_id: user.id,
      action: 'user.password_reset_requested',
      resource_type: 'user',
      resource_id: user.id,
      description: 'Password reset requested',
      ip_address: req.ip || req.connection.remoteAddress,
      user_agent: req.headers['user-agent']
    });

    res.json({
      success: true,
      message: 'Password reset email sent'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to process password reset request',
      error: error.message
    });
  }
};

/**
 * Reset password with token
 */
const resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({
        success: false,
        message: 'Token and new password are required'
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters'
      });
    }

    // Hash token
    const hashedToken = hashToken(token);

    // Find user with valid reset token
    const user = await db.User.findOne({
      where: {
        password_reset_token: hashedToken
      }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token'
      });
    }

    // Check if token expired
    if (user.password_reset_expires < new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Reset token has expired'
      });
    }

    // Update password
    await user.update({
      password, // Will be hashed by model hook
      password_reset_token: null,
      password_reset_expires: null
    });

    // Create audit log
    await db.AuditLog.create({
      user_id: user.id,
      action: 'user.password_reset',
      resource_type: 'user',
      resource_id: user.id,
      description: 'Password reset completed',
      ip_address: req.ip || req.connection.remoteAddress,
      user_agent: req.headers['user-agent']
    });

    res.json({
      success: true,
      message: 'Password reset successful'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Password reset failed',
      error: error.message
    });
  }
};

/**
 * Change password (authenticated)
 */
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are required'
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 8 characters'
      });
    }

    // Get user with password
    const user = await db.User.findByPk(req.user.id);

    // Verify current password
    const isValid = await user.validatePassword(currentPassword);
    if (!isValid) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Update password
    await user.update({
      password: newPassword
    });

    // Create audit log
    await db.AuditLog.create({
      user_id: user.id,
      action: 'user.password_changed',
      resource_type: 'user',
      resource_id: user.id,
      description: 'Password changed',
      ip_address: req.ip || req.connection.remoteAddress,
      user_agent: req.headers['user-agent']
    });

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Password change failed',
      error: error.message
    });
  }
};

module.exports = {
  verifyEmail,
  resendVerification,
  forgotPassword,
  resetPassword,
  changePassword
};
