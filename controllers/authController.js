import { validationResult } from 'express-validator';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import OTP from '../models/OTP.js';
import { generateToken, generateRefreshToken } from '../middlewares/auth.js';
import { generateOTP } from '../utils/otpGenerator.js';
import { sendOTPEmail } from '../utils/emailSender.js';

/**
 * Send OTP to admin email for login
 * POST /api/auth/admin/send-otp
 */
export const sendAdminOTP = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
    }

    const { email } = req.body;
    
    // Check if email matches admin email from environment
    if (email.toLowerCase() !== process.env.ADMIN_EMAIL?.toLowerCase()) {
      return res.status(401).json({
        success: false,
        message: 'Invalid admin email address',
      });
    }

    // Check if there's already a valid OTP for this email
    const existingValidOTP = await OTP.hasValidOTP(email);
    if (existingValidOTP) {
      const remainingTime = await OTP.getRemainingTime(email);
      return res.status(429).json({
        success: false,
        message: `OTP already sent. Please wait ${Math.ceil(remainingTime / 60)} minutes before requesting a new one.`,
        remainingTime,
      });
    }

    // Generate new OTP
    const otp = generateOTP();
    const expiryMinutes = parseInt(process.env.OTP_EXPIRY_MINUTES) || 5;

    // Save OTP to database
    await OTP.createOTP(email, otp, expiryMinutes);

    // Send OTP email
    const emailResult = await sendOTPEmail(email, otp, expiryMinutes);

    if (!emailResult.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to send OTP email',
        error: emailResult.error,
      });
    }

    res.status(200).json({
      success: true,
      message: 'OTP sent successfully to admin email',
      expiryMinutes,
    });

  } catch (error) {
    console.error('Send admin OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send OTP',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * Verify admin OTP and return JWT token
 * POST /api/auth/admin/verify-otp
 */
export const verifyAdminOTP = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
    }

    const { email, otp } = req.body;

    // Verify email matches admin email
    if (email.toLowerCase() !== process.env.ADMIN_EMAIL?.toLowerCase()) {
      return res.status(401).json({
        success: false,
        message: 'Invalid admin email address',
      });
    }

    // Verify OTP
    const isValidOTP = await OTP.verifyOTP(email, otp);

    if (!isValidOTP) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired OTP',
      });
    }

    // Find or create admin user
    let admin = await User.findAdmin();
    
    if (!admin) {
      // Create admin user if doesn't exist
      admin = new User({
        username: 'admin',
        email: email,
        role: 'admin',
        isActive: true,
      });
      await admin.save();
    }

    // Update last login
    await admin.updateLastLogin();

    // Generate tokens
    const token = generateToken(admin);
    const refreshToken = generateRefreshToken(admin);

    res.status(200).json({
      success: true,
      message: 'Admin login successful',
      data: {
        user: admin,
        token,
        refreshToken,
        expiresIn: process.env.JWT_EXPIRE || '7d',
      },
    });

  } catch (error) {
    console.error('Verify admin OTP error:', error);
    
    // Handle specific OTP errors
    if (error.message.includes('OTP')) {
      return res.status(401).json({
        success: false,
        message: error.message,
      });
    }

    res.status(500).json({
      success: false,
      message: 'OTP verification failed',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * User login with username and password
 * POST /api/auth/user/login
 */
export const userLogin = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
    }

    const { username, password } = req.body;

    // Find user by username
    const user = await User.findOne({ 
      username: username.toLowerCase(), 
      role: 'user',
      isActive: true 
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid username or password',
      });
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid username or password',
      });
    }

    // Update last login
    await user.updateLastLogin();

    // Generate tokens
    const token = generateToken(user);
    const refreshToken = generateRefreshToken(user);

    res.status(200).json({
      success: true,
      message: 'User login successful',
      data: {
        user,
        token,
        refreshToken,
        expiresIn: process.env.JWT_EXPIRE || '7d',
      },
    });

  } catch (error) {
    console.error('User login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * Get current authenticated user profile
 * GET /api/auth/profile
 */
export const getProfile = async (req, res) => {
  try {
    const user = req.user;

    res.status(200).json({
      success: true,
      message: 'Profile retrieved successfully',
      data: {
        user,
      },
    });

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve profile',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * Refresh JWT token using refresh token
 * POST /api/auth/refresh
 */
export const refreshToken = async (req, res) => {
  try {
    const { refreshToken: token } = req.body;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token is required',
      });
    }

    // Verify refresh token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.type !== 'refresh') {
      return res.status(401).json({
        success: false,
        message: 'Invalid refresh token',
      });
    }

    // Get user from database
    const user = await User.findById(decoded.userId).select('-password');

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'User not found or inactive',
      });
    }

    // Generate new tokens
    const newToken = generateToken(user);
    const newRefreshToken = generateRefreshToken(user);

    res.status(200).json({
      success: true,
      message: 'Token refreshed successfully',
      data: {
        token: newToken,
        refreshToken: newRefreshToken,
        expiresIn: process.env.JWT_EXPIRE || '7d',
      },
    });

  } catch (error) {
    console.error('Refresh token error:', error);
    
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired refresh token',
      });
    }

    res.status(500).json({
      success: false,
      message: 'Token refresh failed',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * Logout user (client-side token removal)
 * POST /api/auth/logout
 */
export const logout = async (req, res) => {
  try {
    // In a stateless JWT system, logout is mainly handled client-side
    // But we can perform cleanup or logging here if needed
    
    res.status(200).json({
      success: true,
      message: 'Logout successful',
    });

  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Logout failed',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * Check OTP status for email
 * GET /api/auth/admin/otp-status/:email
 */
export const getOTPStatus = async (req, res) => {
  try {
    const { email } = req.params;

    if (email.toLowerCase() !== process.env.ADMIN_EMAIL?.toLowerCase()) {
      return res.status(401).json({
        success: false,
        message: 'Invalid admin email address',
      });
    }

    const hasValidOTP = await OTP.hasValidOTP(email);
    const remainingTime = await OTP.getRemainingTime(email);

    res.status(200).json({
      success: true,
      data: {
        hasValidOTP,
        remainingTime,
        canRequestNew: !hasValidOTP,
      },
    });

  } catch (error) {
    console.error('Get OTP status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get OTP status',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

export default {
  sendAdminOTP,
  verifyAdminOTP,
  userLogin,
  getProfile,
  refreshToken,
  logout,
  getOTPStatus,
};