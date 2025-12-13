const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Protect routes - Authentication required
const protect = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.'
      });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id);

      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'User not found. Token is invalid.'
        });
      }

      if (!user.isActive) {
        return res.status(401).json({
          success: false,
          message: 'Your account has been deactivated.'
        });
      }

      if (user.isBanned) {
        return res.status(403).json({
          success: false,
          message: 'Your account has been banned.',
          reason: user.banReason
        });
      }

      req.user = user;
      next();
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token. Please log in again.'
      });
    }
  } catch (error) {
    next(error);
  }
};

// Authorize specific roles
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Role '${req.user.role}' is not authorized to access this resource`
      });
    }
    next();
  };
};

// Check if guide/organiser is verified
const requireVerified = (req, res, next) => {
  const { role } = req.user;
  
  if (role === 'guide' && !req.user.guideProfile?.isVerified) {
    return res.status(403).json({
      success: false,
      message: 'Your guide profile needs to be verified to access this resource',
      verificationStatus: req.user.guideProfile?.verificationStatus
    });
  }
  
  if (role === 'organiser' && !req.user.organiserProfile?.isVerified) {
    return res.status(403).json({
      success: false,
      message: 'Your organiser profile needs to be verified to access this resource',
      verificationStatus: req.user.organiserProfile?.verificationStatus
    });
  }
  
  next();
};

// Check admin permissions
const requirePermission = (...permissions) => {
  return (req, res, next) => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    // Super admin has all permissions
    if (req.user.adminProfile?.permissions?.includes('full_access')) {
      return next();
    }

    const hasPermission = permissions.some(permission => 
      req.user.adminProfile?.permissions?.includes(permission)
    );

    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: `Required permission: ${permissions.join(' or ')}`
      });
    }

    next();
  };
};

// Optional authentication
const optionalAuth = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id);
        if (user && user.isActive && !user.isBanned) {
          req.user = user;
        }
      } catch (error) {
        // Token invalid, continue anyway
      }
    }

    next();
  } catch (error) {
    next(error);
  }
};

// Role-specific middleware shortcuts
const isTourist = authorize('tourist', 'admin');
const isGuide = authorize('guide', 'admin');
const isOrganiser = authorize('organiser', 'admin');
const isAdmin = authorize('admin');
const isGuideOrOrganiser = authorize('guide', 'organiser', 'admin');

module.exports = {
  protect,
  authorize,
  requireVerified,
  requirePermission,
  optionalAuth,
  isTourist,
  isGuide,
  isOrganiser,
  isAdmin,
  isGuideOrOrganiser
};
