const nodemailer = require('nodemailer');
const { logger } = require('../config/logger');

// Create transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD
  }
});

/**
 * Send email
 */
const sendEmail = async ({ to, subject, html, text }) => {
  try {
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || 'noreply@whatsappapi.com',
      to,
      subject,
      html,
      text: text || ''
    });

    logger.info('Email sent', {
      messageId: info.messageId,
      to,
      subject
    });

    return { success: true, messageId: info.messageId };
  } catch (error) {
    logger.error('Email send failed', {
      error: error.message,
      to,
      subject
    });
    throw error;
  }
};

/**
 * Send verification email
 */
const sendVerificationEmail = async (user, token) => {
  const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Email Verification</h2>
      <p>Hello ${user.name},</p>
      <p>Thank you for registering! Please verify your email address by clicking the button below:</p>
      <div style="margin: 30px 0;">
        <a href="${verificationUrl}" 
           style="background-color: #4CAF50; color: white; padding: 12px 30px; text-decoration: none; border-radius: 4px; display: inline-block;">
          Verify Email
        </a>
      </div>
      <p>Or copy and paste this link into your browser:</p>
      <p style="color: #666; word-break: break-all;">${verificationUrl}</p>
      <p>This link will expire in 24 hours.</p>
      <p>If you didn't create an account, please ignore this email.</p>
      <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
      <p style="color: #999; font-size: 12px;">WhatsApp API - Multi-Session Platform</p>
    </div>
  `;

  return await sendEmail({
    to: user.email,
    subject: 'Verify Your Email Address',
    html
  });
};

/**
 * Send password reset email
 */
const sendPasswordResetEmail = async (user, token) => {
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Password Reset Request</h2>
      <p>Hello ${user.name},</p>
      <p>We received a request to reset your password. Click the button below to create a new password:</p>
      <div style="margin: 30px 0;">
        <a href="${resetUrl}" 
           style="background-color: #2196F3; color: white; padding: 12px 30px; text-decoration: none; border-radius: 4px; display: inline-block;">
          Reset Password
        </a>
      </div>
      <p>Or copy and paste this link into your browser:</p>
      <p style="color: #666; word-break: break-all;">${resetUrl}</p>
      <p>This link will expire in 1 hour.</p>
      <p>If you didn't request a password reset, please ignore this email or contact support if you have concerns.</p>
      <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
      <p style="color: #999; font-size: 12px;">WhatsApp API - Multi-Session Platform</p>
    </div>
  `;

  return await sendEmail({
    to: user.email,
    subject: 'Password Reset Request',
    html
  });
};

/**
 * Send welcome email
 */
const sendWelcomeEmail = async (user) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Welcome to WhatsApp API!</h2>
      <p>Hello ${user.name},</p>
      <p>Your account has been successfully verified. Welcome aboard! 🎉</p>
      <p>Here are some quick links to get you started:</p>
      <ul>
        <li><a href="${process.env.FRONTEND_URL}/dashboard">Dashboard</a></li>
        <li><a href="${process.env.FRONTEND_URL}/docs">API Documentation</a></li>
        <li><a href="${process.env.FRONTEND_URL}/sessions">Create Your First Session</a></li>
      </ul>
      <p>If you have any questions, feel free to reach out to our support team.</p>
      <p>Happy messaging!</p>
      <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
      <p style="color: #999; font-size: 12px;">WhatsApp API - Multi-Session Platform</p>
    </div>
  `;

  return await sendEmail({
    to: user.email,
    subject: 'Welcome to WhatsApp API!',
    html
  });
};

module.exports = {
  sendEmail,
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendWelcomeEmail
};
