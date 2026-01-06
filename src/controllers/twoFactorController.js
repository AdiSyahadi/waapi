const db = require('../models');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const { generateAccessToken, generateRefreshToken, verifyAccessToken } = require('../utils/jwt');

/**
 * Setup 2FA - Generate secret and QR code
 */
const setup2FA = async (req, res) => {
  try {
    const user = await db.User.findByPk(req.user.id);

    if (user.two_factor_enabled) {
      return res.status(400).json({
        success: false,
        message: '2FA is already enabled'
      });
    }

    // Generate secret
    const secret = speakeasy.generateSecret({
      name: `WhatsApp API (${user.email})`,
      issuer: 'WhatsApp API'
    });

    // Generate QR code
    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);

    // Store secret temporarily (not enabled yet)
    await user.update({
      two_factor_secret: secret.base32
    });

    res.json({
      success: true,
      message: '2FA setup initiated',
      data: {
        secret: secret.base32,
        qrCode: qrCodeUrl,
        manualEntry: secret.otpauth_url
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to setup 2FA',
      error: error.message
    });
  }
};

/**
 * Enable 2FA - Verify token and enable
 */
const enable2FA = async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Verification token required'
      });
    }

    const user = await db.User.findByPk(req.user.id);

    if (!user.two_factor_secret) {
      return res.status(400).json({
        success: false,
        message: '2FA setup not initiated. Call /setup first'
      });
    }

    // Verify token
    const verified = speakeasy.totp.verify({
      secret: user.two_factor_secret,
      encoding: 'base32',
      token: token,
      window: 2
    });

    if (!verified) {
      return res.status(400).json({
        success: false,
        message: 'Invalid verification code'
      });
    }

    // Enable 2FA
    await user.update({
      two_factor_enabled: true
    });

    // Create audit log
    await db.AuditLog.create({
      user_id: user.id,
      action: 'user.2fa_enabled',
      resource_type: 'user',
      resource_id: user.id,
      description: '2FA enabled',
      ip_address: req.ip || req.connection.remoteAddress,
      user_agent: req.headers['user-agent']
    });

    res.json({
      success: true,
      message: '2FA enabled successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to enable 2FA',
      error: error.message
    });
  }
};

/**
 * Disable 2FA
 */
const disable2FA = async (req, res) => {
  try {
    const { password, token } = req.body;

    if (!password || !token) {
      return res.status(400).json({
        success: false,
        message: 'Password and 2FA token required'
      });
    }

    const user = await db.User.findByPk(req.user.id);

    // Verify password
    const isValidPassword = await user.validatePassword(password);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: 'Invalid password'
      });
    }

    // Verify 2FA token
    const verified = speakeasy.totp.verify({
      secret: user.two_factor_secret,
      encoding: 'base32',
      token: token,
      window: 2
    });

    if (!verified) {
      return res.status(400).json({
        success: false,
        message: 'Invalid 2FA code'
      });
    }

    // Disable 2FA
    await user.update({
      two_factor_enabled: false,
      two_factor_secret: null
    });

    // Create audit log
    await db.AuditLog.create({
      user_id: user.id,
      action: 'user.2fa_disabled',
      resource_type: 'user',
      resource_id: user.id,
      description: '2FA disabled',
      ip_address: req.ip || req.connection.remoteAddress,
      user_agent: req.headers['user-agent']
    });

    res.json({
      success: true,
      message: '2FA disabled successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to disable 2FA',
      error: error.message
    });
  }
};

/**
 * Verify 2FA token during login
 */
const verify2FA = async (req, res) => {
  try {
    const { tempToken, token } = req.body;

    if (!tempToken || !token) {
      return res.status(400).json({
        success: false,
        message: 'Temporary token and 2FA code required'
      });
    }

    // Verify temp token
    let decoded;
    try {
      decoded = verifyAccessToken(tempToken);
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'Invalid temporary token'
      });
    }

    if (!decoded.twoFactorPending) {
      return res.status(400).json({
        success: false,
        message: 'Invalid temporary token'
      });
    }

    // Get user
    const user = await db.User.findByPk(decoded.id, {
      include: [
        {
          model: db.Subscription,
          as: 'subscription',
          include: [{
            model: db.Plan,
            as: 'plan'
          }]
        }
      ]
    });

    if (!user || !user.two_factor_enabled) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request'
      });
    }

    // Verify 2FA token
    const verified = speakeasy.totp.verify({
      secret: user.two_factor_secret,
      encoding: 'base32',
      token: token,
      window: 2
    });

    if (!verified) {
      return res.status(400).json({
        success: false,
        message: 'Invalid 2FA code'
      });
    }

    // Generate real tokens
    const accessToken = generateAccessToken({ id: user.id, email: user.email, role: user.role });
    const refreshToken = generateRefreshToken({ id: user.id });

    // Update last login
    await user.update({
      last_login: new Date(),
      last_login_ip: req.ip || req.connection.remoteAddress
    });

    // Create audit log
    await db.AuditLog.create({
      user_id: user.id,
      action: 'user.2fa_verified',
      resource_type: 'user',
      resource_id: user.id,
      description: '2FA verified during login',
      ip_address: req.ip || req.connection.remoteAddress,
      user_agent: req.headers['user-agent']
    });

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: user.toJSON(),
        tokens: {
          accessToken,
          refreshToken,
          expiresIn: process.env.JWT_EXPIRES_IN || '24h'
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to verify 2FA',
      error: error.message
    });
  }
};

module.exports = {
  setup2FA,
  enable2FA,
  disable2FA,
  verify2FA
};
