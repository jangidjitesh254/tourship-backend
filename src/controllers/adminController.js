const User = require('../models/User');
const { AppError } = require('../middleware/errorHandler');

// ===================
// USER MANAGEMENT
// ===================

// @desc    Get all users with filters
// @route   GET /api/admin/users
// @access  Private (Admin)
const getAllUsers = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const skip = (page - 1) * limit;

    const query = {};

    // Filter by role
    if (req.query.role) {
      query.role = req.query.role;
    }

    // Filter by verification status (for guides/organisers)
    if (req.query.verificationStatus) {
      query.$or = [
        { 'guideProfile.verificationStatus': req.query.verificationStatus },
        { 'organiserProfile.verificationStatus': req.query.verificationStatus }
      ];
    }

    // Filter by active status
    if (req.query.isActive !== undefined) {
      query.isActive = req.query.isActive === 'true';
    }

    // Filter by banned status
    if (req.query.isBanned !== undefined) {
      query.isBanned = req.query.isBanned === 'true';
    }

    // Search
    if (req.query.search) {
      query.$or = [
        { firstName: new RegExp(req.query.search, 'i') },
        { lastName: new RegExp(req.query.search, 'i') },
        { email: new RegExp(req.query.search, 'i') },
        { phone: new RegExp(req.query.search, 'i') }
      ];
    }

    const users = await User.find(query)
      .select('-password -passwordResetToken -emailVerificationToken')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const total = await User.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        users,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user by ID
// @route   GET /api/admin/users/:id
// @access  Private (Admin)
const getUserById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password -passwordResetToken -emailVerificationToken');

    if (!user) {
      return next(new AppError('User not found', 404));
    }

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user
// @route   PUT /api/admin/users/:id
// @access  Private (Admin)
const updateUser = async (req, res, next) => {
  try {
    const { role, isActive, isBanned, banReason } = req.body;

    const updates = {};
    if (role) updates.role = role;
    if (isActive !== undefined) updates.isActive = isActive;
    if (isBanned !== undefined) {
      updates.isBanned = isBanned;
      updates.banReason = isBanned ? banReason : null;
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    );

    if (!user) {
      return next(new AppError('User not found', 404));
    }

    res.status(200).json({
      success: true,
      message: 'User updated successfully',
      data: user
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete user
// @route   DELETE /api/admin/users/:id
// @access  Private (Admin)
const deleteUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return next(new AppError('User not found', 404));
    }

    // Prevent deleting self
    if (user._id.toString() === req.user.id) {
      return next(new AppError('You cannot delete your own account', 400));
    }

    // Soft delete
    user.isActive = false;
    user.email = `deleted_${Date.now()}_${user.email}`;
    await user.save({ validateBeforeSave: false });

    res.status(200).json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Ban/Unban user
// @route   PUT /api/admin/users/:id/ban
// @access  Private (Admin)
const banUser = async (req, res, next) => {
  try {
    const { isBanned, reason } = req.body;
    
    const user = await User.findById(req.params.id);

    if (!user) {
      return next(new AppError('User not found', 404));
    }

    if (user._id.toString() === req.user.id) {
      return next(new AppError('You cannot ban yourself', 400));
    }

    user.isBanned = isBanned;
    user.banReason = isBanned ? reason : null;
    await user.save({ validateBeforeSave: false });

    res.status(200).json({
      success: true,
      message: isBanned ? 'User banned successfully' : 'User unbanned successfully',
      data: {
        isBanned: user.isBanned,
        banReason: user.banReason
      }
    });
  } catch (error) {
    next(error);
  }
};

// ===================
// VERIFICATION MANAGEMENT
// ===================

// @desc    Get pending verifications
// @route   GET /api/admin/verifications/pending
// @access  Private (Admin)
const getPendingVerifications = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const skip = (page - 1) * limit;

    const type = req.query.type; // 'guide', 'organiser', or 'all'

    let query = {
      $or: []
    };

    if (type === 'guide' || type === 'all' || !type) {
      query.$or.push({
        role: 'guide',
        'guideProfile.verificationStatus': 'under_review'
      });
    }

    if (type === 'organiser' || type === 'all' || !type) {
      query.$or.push({
        role: 'organiser',
        'organiserProfile.verificationStatus': 'under_review'
      });
    }

    const users = await User.find(query)
      .select('firstName lastName email phone role guideProfile organiserProfile createdAt')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: 1 }); // Oldest first

    const total = await User.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        verifications: users,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Verify guide
// @route   PUT /api/admin/verify/guide/:id
// @access  Private (Admin)
const verifyGuide = async (req, res, next) => {
  try {
    const { action, rejectionReason } = req.body; // action: 'approve' or 'reject'

    const guide = await User.findOne({ _id: req.params.id, role: 'guide' });

    if (!guide) {
      return next(new AppError('Guide not found', 404));
    }

    if (guide.guideProfile.verificationStatus !== 'under_review') {
      return next(new AppError('This guide is not pending verification', 400));
    }

    if (action === 'approve') {
      guide.guideProfile.isVerified = true;
      guide.guideProfile.verificationStatus = 'approved';
      guide.guideProfile.verifiedAt = Date.now();
      guide.guideProfile.verifiedBy = req.user.id;
      guide.guideProfile.rejectionReason = null;
    } else if (action === 'reject') {
      guide.guideProfile.isVerified = false;
      guide.guideProfile.verificationStatus = 'rejected';
      guide.guideProfile.rejectionReason = rejectionReason;
    } else {
      return next(new AppError('Invalid action. Use "approve" or "reject"', 400));
    }

    await guide.save();

    res.status(200).json({
      success: true,
      message: action === 'approve' ? 'Guide verified successfully' : 'Guide verification rejected',
      data: {
        verificationStatus: guide.guideProfile.verificationStatus,
        isVerified: guide.guideProfile.isVerified
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Verify organiser
// @route   PUT /api/admin/verify/organiser/:id
// @access  Private (Admin)
const verifyOrganiser = async (req, res, next) => {
  try {
    const { action, rejectionReason } = req.body;

    const organiser = await User.findOne({ _id: req.params.id, role: 'organiser' });

    if (!organiser) {
      return next(new AppError('Organiser not found', 404));
    }

    if (organiser.organiserProfile.verificationStatus !== 'under_review') {
      return next(new AppError('This organiser is not pending verification', 400));
    }

    if (action === 'approve') {
      organiser.organiserProfile.isVerified = true;
      organiser.organiserProfile.verificationStatus = 'approved';
      organiser.organiserProfile.verifiedAt = Date.now();
      organiser.organiserProfile.verifiedBy = req.user.id;
      organiser.organiserProfile.rejectionReason = null;
    } else if (action === 'reject') {
      organiser.organiserProfile.isVerified = false;
      organiser.organiserProfile.verificationStatus = 'rejected';
      organiser.organiserProfile.rejectionReason = rejectionReason;
    } else {
      return next(new AppError('Invalid action. Use "approve" or "reject"', 400));
    }

    await organiser.save();

    res.status(200).json({
      success: true,
      message: action === 'approve' ? 'Organiser verified successfully' : 'Organiser verification rejected',
      data: {
        verificationStatus: organiser.organiserProfile.verificationStatus,
        isVerified: organiser.organiserProfile.isVerified
      }
    });
  } catch (error) {
    next(error);
  }
};

// ===================
// DASHBOARD & ANALYTICS
// ===================

// @desc    Get admin dashboard stats
// @route   GET /api/admin/dashboard
// @access  Private (Admin)
const getDashboardStats = async (req, res, next) => {
  try {
    const stats = await User.aggregate([
      {
        $facet: {
          totalUsers: [{ $count: 'count' }],
          activeUsers: [{ $match: { isActive: true } }, { $count: 'count' }],
          byRole: [
            { $group: { _id: '$role', count: { $sum: 1 } } }
          ],
          pendingGuideVerifications: [
            { $match: { role: 'guide', 'guideProfile.verificationStatus': 'under_review' } },
            { $count: 'count' }
          ],
          pendingOrganiserVerifications: [
            { $match: { role: 'organiser', 'organiserProfile.verificationStatus': 'under_review' } },
            { $count: 'count' }
          ],
          verifiedGuides: [
            { $match: { role: 'guide', 'guideProfile.isVerified': true } },
            { $count: 'count' }
          ],
          verifiedOrganisers: [
            { $match: { role: 'organiser', 'organiserProfile.isVerified': true } },
            { $count: 'count' }
          ],
          bannedUsers: [
            { $match: { isBanned: true } },
            { $count: 'count' }
          ],
          recentRegistrations: [
            { $match: { createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } } },
            { $count: 'count' }
          ],
          topCities: [
            { $group: { _id: '$address.city', count: { $sum: 1 } } },
            { $match: { _id: { $ne: null } } },
            { $sort: { count: -1 } },
            { $limit: 5 }
          ]
        }
      }
    ]);

    const result = stats[0];

    res.status(200).json({
      success: true,
      data: {
        users: {
          total: result.totalUsers[0]?.count || 0,
          active: result.activeUsers[0]?.count || 0,
          banned: result.bannedUsers[0]?.count || 0,
          recentRegistrations: result.recentRegistrations[0]?.count || 0
        },
        byRole: result.byRole.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        verifications: {
          pendingGuides: result.pendingGuideVerifications[0]?.count || 0,
          pendingOrganisers: result.pendingOrganiserVerifications[0]?.count || 0,
          verifiedGuides: result.verifiedGuides[0]?.count || 0,
          verifiedOrganisers: result.verifiedOrganisers[0]?.count || 0
        },
        topCities: result.topCities
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get registration analytics
// @route   GET /api/admin/analytics/registrations
// @access  Private (Admin)
const getRegistrationAnalytics = async (req, res, next) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const analytics = await User.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            role: '$role'
          },
          count: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: '$_id.date',
          roles: {
            $push: {
              role: '$_id.role',
              count: '$count'
            }
          },
          total: { $sum: '$count' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.status(200).json({
      success: true,
      data: analytics
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create admin user
// @route   POST /api/admin/create-admin
// @access  Private (Super Admin)
const createAdmin = async (req, res, next) => {
  try {
    const { email, password, phone, firstName, lastName, department, permissions } = req.body;

    // Check if requester has full_access
    if (!req.user.adminProfile?.permissions?.includes('full_access')) {
      return next(new AppError('Only super admins can create new admins', 403));
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return next(new AppError('Email already registered', 400));
    }

    const admin = await User.create({
      email,
      password,
      phone,
      firstName,
      lastName,
      role: 'admin',
      adminProfile: {
        department,
        permissions: permissions || ['view_analytics']
      }
    });

    admin.password = undefined;

    res.status(201).json({
      success: true,
      message: 'Admin created successfully',
      data: admin
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  banUser,
  getPendingVerifications,
  verifyGuide,
  verifyOrganiser,
  getDashboardStats,
  getRegistrationAnalytics,
  createAdmin
};
