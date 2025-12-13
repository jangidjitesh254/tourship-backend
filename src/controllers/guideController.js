const User = require('../models/User');
const Trip = require('../models/Trip');
const { AppError } = require('../middleware/errorHandler');

// @desc    Get guide profile
// @route   GET /api/guide/profile
// @access  Private (Guide)
const getGuideProfile = async (req, res, next) => {
  try {
    const guide = await User.findById(req.user.id);
    
    res.status(200).json({
      success: true,
      data: {
        ...guide.toObject(),
        guideProfile: guide.guideProfile
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update guide profile
// @route   PUT /api/guide/profile
// @access  Private (Guide)
const updateGuideProfile = async (req, res, next) => {
  try {
    const allowedFields = [
      'licenseNumber', 'experienceYears', 'specializations', 'languagesSpoken',
      'operatingDistricts', 'hourlyRate', 'dailyRate', 'availability',
      'bio', 'tagline'
    ];

    const updates = {};
    Object.keys(req.body).forEach(key => {
      if (allowedFields.includes(key)) {
        updates[`guideProfile.${key}`] = req.body[key];
      }
    });

    // Also allow updating basic profile fields
    const basicFields = ['firstName', 'lastName', 'phone', 'dateOfBirth', 'gender', 'address', 'profilePicture'];
    basicFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    const guide = await User.findByIdAndUpdate(
      req.user.id,
      updates,
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: 'Guide profile updated successfully',
      data: guide
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Submit for verification
// @route   POST /api/guide/submit-verification
// @access  Private (Guide)
const submitForVerification = async (req, res, next) => {
  try {
    const guide = await User.findById(req.user.id);
    
    // Check if already verified or under review
    if (guide.guideProfile.isVerified) {
      return next(new AppError('Your profile is already verified', 400));
    }
    
    if (guide.guideProfile.verificationStatus === 'under_review') {
      return next(new AppError('Your profile is already under review', 400));
    }

    // Validate required fields
    const { guideProfile } = guide;
    if (!guideProfile.licenseNumber) {
      return next(new AppError('License number is required for verification', 400));
    }
    if (!guideProfile.languagesSpoken || guideProfile.languagesSpoken.length === 0) {
      return next(new AppError('At least one language is required', 400));
    }
    if (!guideProfile.operatingDistricts || guideProfile.operatingDistricts.length === 0) {
      return next(new AppError('At least one operating district is required', 400));
    }

    guide.guideProfile.verificationStatus = 'under_review';
    await guide.save();

    res.status(200).json({
      success: true,
      message: 'Profile submitted for verification. You will be notified once reviewed.',
      data: {
        verificationStatus: guide.guideProfile.verificationStatus
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all guides (public)
// @route   GET /api/guide/all
// @access  Public
const getAllGuides = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    // Build query - only verified guides
    const query = {
      role: 'guide',
      isActive: true,
      'guideProfile.isVerified': true
    };

    // Filter by district
    if (req.query.district) {
      query['guideProfile.operatingDistricts'] = req.query.district;
    }

    // Filter by specialization
    if (req.query.specialization) {
      query['guideProfile.specializations'] = req.query.specialization;
    }

    // Filter by language
    if (req.query.language) {
      query['guideProfile.languagesSpoken.language'] = req.query.language;
    }

    // Filter by max hourly rate
    if (req.query.maxRate) {
      query['guideProfile.hourlyRate'] = { $lte: parseInt(req.query.maxRate) };
    }

    // Filter by minimum rating
    if (req.query.minRating) {
      query['guideProfile.averageRating'] = { $gte: parseFloat(req.query.minRating) };
    }

    const guides = await User.find(query)
      .select('firstName lastName profilePicture guideProfile address')
      .skip(skip)
      .limit(limit)
      .sort({ 'guideProfile.averageRating': -1 });

    const total = await User.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        guides,
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

// @desc    Get guide by ID (public)
// @route   GET /api/guide/:id
// @access  Public
const getGuideById = async (req, res, next) => {
  try {
    const guide = await User.findOne({
      _id: req.params.id,
      role: 'guide',
      isActive: true
    }).select('-password -passwordResetToken -emailVerificationToken -phoneVerificationOTP');

    if (!guide) {
      return next(new AppError('Guide not found', 404));
    }

    res.status(200).json({
      success: true,
      data: guide
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update availability
// @route   PUT /api/guide/availability
// @access  Private (Guide)
const updateAvailability = async (req, res, next) => {
  try {
    const { availability } = req.body;

    const guide = await User.findByIdAndUpdate(
      req.user.id,
      { 'guideProfile.availability': availability },
      { new: true }
    );

    res.status(200).json({
      success: true,
      message: 'Availability updated successfully',
      data: guide.guideProfile.availability
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get guide dashboard stats
// @route   GET /api/guide/dashboard
// @access  Private (Guide)
const getGuideDashboard = async (req, res, next) => {
  try {
    const guide = await User.findById(req.user.id);
    
    res.status(200).json({
      success: true,
      data: {
        profile: {
          name: guide.fullName,
          isVerified: guide.guideProfile.isVerified,
          verificationStatus: guide.guideProfile.verificationStatus,
          profilePicture: guide.profilePicture
        },
        stats: {
          totalTours: guide.guideProfile.totalTours || 0,
          completedTours: guide.guideProfile.completedTours || 0,
          averageRating: guide.guideProfile.averageRating || 0,
          totalReviews: guide.guideProfile.totalReviews || 0
        },
        pricing: {
          hourlyRate: guide.guideProfile.hourlyRate,
          dailyRate: guide.guideProfile.dailyRate,
          currency: guide.guideProfile.currency
        },
        operatingDistricts: guide.guideProfile.operatingDistricts,
        specializations: guide.guideProfile.specializations
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get trips assigned to guide
// @route   GET /api/guide/my-trips
// @access  Private (Guide)
const getMyAssignedTrips = async (req, res, next) => {
  try {
    const { status } = req.query;
    
    const query = { assignedGuide: req.user.id };
    
    if (status) {
      query.guideStatus = status;
    }

    const trips = await Trip.find(query)
      .populate('organiser', 'firstName lastName organiserProfile.companyName')
      .sort({ startDate: 1 });

    const formattedTrips = trips.map(trip => ({
      id: trip._id,
      title: trip.title,
      organiser: {
        id: trip.organiser._id,
        name: `${trip.organiser.firstName} ${trip.organiser.lastName}`,
        company: trip.organiser.organiserProfile?.companyName
      },
      destinations: trip.destinations.map(d => d.name),
      duration: trip.duration,
      startDate: trip.startDate,
      endDate: trip.endDate,
      guideStatus: trip.guideStatus,
      assignedAt: trip.guideAssignedAt,
      totalBookings: trip.bookings?.length || 0,
      status: trip.status
    }));

    res.status(200).json({
      success: true,
      data: formattedTrips,
      count: formattedTrips.length
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Accept or reject trip assignment
// @route   PUT /api/guide/trips/:id/respond
// @access  Private (Guide)
const respondToAssignment = async (req, res, next) => {
  try {
    const { action, reason } = req.body; // action: 'accept' or 'reject'

    if (!['accept', 'reject'].includes(action)) {
      return next(new AppError('Invalid action. Use "accept" or "reject"', 400));
    }

    const trip = await Trip.findOne({
      _id: req.params.id,
      assignedGuide: req.user.id,
      guideStatus: 'pending'
    });

    if (!trip) {
      return next(new AppError('Trip assignment not found or already responded', 404));
    }

    if (action === 'accept') {
      trip.guideStatus = 'accepted';
      
      // Update guide's total tours count
      await User.findByIdAndUpdate(req.user.id, {
        $inc: { 'guideProfile.totalTours': 1 }
      });
    } else {
      trip.guideStatus = 'rejected';
      trip.guideRejectionReason = reason || 'No reason provided';
    }

    await trip.save();

    res.status(200).json({
      success: true,
      message: action === 'accept' ? 'Trip assignment accepted' : 'Trip assignment rejected',
      data: {
        tripId: trip._id,
        guideStatus: trip.guideStatus
      }
    });
  } catch (error) {
    next(error);
  }
};

// Export all functions at the END
module.exports = {
  getGuideProfile,
  updateGuideProfile,
  submitForVerification,
  getAllGuides,
  getGuideById,
  updateAvailability,
  getGuideDashboard,
  getMyAssignedTrips,
  respondToAssignment
};