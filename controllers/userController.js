import { validationResult } from 'express-validator';
import User from '../models/User.js';
import Resume from '../models/Resume.js';
import { sendUserCreationNotification } from '../utils/emailSender.js';

/**
 * Create a new user account (Admin only)
 * POST /api/admin/users
 */
export const createUser = async (req, res) => {
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
    const adminId = req.user._id;

    // Check if username already exists
    const existingUser = await User.findOne({ username: username.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'Username already exists',
      });
    }

    // Create new user
    const userData = {
      username: username.toLowerCase(),
      password,
      role: 'user',
      createdBy: adminId,
      isActive: true,
    };

    const newUser = await User.createUserByAdmin(userData, adminId);

    // Send notification email to admin (optional)
    try {
      if (process.env.ADMIN_EMAIL) {
        await sendUserCreationNotification(process.env.ADMIN_EMAIL, newUser);
      }
    } catch (emailError) {
      console.error('Failed to send user creation notification:', emailError);
      // Don't fail the request if email fails
    }

    res.status(201).json({
      success: true,
      message: 'User account created successfully',
      data: {
        user: newUser,
      },
    });

  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create user account',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * Get all users (Admin only)
 * GET /api/admin/users
 */
export const getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 20, search, status } = req.query;
    
    // Build query
    const query = { role: 'user' };
    
    if (search) {
      query.username = { $regex: search, $options: 'i' };
    }
    
    if (status === 'active') {
      query.isActive = true;
    } else if (status === 'inactive') {
      query.isActive = false;
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Get users with pagination
    const users = await User.find(query)
      .select('-password')
      .populate('createdBy', 'username email')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip);

    // Get total count for pagination
    const totalUsers = await User.countDocuments(query);
    const totalPages = Math.ceil(totalUsers / parseInt(limit));

    res.status(200).json({
      success: true,
      message: 'Users retrieved successfully',
      data: {
        users,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalUsers,
          hasNextPage: parseInt(page) < totalPages,
          hasPrevPage: parseInt(page) > 1,
        },
      },
    });

  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve users',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * Get user by ID (Admin only)
 * GET /api/admin/users/:userId
 */
export const getUserById = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId)
      .select('-password')
      .populate('createdBy', 'username email');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Get user's resume count
    const resumeCount = await Resume.countDocuments({ 
      userId: userId, 
      isActive: true 
    });

    res.status(200).json({
      success: true,
      message: 'User retrieved successfully',
      data: {
        user,
        resumeCount,
      },
    });

  } catch (error) {
    console.error('Get user by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve user',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * Update user account (Admin only)
 * PUT /api/admin/users/:userId
 */
export const updateUser = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
    }

    const { userId } = req.params;
    const { username, password, isActive } = req.body;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    if (user.role !== 'user') {
      return res.status(400).json({
        success: false,
        message: 'Cannot update admin users',
      });
    }

    // Check if new username already exists (if changing username)
    if (username && username.toLowerCase() !== user.username) {
      const existingUser = await User.findOne({ 
        username: username.toLowerCase(),
        _id: { $ne: userId }
      });
      
      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: 'Username already exists',
        });
      }
      
      user.username = username.toLowerCase();
    }

    // Update password if provided
    if (password) {
      user.password = password; // Will be hashed by pre-save middleware
    }

    // Update active status if provided
    if (typeof isActive === 'boolean') {
      user.isActive = isActive;
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: 'User updated successfully',
      data: {
        user,
      },
    });

  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update user',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * Delete/deactivate user account (Admin only)
 * DELETE /api/admin/users/:userId
 */
export const deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { permanent = false } = req.query;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    if (user.role !== 'user') {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete admin users',
      });
    }

    if (permanent === 'true') {
      // Permanent deletion - also delete user's resumes
      await Resume.deleteMany({ userId: userId });
      await user.deleteOne();
      
      res.status(200).json({
        success: true,
        message: 'User and all associated data permanently deleted',
      });
    } else {
      // Soft delete - just deactivate
      user.isActive = false;
      await user.save();
      
      res.status(200).json({
        success: true,
        message: 'User account deactivated successfully',
        data: {
          user,
        },
      });
    }

  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete user',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * Get user statistics (Admin only)
 * GET /api/admin/users/stats
 */
export const getUserStats = async (req, res) => {
  try {
    // Get user counts
    const totalUsers = await User.countDocuments({ role: 'user' });
    const activeUsers = await User.countDocuments({ role: 'user', isActive: true });
    const inactiveUsers = totalUsers - activeUsers;

    // Get recent user registrations (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentUsers = await User.countDocuments({
      role: 'user',
      createdAt: { $gte: thirtyDaysAgo }
    });

    // Get users with resume uploads
    const usersWithResumes = await Resume.distinct('userId');
    const usersWithResumeCount = usersWithResumes.length;

    // Get last login statistics
    const usersWithRecentLogin = await User.countDocuments({
      role: 'user',
      lastLogin: { $gte: thirtyDaysAgo }
    });

    res.status(200).json({
      success: true,
      message: 'User statistics retrieved successfully',
      data: {
        totalUsers,
        activeUsers,
        inactiveUsers,
        recentUsers,
        usersWithResumeCount,
        usersWithRecentLogin,
        statistics: {
          userActivityRate: totalUsers > 0 ? (usersWithRecentLogin / totalUsers * 100).toFixed(2) : 0,
          resumeUploadRate: totalUsers > 0 ? (usersWithResumeCount / totalUsers * 100).toFixed(2) : 0,
        },
      },
    });

  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve user statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * Reset user password (Admin only)
 * POST /api/admin/users/:userId/reset-password
 */
export const resetUserPassword = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
    }

    const { userId } = req.params;
    const { newPassword } = req.body;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    if (user.role !== 'user') {
      return res.status(400).json({
        success: false,
        message: 'Cannot reset admin user password',
      });
    }

    // Update password
    user.password = newPassword; // Will be hashed by pre-save middleware
    await user.save();

    res.status(200).json({
      success: true,
      message: 'User password reset successfully',
    });

  } catch (error) {
    console.error('Reset user password error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reset user password',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

export default {
  createUser,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  getUserStats,
  resetUserPassword,
};