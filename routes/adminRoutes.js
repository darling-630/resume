import express from 'express';
import { body, param, query } from 'express-validator';
import { authenticateToken } from '../middlewares/auth.js';
import { requireAdmin, canCreateUsers, canViewAllResumes } from '../middlewares/roleCheck.js';
import {
  createUser,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  getUserStats,
  resetUserPassword,
} from '../controllers/userController.js';
import {
  getAllResumes,
  getResumeStats,
} from '../controllers/resumeController.js';

const router = express.Router();

// Apply authentication and admin role check to all admin routes
router.use(authenticateToken);
router.use(requireAdmin);

// Validation rules
const createUserValidation = [
  body('username')
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be between 3 and 30 characters')
    .matches(/^[a-zA-Z0-9_.-]+$/)
    .withMessage('Username can only contain letters, numbers, dots, hyphens, and underscores')
    .toLowerCase(),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number'),
];

const updateUserValidation = [
  param('userId')
    .isMongoId()
    .withMessage('Invalid user ID'),
  body('username')
    .optional()
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be between 3 and 30 characters')
    .matches(/^[a-zA-Z0-9_.-]+$/)
    .withMessage('Username can only contain letters, numbers, dots, hyphens, and underscores')
    .toLowerCase(),
  body('password')
    .optional()
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean value'),
];

const userIdValidation = [
  param('userId')
    .isMongoId()
    .withMessage('Invalid user ID'),
];

const resetPasswordValidation = [
  param('userId')
    .isMongoId()
    .withMessage('Invalid user ID'),
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number'),
];

const paginationValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
];

// User Management Routes
/**
 * @route   POST /api/admin/users
 * @desc    Create a new user account
 * @access  Private (Admin only)
 */
router.post('/users', createUserValidation, canCreateUsers, createUser);

/**
 * @route   GET /api/admin/users
 * @desc    Get all users with pagination and filtering
 * @access  Private (Admin only)
 */
router.get('/users', paginationValidation, getAllUsers);

/**
 * @route   GET /api/admin/users/stats
 * @desc    Get user statistics and analytics
 * @access  Private (Admin only)
 */
router.get('/users/stats', getUserStats);

/**
 * @route   GET /api/admin/users/:userId
 * @desc    Get user by ID with detailed information
 * @access  Private (Admin only)
 */
router.get('/users/:userId', userIdValidation, getUserById);

/**
 * @route   PUT /api/admin/users/:userId
 * @desc    Update user account information
 * @access  Private (Admin only)
 */
router.put('/users/:userId', updateUserValidation, updateUser);

/**
 * @route   POST /api/admin/users/:userId/reset-password
 * @desc    Reset user password
 * @access  Private (Admin only)
 */
router.post('/users/:userId/reset-password', resetPasswordValidation, resetUserPassword);

/**
 * @route   DELETE /api/admin/users/:userId
 * @desc    Delete or deactivate user account
 * @access  Private (Admin only)
 */
router.delete('/users/:userId', userIdValidation, deleteUser);

// Resume Management Routes
/**
 * @route   GET /api/admin/resumes
 * @desc    Get all resumes with pagination and search
 * @access  Private (Admin only)
 */
router.get('/resumes', paginationValidation, canViewAllResumes, getAllResumes);

/**
 * @route   GET /api/admin/resumes/stats
 * @desc    Get resume statistics and analytics
 * @access  Private (Admin only)
 */
router.get('/resumes/stats', getResumeStats);

// Dashboard and Analytics Routes
/**
 * @route   GET /api/admin/dashboard
 * @desc    Get admin dashboard data with overview statistics
 * @access  Private (Admin only)
 */
router.get('/dashboard', async (req, res) => {
  try {
    // This would typically aggregate data from multiple controllers
    // For now, we'll redirect to get basic stats
    res.status(200).json({
      success: true,
      message: 'Admin dashboard data',
      data: {
        message: 'Use /api/admin/users/stats and /api/admin/resumes/stats endpoints for detailed statistics',
        quickLinks: {
          userStats: '/api/admin/users/stats',
          resumeStats: '/api/admin/resumes/stats',
          allUsers: '/api/admin/users',
          allResumes: '/api/admin/resumes',
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to load dashboard data',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

// System Administration Routes
/**
 * @route   GET /api/admin/system/health
 * @desc    Get system health check and status
 * @access  Private (Admin only)
 */
router.get('/system/health', async (req, res) => {
  try {
    // Basic system health check
    const systemInfo = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      nodeVersion: process.version,
      environment: process.env.NODE_ENV,
    };

    res.status(200).json({
      success: true,
      message: 'System health check completed',
      data: systemInfo,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'System health check failed',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

/**
 * @route   POST /api/admin/system/cleanup
 * @desc    Run system cleanup tasks (optional implementation)
 * @access  Private (Admin only)
 */
router.post('/system/cleanup', async (req, res) => {
  try {
    // Here you could implement cleanup tasks like:
    // - Removing expired OTPs
    // - Cleaning up orphaned files
    // - Archiving old data
    
    res.status(200).json({
      success: true,
      message: 'System cleanup tasks initiated',
      data: {
        note: 'Cleanup functionality can be implemented based on specific requirements',
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'System cleanup failed',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

// Admin profile management
/**
 * @route   GET /api/admin/profile
 * @desc    Get admin profile information
 * @access  Private (Admin only)
 */
router.get('/profile', (req, res) => {
  try {
    const admin = req.user;
    
    res.status(200).json({
      success: true,
      message: 'Admin profile retrieved successfully',
      data: {
        user: admin,
        permissions: [
          'create_users',
          'view_all_users',
          'update_users',
          'delete_users',
          'view_all_resumes',
          'system_administration',
        ],
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve admin profile',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

// Error handling for admin routes
router.use((error, req, res, next) => {
  console.error('Admin route error:', error);
  
  res.status(500).json({
    success: false,
    message: 'An error occurred in admin operations',
    error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
  });
});

export default router;