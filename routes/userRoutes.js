import express from 'express';
import { param, query } from 'express-validator';
import { authenticateToken } from '../middlewares/auth.js';
import { requireUser, requireAdminOrUser } from '../middlewares/roleCheck.js';
import Resume from '../models/Resume.js';
import {
  uploadResume,
  getUserResumes,
  getResumeById,
  downloadResume,
  deleteResume,
  reprocessResume,
} from '../controllers/resumeController.js';

const router = express.Router();

// Apply authentication to all user routes
router.use(authenticateToken);

// Validation rules
const resumeIdValidation = [
  param('resumeId')
    .isMongoId()
    .withMessage('Invalid resume ID'),
];

const paginationValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Limit must be between 1 and 50'),
  query('status')
    .optional()
    .isIn(['pending', 'processing', 'completed', 'failed'])
    .withMessage('Status must be one of: pending, processing, completed, failed'),
];

// Resume Management Routes
/**
 * @route   POST /api/user/resumes/upload
 * @desc    Upload and parse a resume file
 * @access  Private (User only)
 */
router.post('/resumes/upload', requireUser, uploadResume);

/**
 * @route   GET /api/user/resumes
 * @desc    Get user's own resumes with pagination and filtering
 * @access  Private (User only)
 */
router.get('/resumes', requireUser, paginationValidation, getUserResumes);

/**
 * @route   GET /api/user/resumes/:resumeId
 * @desc    Get specific resume by ID (user can only access their own)
 * @access  Private (Users can access their own, Admins can access all)
 */
router.get('/resumes/:resumeId', resumeIdValidation, requireAdminOrUser, getResumeById);

/**
 * @route   GET /api/user/resumes/:resumeId/download
 * @desc    Download resume file
 * @access  Private (Users can download their own, Admins can download all)
 */
router.get('/resumes/:resumeId/download', resumeIdValidation, requireAdminOrUser, downloadResume);

/**
 * @route   POST /api/user/resumes/:resumeId/reprocess
 * @desc    Reprocess/reparse resume file
 * @access  Private (Users can reprocess their own, Admins can reprocess all)
 */
router.post('/resumes/:resumeId/reprocess', resumeIdValidation, requireAdminOrUser, reprocessResume);

/**
 * @route   DELETE /api/user/resumes/:resumeId
 * @desc    Delete resume (soft delete)
 * @access  Private (Users can delete their own, Admins can delete all)
 */
router.delete('/resumes/:resumeId', resumeIdValidation, requireAdminOrUser, deleteResume);

// User Profile and Statistics Routes
/**
 * @route   GET /api/user/profile
 * @desc    Get user profile with resume statistics
 * @access  Private (User only)
 */
router.get('/profile', requireUser, async (req, res) => {
  try {
    const user = req.user;
    
    // Get user's resume statistics
    const totalResumes = await Resume.countDocuments({ 
      userId: user._id, 
      isActive: true 
    });
    
    const completedResumes = await Resume.countDocuments({ 
      userId: user._id, 
      isActive: true, 
      processingStatus: 'completed' 
    });
    
    const failedResumes = await Resume.countDocuments({ 
      userId: user._id, 
      isActive: true, 
      processingStatus: 'failed' 
    });
    
    const processingResumes = await Resume.countDocuments({ 
      userId: user._id, 
      isActive: true, 
      processingStatus: 'processing' 
    });

    // Get recent uploads (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentUploads = await Resume.countDocuments({
      userId: user._id,
      isActive: true,
      createdAt: { $gte: thirtyDaysAgo }
    });

    res.status(200).json({
      success: true,
      message: 'User profile retrieved successfully',
      data: {
        user,
        resumeStats: {
          totalResumes,
          completedResumes,
          failedResumes,
          processingResumes,
          recentUploads,
          successRate: totalResumes > 0 ? (completedResumes / totalResumes * 100).toFixed(2) : 0,
        },
        permissions: [
          'upload_resume',
          'view_own_resumes',
          'download_own_resumes',
          'delete_own_resumes',
          'reprocess_own_resumes',
        ],
      },
    });

  } catch (error) {
    console.error('Get user profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve user profile',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

/**
 * @route   GET /api/user/dashboard
 * @desc    Get user dashboard with quick overview
 * @access  Private (User only)
 */
router.get('/dashboard', requireUser, async (req, res) => {
  try {
    const userId = req.user._id;
    
    // Get recent resumes (last 5)
    const recentResumes = await Resume.find({
      userId,
      isActive: true,
    })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('originalFileName processingStatus createdAt parsedData.name parsedData.email');

    // Get basic stats
    const totalResumes = await Resume.countDocuments({ 
      userId, 
      isActive: true 
    });
    
    const completedResumes = await Resume.countDocuments({ 
      userId, 
      isActive: true, 
      processingStatus: 'completed' 
    });

    res.status(200).json({
      success: true,
      message: 'User dashboard data retrieved successfully',
      data: {
        recentResumes,
        quickStats: {
          totalResumes,
          completedResumes,
          pendingProcessing: totalResumes - completedResumes,
        },
        quickActions: {
          uploadResume: '/api/user/resumes/upload',
          viewAllResumes: '/api/user/resumes',
          viewProfile: '/api/user/profile',
        },
      },
    });

  } catch (error) {
    console.error('Get user dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve dashboard data',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

/**
 * @route   GET /api/user/settings
 * @desc    Get user settings and preferences
 * @access  Private (User only)
 */
router.get('/settings', requireUser, (req, res) => {
  try {
    const user = req.user;
    
    res.status(200).json({
      success: true,
      message: 'User settings retrieved successfully',
      data: {
        user: {
          username: user.username,
          createdAt: user.createdAt,
          lastLogin: user.lastLogin,
          isActive: user.isActive,
        },
        fileUploadSettings: {
          maxFileSize: process.env.MAX_FILE_SIZE || 5000000,
          allowedFileTypes: ['PDF', 'DOCX'],
          maxFilesPerUser: 'unlimited', // You can implement limits if needed
        },
        preferences: {
          // Add user preferences here if needed
          autoReprocess: false,
          emailNotifications: false,
        },
      },
    });

  } catch (error) {
    console.error('Get user settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve user settings',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

// Health check for user routes
/**
 * @route   GET /api/user/health
 * @desc    Check user service health
 * @access  Private (User only)
 */
router.get('/health', requireUser, (req, res) => {
  res.status(200).json({
    success: true,
    message: 'User service is running',
    timestamp: new Date().toISOString(),
    user: {
      id: req.user._id,
      username: req.user.username,
      role: req.user.role,
    },
  });
});

// Error handling for user routes
router.use((error, req, res, next) => {
  console.error('User route error:', error);
  
  // Handle multer errors (file upload errors)
  if (error.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      success: false,
      message: 'File too large. Maximum file size is 5MB.',
    });
  }
  
  if (error.message.includes('Invalid file type')) {
    return res.status(400).json({
      success: false,
      message: 'Invalid file type. Only PDF and DOCX files are allowed.',
    });
  }
  
  res.status(500).json({
    success: false,
    message: 'An error occurred in user operations',
    error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
  });
});

export default router;