import { validationResult } from 'express-validator';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import Resume from '../models/Resume.js';
import { parseResume, isValidResumeFile, getFileExtension } from '../utils/resumeParser.js';

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadsDir = path.join(__dirname, '../uploads');
    
    // Create uploads directory if it doesn't exist
    try {
      await fs.access(uploadsDir);
    } catch {
      await fs.mkdir(uploadsDir, { recursive: true });
    }
    
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    cb(null, `resume-${uniqueSuffix}${extension}`);
  },
});

// File filter to validate file types
const fileFilter = (req, file, cb) => {
  const allowedMimes = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];
  
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PDF and DOCX files are allowed.'), false);
  }
};

// Configure multer
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5000000, // 5MB default
  },
});

/**
 * Upload and parse resume (User only)
 * POST /api/user/resumes/upload
 */
export const uploadResume = [
  upload.single('resume'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No file uploaded',
        });
      }

      const userId = req.user._id;
      const { originalname, filename, path: filePath, size, mimetype } = req.file;

      // Create resume record with pending status
      const resumeData = {
        userId,
        originalFileName: originalname,
        fileName: filename,
        filePath,
        fileSize: size,
        mimeType: mimetype,
        processingStatus: 'processing',
        parsedData: {},
      };

      const resume = new Resume(resumeData);
      await resume.save();

      // Parse resume in background
      try {
        const parsedData = await parseResume(filePath, mimetype);
        
        // Update resume with parsed data
        resume.parsedData = parsedData;
        resume.processingStatus = 'completed';
        await resume.save();

        res.status(201).json({
          success: true,
          message: 'Resume uploaded and parsed successfully',
          data: {
            resume,
          },
        });

      } catch (parseError) {
        console.error('Resume parsing error:', parseError);
        
        // Update resume with error status
        resume.processingStatus = 'failed';
        resume.processingError = parseError.message;
        await resume.save();

        res.status(201).json({
          success: true,
          message: 'Resume uploaded but parsing failed',
          data: {
            resume,
          },
          warning: 'Resume parsing failed. The file was saved but data extraction was unsuccessful.',
        });
      }

    } catch (error) {
      console.error('Upload resume error:', error);
      
      // Clean up uploaded file if database operation fails
      if (req.file && req.file.path) {
        try {
          await fs.unlink(req.file.path);
        } catch (unlinkError) {
          console.error('Failed to clean up file:', unlinkError);
        }
      }

      res.status(500).json({
        success: false,
        message: 'Failed to upload resume',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }
];

/**
 * Get user's resumes (User only - own resumes)
 * GET /api/user/resumes
 */
export const getUserResumes = async (req, res) => {
  try {
    const userId = req.user._id;
    const { page = 1, limit = 10, status } = req.query;

    // Build query options
    const options = {
      limit: parseInt(limit),
      skip: (parseInt(page) - 1) * parseInt(limit),
    };

    // Add status filter if provided
    let resumes;
    if (status) {
      resumes = await Resume.find({ 
        userId, 
        isActive: true, 
        processingStatus: status 
      })
        .sort({ createdAt: -1 })
        .limit(options.limit)
        .skip(options.skip);
    } else {
      resumes = await Resume.getByUser(userId, options);
    }

    // Get total count
    const totalResumes = await Resume.countDocuments({ 
      userId, 
      isActive: true 
    });

    const totalPages = Math.ceil(totalResumes / parseInt(limit));

    res.status(200).json({
      success: true,
      message: 'Resumes retrieved successfully',
      data: {
        resumes,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalResumes,
          hasNextPage: parseInt(page) < totalPages,
          hasPrevPage: parseInt(page) > 1,
        },
      },
    });

  } catch (error) {
    console.error('Get user resumes error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve resumes',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * Get all resumes (Admin only)
 * GET /api/admin/resumes
 */
export const getAllResumes = async (req, res) => {
  try {
    const { page = 1, limit = 20, search, status } = req.query;

    // Build query options
    const options = {
      limit: parseInt(limit),
      skip: (parseInt(page) - 1) * parseInt(limit),
    };

    let resumes;

    if (search) {
      // Search in resume data
      resumes = await Resume.searchResumes(search, options);
    } else if (status) {
      // Filter by processing status
      resumes = await Resume.find({ 
        isActive: true, 
        processingStatus: status 
      })
        .sort({ createdAt: -1 })
        .limit(options.limit)
        .skip(options.skip)
        .populate('userId', 'username email role');
    } else {
      // Get all resumes
      resumes = await Resume.getAllResumes(options);
    }

    // Get total count
    const totalResumes = await Resume.countDocuments({ isActive: true });
    const totalPages = Math.ceil(totalResumes / parseInt(limit));

    res.status(200).json({
      success: true,
      message: 'All resumes retrieved successfully',
      data: {
        resumes,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalResumes,
          hasNextPage: parseInt(page) < totalPages,
          hasPrevPage: parseInt(page) > 1,
        },
      },
    });

  } catch (error) {
    console.error('Get all resumes error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve resumes',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * Get single resume by ID
 * GET /api/resumes/:resumeId
 */
export const getResumeById = async (req, res) => {
  try {
    const { resumeId } = req.params;
    const userId = req.user._id;
    const userRole = req.user.role;

    const resume = await Resume.findById(resumeId)
      .populate('userId', 'username email role');

    if (!resume || !resume.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Resume not found',
      });
    }

    // Check ownership (users can only view their own resumes, admins can view all)
    if (userRole !== 'admin' && resume.userId._id.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only view your own resumes.',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Resume retrieved successfully',
      data: {
        resume,
      },
    });

  } catch (error) {
    console.error('Get resume by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve resume',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * Download resume file
 * GET /api/resumes/:resumeId/download
 */
export const downloadResume = async (req, res) => {
  try {
    const { resumeId } = req.params;
    const userId = req.user._id;
    const userRole = req.user.role;

    const resume = await Resume.findById(resumeId);

    if (!resume || !resume.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Resume not found',
      });
    }

    // Check ownership
    if (userRole !== 'admin' && resume.userId.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    // Check if file exists
    try {
      await fs.access(resume.filePath);
    } catch {
      return res.status(404).json({
        success: false,
        message: 'Resume file not found on server',
      });
    }

    // Set appropriate headers
    res.setHeader('Content-Type', resume.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${resume.originalFileName}"`);

    // Send file
    res.sendFile(path.resolve(resume.filePath));

  } catch (error) {
    console.error('Download resume error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to download resume',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * Delete resume
 * DELETE /api/resumes/:resumeId
 */
export const deleteResume = async (req, res) => {
  try {
    const { resumeId } = req.params;
    const userId = req.user._id;
    const userRole = req.user.role;

    const resume = await Resume.findById(resumeId);

    if (!resume || !resume.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Resume not found',
      });
    }

    // Check ownership
    if (userRole !== 'admin' && resume.userId.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    // Soft delete
    await resume.softDelete();

    res.status(200).json({
      success: true,
      message: 'Resume deleted successfully',
    });

  } catch (error) {
    console.error('Delete resume error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete resume',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * Reprocess/reparse resume
 * POST /api/resumes/:resumeId/reprocess
 */
export const reprocessResume = async (req, res) => {
  try {
    const { resumeId } = req.params;
    const userId = req.user._id;
    const userRole = req.user.role;

    const resume = await Resume.findById(resumeId);

    if (!resume || !resume.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Resume not found',
      });
    }

    // Check ownership
    if (userRole !== 'admin' && resume.userId.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    // Update status to processing
    await resume.updateProcessingStatus('processing');

    try {
      // Reparse the resume
      const parsedData = await parseResume(resume.filePath, resume.mimeType);
      
      // Update resume with new parsed data
      resume.parsedData = parsedData;
      resume.processingStatus = 'completed';
      resume.processingError = null;
      await resume.save();

      res.status(200).json({
        success: true,
        message: 'Resume reprocessed successfully',
        data: {
          resume,
        },
      });

    } catch (parseError) {
      console.error('Resume reprocessing error:', parseError);
      
      await resume.updateProcessingStatus('failed', parseError.message);

      res.status(500).json({
        success: false,
        message: 'Failed to reprocess resume',
        error: parseError.message,
      });
    }

  } catch (error) {
    console.error('Reprocess resume error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reprocess resume',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * Get resume statistics (Admin only)
 * GET /api/admin/resumes/stats
 */
export const getResumeStats = async (req, res) => {
  try {
    // Get basic counts
    const totalResumes = await Resume.countDocuments({ isActive: true });
    const completedResumes = await Resume.countDocuments({ 
      isActive: true, 
      processingStatus: 'completed' 
    });
    const failedResumes = await Resume.countDocuments({ 
      isActive: true, 
      processingStatus: 'failed' 
    });
    const processingResumes = await Resume.countDocuments({ 
      isActive: true, 
      processingStatus: 'processing' 
    });

    // Get recent uploads (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentUploads = await Resume.countDocuments({
      isActive: true,
      createdAt: { $gte: thirtyDaysAgo }
    });

    // Get file type distribution
    const fileTypes = await Resume.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$mimeType', count: { $sum: 1 } } }
    ]);

    res.status(200).json({
      success: true,
      message: 'Resume statistics retrieved successfully',
      data: {
        totalResumes,
        completedResumes,
        failedResumes,
        processingResumes,
        recentUploads,
        fileTypes,
        statistics: {
          successRate: totalResumes > 0 ? (completedResumes / totalResumes * 100).toFixed(2) : 0,
          failureRate: totalResumes > 0 ? (failedResumes / totalResumes * 100).toFixed(2) : 0,
        },
      },
    });

  } catch (error) {
    console.error('Get resume stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve resume statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

export default {
  uploadResume,
  getUserResumes,
  getAllResumes,
  getResumeById,
  downloadResume,
  deleteResume,
  reprocessResume,
  getResumeStats,
};