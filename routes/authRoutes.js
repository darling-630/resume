import express from 'express';
import { body } from 'express-validator';
import { authenticateToken } from '../middlewares/auth.js';
import {
  sendAdminOTP,
  verifyAdminOTP,
  userLogin,
  getProfile,
  refreshToken,
  logout,
  getOTPStatus,
} from '../controllers/authController.js';

const router = express.Router();

// Validation rules
const adminOTPValidation = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
];

const verifyOTPValidation = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  body('otp')
    .isLength({ min: 6, max: 6 })
    .withMessage('OTP must be exactly 6 digits')
    .isNumeric()
    .withMessage('OTP must contain only numbers'),
];

const userLoginValidation = [
  body('username')
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be between 3 and 30 characters')
    .matches(/^[a-zA-Z0-9_.-]+$/)
    .withMessage('Username can only contain letters, numbers, dots, hyphens, and underscores'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
];

const refreshTokenValidation = [
  body('refreshToken')
    .notEmpty()
    .withMessage('Refresh token is required'),
];

// Admin authentication routes
/**
 * @route   POST /api/auth/admin/send-otp
 * @desc    Send OTP to admin email for login
 * @access  Public
 */
router.post('/admin/send-otp', adminOTPValidation, sendAdminOTP);

/**
 * @route   POST /api/auth/admin/verify-otp
 * @desc    Verify admin OTP and get JWT token
 * @access  Public
 */
router.post('/admin/verify-otp', verifyOTPValidation, verifyAdminOTP);

/**
 * @route   GET /api/auth/admin/otp-status/:email
 * @desc    Check OTP status for admin email
 * @access  Public
 */
router.get('/admin/otp-status/:email', getOTPStatus);

// User authentication routes
/**
 * @route   POST /api/auth/user/login
 * @desc    User login with username and password
 * @access  Public
 */
router.post('/user/login', userLoginValidation, userLogin);

// Common authentication routes
/**
 * @route   GET /api/auth/profile
 * @desc    Get current authenticated user profile
 * @access  Private
 */
router.get('/profile', authenticateToken, getProfile);

/**
 * @route   POST /api/auth/refresh
 * @desc    Refresh JWT token using refresh token
 * @access  Public
 */
router.post('/refresh', refreshTokenValidation, refreshToken);

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user (client-side token removal)
 * @access  Private
 */
router.post('/logout', authenticateToken, logout);

// Health check for auth routes
/**
 * @route   GET /api/auth/health
 * @desc    Check auth service health
 * @access  Public
 */
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Authentication service is running',
    timestamp: new Date().toISOString(),
  });
});

export default router;