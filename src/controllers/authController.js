const db = require('../models');
const { generateAccessToken, generateRefreshToken, verifyRefreshToken, generateRandomToken, hashToken } = require('../utils/jwt');
const { sendVerificationEmail, sendPasswordResetEmail, sendWelcomeEmail } = require('../utils/email');
const { logAPI } = require('../config/logger');

/**
 * Register new user
 */
const register = async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { email, password, name, phone } = req.body;

    // Validate input
    if (!email || !password || !name) {
      return res.status(400).json({
        success: false,
        message: 'Email, password, and name are required'
      });
    }

    // Check if user exists
    const existingUser = await db.User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'Email already registered'
      });
    }

    // Generate verification token
    const verificationToken = generateRandomToken();
    const hashedToken = hashToken(verificationToken);

    // Use transaction untuk ensure atomicity
    const result = await db.sequelize.transaction(async (t) => {
      // Create user first
      const user = await db.User.create({
        email,
        password, // Will be hashed by model hook
        name,
        phone,
        verification_token: hashedToken,
        metadata: {
          registered_at: new Date(),
          registration_ip: req.ip || req.connection.remoteAddress
        }
      }, { transaction: t });

      // Get free plan and create subscription
      const freePlan = await db.Plan.findOne({ where: { slug: 'free' } }, { transaction: t });
      let subscription = null;
      if (freePlan) {
        subscription = await db.Subscription.create({
          user_id: user.id,
          plan_id: freePlan.id,
          status: 'trial',
          current_period_start: new Date(),
          current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
          usage: {
            sessions: 0,
            messages_today: 0,
            messages_this_month: 0
          }
        }, { transaction: t });

        // Update user with subscription_id
        await user.update({ subscription_id: subscription.id }, { transaction: t });
      }

      return { user, subscription };
    });

    const { user } = result;

    // Send verification email
    try {
      await sendVerificationEmail(user, verificationToken);
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError);
      // Don't fail registration if email fails
    }

    // Create audit log
    await db.AuditLog.create({
      user_id: user.id,
      action: 'user.registered',
      resource_type: 'user',
      resource_id: user.id,
      description: 'User registered',
      ip_address: req.ip || req.connection.remoteAddress,
      user_agent: req.headers['user-agent']
    });

    logAPI(req.method, req.path, 201, Date.now() - startTime, user.id);

    res.status(201).json({
      success: true,
      message: 'Registration successful. Please check your email to verify your account.',
      data: {
        user: user.toJSON()
      }
    });
  } catch (error) {
    logAPI(req.method, req.path, 500, Date.now() - startTime);
    res.status(500).json({
      success: false,
      message: 'Registration failed',
      error: error.message
    });
  }
};

/**
 * Login user
 */
const login = async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    // Find user
    const user = await db.User.findOne({ 
      where: { email },
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

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Verify password
    const isValidPassword = await user.validatePassword(password);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if account is active
    if (user.status === 'suspended') {
      return res.status(403).json({
        success: false,
        message: 'Account has been suspended'
      });
    }

    // Check 2FA
    if (user.two_factor_enabled) {
      // Return temporary token for 2FA verification
      const tempToken = generateAccessToken({ id: user.id, twoFactorPending: true });
      return res.json({
        success: true,
        message: '2FA verification required',
        requiresTwoFactor: true,
        tempToken
      });
    }

    // Generate tokens
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
      action: 'user.login',
      resource_type: 'user',
      resource_id: user.id,
      description: 'User logged in',
      ip_address: req.ip || req.connection.remoteAddress,
      user_agent: req.headers['user-agent']
    });

    logAPI(req.method, req.path, 200, Date.now() - startTime, user.id);

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
    logAPI(req.method, req.path, 500, Date.now() - startTime);
    res.status(500).json({
      success: false,
      message: 'Login failed',
      error: error.message
    });
  }
};

/**
 * Refresh access token
 */
const refreshToken = async (req, res) => {
  try {
    const { refreshToken: token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Refresh token required'
      });
    }

    // Verify refresh token
    const decoded = verifyRefreshToken(token);

    // Get user
    const user = await db.User.findByPk(decoded.id);
    if (!user || user.status !== 'active') {
      return res.status(401).json({
        success: false,
        message: 'Invalid refresh token'
      });
    }

    // Generate new access token
    const accessToken = generateAccessToken({ id: user.id, email: user.email, role: user.role });

    res.json({
      success: true,
      data: {
        accessToken,
        expiresIn: process.env.JWT_EXPIRES_IN || '24h'
      }
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Invalid or expired refresh token',
      error: error.message
    });
  }
};

/**
 * Get current user profile
 */
const getProfile = async (req, res) => {
  try {
    const user = await db.User.findByPk(req.user.id, {
      include: [
        {
          model: db.Subscription,
          as: 'subscription',
          include: [{
            model: db.Plan,
            as: 'plan'
          }]
        },
        {
          model: db.Organization,
          as: 'organization'
        }
      ]
    });

    res.json({
      success: true,
      data: {
        user: user.toJSON()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get profile',
      error: error.message
    });
  }
};

/**
 * Logout user
 */
const logout = async (req, res) => {
  try {
    // Create audit log
    await db.AuditLog.create({
      user_id: req.user.id,
      action: 'user.logout',
      resource_type: 'user',
      resource_id: req.user.id,
      description: 'User logged out',
      ip_address: req.ip || req.connection.remoteAddress,
      user_agent: req.headers['user-agent']
    });

    res.json({
      success: true,
      message: 'Logout successful'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Logout failed',
      error: error.message
    });
  }
};

module.exports = {
  register,
  login,
  refreshToken,
  getProfile,
  logout
};
