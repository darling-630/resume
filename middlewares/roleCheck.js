/**
 * Role-based Access Control Middleware
 * Checks if authenticated user has required role(s) to access a route
 */

/**
 * Check if user has required role
 * @param {string|Array<string>} allowedRoles - Single role or array of allowed roles
 * @returns {Function} Express middleware function
 */
export const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    try {
      // Ensure user is authenticated first
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
      }
      
      // Convert single role to array for consistent handling
      const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
      
      // Check if user's role is in the allowed roles
      if (!roles.includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          message: `Access denied. Required role(s): ${roles.join(', ')}. Your role: ${req.user.role}`,
        });
      }
      
      next();
      
    } catch (error) {
      console.error('Role check error:', error);
      return res.status(500).json({
        success: false,
        message: 'Role verification failed',
      });
    }
  };
};

/**
 * Require admin role specifically
 */
export const requireAdmin = requireRole('admin');

/**
 * Require user role specifically
 */
export const requireUser = requireRole('user');

/**
 * Allow both admin and user roles
 */
export const requireAdminOrUser = requireRole(['admin', 'user']);

/**
 * Check if current user is admin
 * @param {object} user - User object from request
 * @returns {boolean} True if user is admin
 */
export const isAdmin = (user) => {
  return user && user.role === 'admin';
};

/**
 * Check if current user is regular user
 * @param {object} user - User object from request
 * @returns {boolean} True if user is regular user
 */
export const isUser = (user) => {
  return user && user.role === 'user';
};

/**
 * Check if current user owns the resource or is admin
 * @param {string} resourceUserId - ID of user who owns the resource
 * @returns {Function} Express middleware function
 */
export const requireOwnershipOrAdmin = (resourceUserId) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
      }
      
      // Allow if user is admin
      if (req.user.role === 'admin') {
        return next();
      }
      
      // Allow if user owns the resource
      if (req.user._id.toString() === resourceUserId.toString()) {
        return next();
      }
      
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only access your own resources.',
      });
      
    } catch (error) {
      console.error('Ownership check error:', error);
      return res.status(500).json({
        success: false,
        message: 'Access verification failed',
      });
    }
  };
};

/**
 * Dynamic ownership check middleware
 * Checks ownership based on parameter in the route
 * @param {string} paramName - Name of route parameter containing resource user ID
 * @returns {Function} Express middleware function
 */
export const requireOwnershipOrAdminParam = (paramName = 'userId') => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
      }
      
      const resourceUserId = req.params[paramName];
      
      if (!resourceUserId) {
        return res.status(400).json({
          success: false,
          message: `Missing ${paramName} parameter`,
        });
      }
      
      // Allow if user is admin
      if (req.user.role === 'admin') {
        return next();
      }
      
      // Allow if user owns the resource
      if (req.user._id.toString() === resourceUserId.toString()) {
        return next();
      }
      
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only access your own resources.',
      });
      
    } catch (error) {
      console.error('Dynamic ownership check error:', error);
      return res.status(500).json({
        success: false,
        message: 'Access verification failed',
      });
    }
  };
};

/**
 * Check if user can create other users (admin only)
 */
export const canCreateUsers = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Only administrators can create user accounts',
    });
  }
  next();
};

/**
 * Check if user can view all resumes (admin only)
 */
export const canViewAllResumes = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Only administrators can view all resumes',
    });
  }
  next();
};

/**
 * Middleware to add user role info to response headers
 */
export const addRoleHeaders = (req, res, next) => {
  if (req.user) {
    res.set('X-User-Role', req.user.role);
    res.set('X-User-ID', req.user._id.toString());
  }
  next();
};

/**
 * Check multiple conditions with custom logic
 * @param {Function} checkFunction - Custom function that returns boolean
 * @param {string} errorMessage - Error message if check fails
 * @returns {Function} Express middleware function
 */
export const requireCustomCondition = (checkFunction, errorMessage = 'Access denied') => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
      }
      
      if (!checkFunction(req.user, req)) {
        return res.status(403).json({
          success: false,
          message: errorMessage,
        });
      }
      
      next();
      
    } catch (error) {
      console.error('Custom condition check error:', error);
      return res.status(500).json({
        success: false,
        message: 'Access verification failed',
      });
    }
  };
};

export default {
  requireRole,
  requireAdmin,
  requireUser,
  requireAdminOrUser,
  isAdmin,
  isUser,
  requireOwnershipOrAdmin,
  requireOwnershipOrAdminParam,
  canCreateUsers,
  canViewAllResumes,
  addRoleHeaders,
  requireCustomCondition,
};