const User = require('../models/User');
const { AppError } = require('../middleware/errorHandler');

// ===================
// USER MANAGEMENT
// ===================

// @desc    Get all users with advanced filters, search, sort
// @route   GET /api/admin/users
// @access  Private (Admin)
const getAllUsers = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const skip = (page - 1) * limit;

    // Build query
    const query = {};

    // Filter by role
    if (req.query.role && req.query.role !== 'all') {
      query.role = req.query.role;
    }

    // Filter by verification status (for guides/organisers)
    if (req.query.verificationStatus) {
      if (req.query.role === 'guide') {
        query['guideProfile.verificationStatus'] = req.query.verificationStatus;
      } else if (req.query.role === 'organiser') {
        query['organiserProfile.verificationStatus'] = req.query.verificationStatus;
      } else {
        query.$or = [
          { 'guideProfile.verificationStatus': req.query.verificationStatus },
          { 'organiserProfile.verificationStatus': req.query.verificationStatus }
        ];
      }
    }

    // Filter by active status
    if (req.query.isActive !== undefined && req.query.isActive !== '') {
      query.isActive = req.query.isActive === 'true';
    }

    // Filter by banned status
    if (req.query.isBanned !== undefined && req.query.isBanned !== '') {
      query.isBanned = req.query.isBanned === 'true';
    }

    // Filter by city
    if (req.query.city) {
      query['address.city'] = new RegExp(req.query.city, 'i');
    }

    // Filter by date range
    if (req.query.startDate || req.query.endDate) {
      query.createdAt = {};
      if (req.query.startDate) {
        query.createdAt.$gte = new Date(req.query.startDate);
      }
      if (req.query.endDate) {
        query.createdAt.$lte = new Date(req.query.endDate);
      }
    }

    // Search by name, email, phone
    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search, 'i');
      query.$or = [
        { firstName: searchRegex },
        { lastName: searchRegex },
        { email: searchRegex },
        { phone: searchRegex },
        { 'organiserProfile.companyName': searchRegex }
      ];
    }

    // Sort options
    let sortOption = { createdAt: -1 }; // Default: newest first
    if (req.query.sortBy) {
      const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;
      switch (req.query.sortBy) {
        case 'name':
          sortOption = { firstName: sortOrder };
          break;
        case 'email':
          sortOption = { email: sortOrder };
          break;
        case 'createdAt':
          sortOption = { createdAt: sortOrder };
          break;
        case 'lastLogin':
          sortOption = { lastLogin: sortOrder };
          break;
        default:
          sortOption = { createdAt: -1 };
      }
    }

    const users = await User.find(query)
      .select('-password -passwordResetToken -emailVerificationToken -phoneVerificationOTP')
      .skip(skip)
      .limit(limit)
      .sort(sortOption);

    const total = await User.countDocuments(query);

    // Format users for frontend
    const formattedUsers = users.map(user => ({
      id: user._id,
      email: user.email,
      phone: user.phone,
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: user.fullName,
      profilePicture: user.profilePicture,
      role: user.role,
      address: user.address,
      isActive: user.isActive,
      isBanned: user.isBanned,
      banReason: user.banReason,
      isEmailVerified: user.isEmailVerified,
      isPhoneVerified: user.isPhoneVerified,
      createdAt: user.createdAt,
      lastLogin: user.lastLogin,
      // Role-specific data
      ...(user.role === 'guide' && {
        guideProfile: {
          isVerified: user.guideProfile?.isVerified,
          verificationStatus: user.guideProfile?.verificationStatus,
          experienceYears: user.guideProfile?.experienceYears,
          averageRating: user.guideProfile?.averageRating,
          totalTours: user.guideProfile?.totalTours,
          operatingDistricts: user.guideProfile?.operatingDistricts
        }
      }),
      ...(user.role === 'organiser' && {
        organiserProfile: {
          companyName: user.organiserProfile?.companyName,
          companyType: user.organiserProfile?.companyType,
          isVerified: user.organiserProfile?.isVerified,
          verificationStatus: user.organiserProfile?.verificationStatus,
          averageRating: user.organiserProfile?.averageRating,
          totalBookings: user.organiserProfile?.totalBookings
        }
      }),
      ...(user.role === 'admin' && {
        adminProfile: {
          department: user.adminProfile?.department,
          permissions: user.adminProfile?.permissions
        }
      }),
      ...(user.role === 'tourist' && {
        touristProfile: {
          membershipTier: user.touristProfile?.membershipTier,
          loyaltyPoints: user.touristProfile?.loyaltyPoints
        }
      })
    }));

    res.status(200).json({
      success: true,
      data: {
        users: formattedUsers,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user by ID with full details
// @route   GET /api/admin/users/:id
// @access  Private (Admin)
const getUserById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password -passwordResetToken -emailVerificationToken -phoneVerificationOTP');

    if (!user) {
      return next(new AppError('User not found', 404));
    }

    // Build comprehensive user response
    const userDetails = {
      // Basic Info
      id: user._id,
      email: user.email,
      phone: user.phone,
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: user.fullName,
      profilePicture: user.profilePicture,
      dateOfBirth: user.dateOfBirth,
      gender: user.gender,
      
      // Address
      address: user.address,
      
      // Role & Status
      role: user.role,
      isActive: user.isActive,
      isBanned: user.isBanned,
      banReason: user.banReason,
      
      // Verification
      isEmailVerified: user.isEmailVerified,
      isPhoneVerified: user.isPhoneVerified,
      
      // Tourist Info
      nationality: user.nationality,
      touristType: user.touristType,
      passportNumber: user.passportNumber,
      preferredLanguage: user.preferredLanguage,
      
      // Preferences
      preferences: user.preferences,
      
      // Timestamps
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      lastLogin: user.lastLogin,
      
      // Role-specific profiles
      touristProfile: user.role === 'tourist' ? user.touristProfile : undefined,
      guideProfile: user.role === 'guide' ? user.guideProfile : undefined,
      organiserProfile: user.role === 'organiser' ? user.organiserProfile : undefined,
      adminProfile: user.role === 'admin' ? user.adminProfile : undefined
    };

    // Calculate account age
    const accountAge = Math.floor((Date.now() - new Date(user.createdAt)) / (1000 * 60 * 60 * 24));
    userDetails.accountAgeDays = accountAge;

    res.status(200).json({
      success: true,
      data: userDetails
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
    // Get current date info
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thisWeekStart = new Date(today.getTime() - (today.getDay() * 24 * 60 * 60 * 1000));
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    const stats = await User.aggregate([
      {
        $facet: {
          // Total counts
          totalUsers: [{ $count: 'count' }],
          activeUsers: [{ $match: { isActive: true, isBanned: false } }, { $count: 'count' }],
          bannedUsers: [{ $match: { isBanned: true } }, { $count: 'count' }],
          inactiveUsers: [{ $match: { isActive: false } }, { $count: 'count' }],
          
          // By role
          byRole: [
            { $group: { _id: '$role', count: { $sum: 1 } } }
          ],
          
          // Tourists by type
          touristsByType: [
            { $match: { role: 'tourist' } },
            { $group: { _id: '$touristType', count: { $sum: 1 } } }
          ],
          
          // Guide stats
          totalGuides: [{ $match: { role: 'guide' } }, { $count: 'count' }],
          verifiedGuides: [
            { $match: { role: 'guide', 'guideProfile.isVerified': true } },
            { $count: 'count' }
          ],
          pendingGuideVerifications: [
            { $match: { role: 'guide', 'guideProfile.verificationStatus': 'under_review' } },
            { $count: 'count' }
          ],
          
          // Organiser stats
          totalOrganisers: [{ $match: { role: 'organiser' } }, { $count: 'count' }],
          verifiedOrganisers: [
            { $match: { role: 'organiser', 'organiserProfile.isVerified': true } },
            { $count: 'count' }
          ],
          pendingOrganiserVerifications: [
            { $match: { role: 'organiser', 'organiserProfile.verificationStatus': 'under_review' } },
            { $count: 'count' }
          ],
          
          // Time-based registrations
          registrationsToday: [
            { $match: { createdAt: { $gte: today } } },
            { $count: 'count' }
          ],
          registrationsThisWeek: [
            { $match: { createdAt: { $gte: thisWeekStart } } },
            { $count: 'count' }
          ],
          registrationsThisMonth: [
            { $match: { createdAt: { $gte: thisMonthStart } } },
            { $count: 'count' }
          ],
          registrationsLastMonth: [
            { $match: { createdAt: { $gte: lastMonthStart, $lte: lastMonthEnd } } },
            { $count: 'count' }
          ],
          
          // Top cities
          topCities: [
            { $match: { 'address.city': { $ne: null, $exists: true } } },
            { $group: { _id: '$address.city', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 6 }
          ],
          
          // Recent users
          recentUsers: [
            { $sort: { createdAt: -1 } },
            { $limit: 5 },
            { $project: { 
              firstName: 1, 
              lastName: 1, 
              email: 1, 
              role: 1, 
              createdAt: 1,
              profilePicture: 1
            }}
          ],
          
          // Daily registrations for last 7 days
          dailyRegistrations: [
            { $match: { createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } } },
            {
              $group: {
                _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                count: { $sum: 1 }
              }
            },
            { $sort: { _id: 1 } }
          ],
          
          // Registrations by role for last 30 days
          registrationsByRole: [
            { $match: { createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } } },
            {
              $group: {
                _id: '$role',
                count: { $sum: 1 }
              }
            }
          ]
        }
      }
    ]);

    const result = stats[0];

    // Calculate growth percentage
    const thisMonthCount = result.registrationsThisMonth[0]?.count || 0;
    const lastMonthCount = result.registrationsLastMonth[0]?.count || 0;
    const growthPercentage = lastMonthCount > 0 
      ? (((thisMonthCount - lastMonthCount) / lastMonthCount) * 100).toFixed(1)
      : 0;

    res.status(200).json({
      success: true,
      data: {
        overview: {
          totalUsers: result.totalUsers[0]?.count || 0,
          activeUsers: result.activeUsers[0]?.count || 0,
          bannedUsers: result.bannedUsers[0]?.count || 0,
          inactiveUsers: result.inactiveUsers[0]?.count || 0
        },
        byRole: {
          tourists: result.byRole.find(r => r._id === 'tourist')?.count || 0,
          guides: result.byRole.find(r => r._id === 'guide')?.count || 0,
          organisers: result.byRole.find(r => r._id === 'organiser')?.count || 0,
          admins: result.byRole.find(r => r._id === 'admin')?.count || 0
        },
        tourists: {
          total: result.byRole.find(r => r._id === 'tourist')?.count || 0,
          domestic: result.touristsByType.find(t => t._id === 'domestic')?.count || 0,
          international: result.touristsByType.find(t => t._id === 'international')?.count || 0
        },
        guides: {
          total: result.totalGuides[0]?.count || 0,
          verified: result.verifiedGuides[0]?.count || 0,
          pendingVerification: result.pendingGuideVerifications[0]?.count || 0
        },
        organisers: {
          total: result.totalOrganisers[0]?.count || 0,
          verified: result.verifiedOrganisers[0]?.count || 0,
          pendingVerification: result.pendingOrganiserVerifications[0]?.count || 0
        },
        registrations: {
          today: result.registrationsToday[0]?.count || 0,
          thisWeek: result.registrationsThisWeek[0]?.count || 0,
          thisMonth: result.registrationsThisMonth[0]?.count || 0,
          lastMonth: result.registrationsLastMonth[0]?.count || 0,
          growthPercentage: parseFloat(growthPercentage)
        },
        topCities: result.topCities.map(city => ({
          name: city._id,
          count: city.count
        })),
        recentUsers: result.recentUsers.map(user => ({
          id: user._id,
          name: `${user.firstName} ${user.lastName || ''}`.trim(),
          email: user.email,
          role: user.role,
          createdAt: user.createdAt,
          profilePicture: user.profilePicture
        })),
        charts: {
          dailyRegistrations: result.dailyRegistrations.map(d => ({
            date: d._id,
            count: d.count
          })),
          registrationsByRole: result.registrationsByRole.map(r => ({
            role: r._id,
            count: r.count
          }))
        }
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

// @desc    Get user counts by various metrics
// @route   GET /api/admin/users/counts
// @access  Private (Admin)
const getUserCounts = async (req, res, next) => {
  try {
    const counts = await User.aggregate([
      {
        $facet: {
          total: [{ $count: 'count' }],
          byRole: [
            { $group: { _id: '$role', count: { $sum: 1 } } }
          ],
          byStatus: [
            {
              $group: {
                _id: {
                  isActive: '$isActive',
                  isBanned: '$isBanned'
                },
                count: { $sum: 1 }
              }
            }
          ],
          byTouristType: [
            { $match: { role: 'tourist' } },
            { $group: { _id: '$touristType', count: { $sum: 1 } } }
          ],
          byVerificationStatus: [
            {
              $match: { 
                role: { $in: ['guide', 'organiser'] }
              }
            },
            {
              $project: {
                role: 1,
                status: {
                  $cond: [
                    { $eq: ['$role', 'guide'] },
                    '$guideProfile.verificationStatus',
                    '$organiserProfile.verificationStatus'
                  ]
                }
              }
            },
            {
              $group: {
                _id: { role: '$role', status: '$status' },
                count: { $sum: 1 }
              }
            }
          ],
          byCity: [
            { $match: { 'address.city': { $ne: null, $exists: true } } },
            { $group: { _id: '$address.city', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 10 }
          ],
          byState: [
            { $match: { 'address.state': { $ne: null, $exists: true } } },
            { $group: { _id: '$address.state', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
          ]
        }
      }
    ]);

    const result = counts[0];

    res.status(200).json({
      success: true,
      data: {
        total: result.total[0]?.count || 0,
        byRole: result.byRole,
        byStatus: result.byStatus,
        byTouristType: result.byTouristType,
        byVerificationStatus: result.byVerificationStatus,
        byCity: result.byCity,
        byState: result.byState
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get recent activity (logins, registrations)
// @route   GET /api/admin/activity
// @access  Private (Admin)
const getRecentActivity = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 20;

    // Recent registrations
    const recentRegistrations = await User.find()
      .select('firstName lastName email role createdAt profilePicture')
      .sort({ createdAt: -1 })
      .limit(limit);

    // Recent logins
    const recentLogins = await User.find({ lastLogin: { $ne: null } })
      .select('firstName lastName email role lastLogin profilePicture')
      .sort({ lastLogin: -1 })
      .limit(limit);

    // Recently banned
    const recentlyBanned = await User.find({ isBanned: true })
      .select('firstName lastName email role banReason updatedAt')
      .sort({ updatedAt: -1 })
      .limit(5);

    res.status(200).json({
      success: true,
      data: {
        recentRegistrations: recentRegistrations.map(u => ({
          id: u._id,
          name: `${u.firstName} ${u.lastName || ''}`.trim(),
          email: u.email,
          role: u.role,
          timestamp: u.createdAt,
          profilePicture: u.profilePicture,
          type: 'registration'
        })),
        recentLogins: recentLogins.map(u => ({
          id: u._id,
          name: `${u.firstName} ${u.lastName || ''}`.trim(),
          email: u.email,
          role: u.role,
          timestamp: u.lastLogin,
          profilePicture: u.profilePicture,
          type: 'login'
        })),
        recentlyBanned: recentlyBanned.map(u => ({
          id: u._id,
          name: `${u.firstName} ${u.lastName || ''}`.trim(),
          email: u.email,
          role: u.role,
          reason: u.banReason,
          timestamp: u.updatedAt,
          type: 'ban'
        }))
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Search users
// @route   GET /api/admin/users/search
// @access  Private (Admin)
const searchUsers = async (req, res, next) => {
  try {
    const { q } = req.query;
    
    if (!q || q.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Search query must be at least 2 characters'
      });
    }

    const searchRegex = new RegExp(q, 'i');

    const users = await User.find({
      $or: [
        { firstName: searchRegex },
        { lastName: searchRegex },
        { email: searchRegex },
        { phone: searchRegex },
        { 'organiserProfile.companyName': searchRegex }
      ]
    })
    .select('firstName lastName email phone role profilePicture isActive isBanned createdAt')
    .limit(20)
    .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: users.map(u => ({
        id: u._id,
        name: `${u.firstName} ${u.lastName || ''}`.trim(),
        email: u.email,
        phone: u.phone,
        role: u.role,
        profilePicture: u.profilePicture,
        isActive: u.isActive,
        isBanned: u.isBanned,
        createdAt: u.createdAt
      })),
      count: users.length
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Export users data
// @route   GET /api/admin/users/export
// @access  Private (Admin)
const exportUsers = async (req, res, next) => {
  try {
    const { role, format = 'json' } = req.query;

    const query = {};
    if (role && role !== 'all') {
      query.role = role;
    }

    const users = await User.find(query)
      .select('-password -passwordResetToken -emailVerificationToken -phoneVerificationOTP')
      .sort({ createdAt: -1 });

    const exportData = users.map(u => ({
      id: u._id,
      email: u.email,
      phone: u.phone,
      firstName: u.firstName,
      lastName: u.lastName,
      role: u.role,
      city: u.address?.city,
      state: u.address?.state,
      isActive: u.isActive,
      isBanned: u.isBanned,
      createdAt: u.createdAt,
      lastLogin: u.lastLogin
    }));

    if (format === 'csv') {
      // Generate CSV
      const headers = Object.keys(exportData[0] || {}).join(',');
      const rows = exportData.map(row => 
        Object.values(row).map(v => `"${v || ''}"`).join(',')
      ).join('\n');
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=users_export.csv');
      return res.send(`${headers}\n${rows}`);
    }

    res.status(200).json({
      success: true,
      data: exportData,
      count: exportData.length,
      exportedAt: new Date().toISOString()
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
  getUserCounts,
  getRecentActivity,
  searchUsers,
  exportUsers,
  createAdmin
};