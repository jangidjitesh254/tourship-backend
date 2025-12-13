const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { AppError } = require('./errorHandler');

// Protect routes - verify JWT token
const protect = async (req, res, next) => {
  try {
    let token;

    // Check for token in header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return next(new AppError('Not authorized to access this route', 401));
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Get user from token
      const user = await User.findById(decoded.id).select('-password');

      if (!user) {
        return next(new AppError('User no longer exists', 401));
      }

      if (!user.isActive) {
        return next(new AppError('Your account has been deactivated', 401));
      }

      req.user = user;
      next();
    } catch (err) {
      return next(new AppError('Not authorized to access this route', 401));
    }
  } catch (error) {
    next(error);
  }
};

// Role-based authorization
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(new AppError(`Role '${req.user.role}' is not authorized to access this route`, 403));
    }
    next();
  };
};

// Check if user is admin
const isAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return next(new AppError('Admin access required', 403));
  }
  next();
};

// Check if user is guide
const isGuide = (req, res, next) => {
  if (req.user.role !== 'guide') {
    return next(new AppError('Guide access required', 403));
  }
  next();
};

// Check if user is organiser
const isOrganiser = (req, res, next) => {
  if (req.user.role !== 'organiser') {
    return next(new AppError('Organiser access required', 403));
  }
  next();
};

// Check if user is tourist
const isTourist = (req, res, next) => {
  if (req.user.role !== 'tourist') {
    return next(new AppError('Tourist access required', 403));
  }
  next();
};

// Require verified status for guides and organisers
const requireVerified = (req, res, next) => {
  const { role } = req.user;

  if (role === 'guide') {
    if (req.user.guideProfile?.verificationStatus !== 'verified') {
      return next(new AppError('Your guide profile must be verified to perform this action', 403));
    }
  } else if (role === 'organiser') {
    if (req.user.organiserProfile?.verificationStatus !== 'verified') {
      return next(new AppError('Your organiser profile must be verified to perform this action', 403));
    }
  }

  next();
};

// Check admin permissions
const requirePermission = (...permissions) => {
  return (req, res, next) => {
    if (req.user.role !== 'admin') {
      return next(new AppError('Admin access required', 403));
    }

    // Super admin has all permissions
    if (req.user.adminProfile?.isSuperAdmin) {
      return next();
    }

    // Check if user has required permissions
    const userPermissions = req.user.adminProfile?.permissions || [];
    const hasPermission = permissions.some(permission => userPermissions.includes(permission));

    if (!hasPermission) {
      return next(new AppError('You do not have permission to perform this action', 403));
    }

    next();
  };
};

// Optional auth - doesn't fail if no token, but attaches user if present
const optionalAuth = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id).select('-password');
        if (user && user.isActive) {
          req.user = user;
        }
      } catch (err) {
        // Token invalid, but we continue without user
      }
    }

    next();
  } catch (error) {
    next();
  }
};

module.exports = {
  protect,
  authorize,
  isAdmin,
  isGuide,
  isOrganiser,
  isTourist,
  requireVerified,
  requirePermission,
  optionalAuth
};