const User = require('../models/User');
const { AppError } = require('../middleware/errorHandler');

// @desc    Get organiser profile
// @route   GET /api/organiser/profile
// @access  Private (Organiser)
const getOrganiserProfile = async (req, res, next) => {
  try {
    const organiser = await User.findById(req.user.id);
    
    res.status(200).json({
      success: true,
      data: {
        ...organiser.toObject(),
        organiserProfile: organiser.organiserProfile
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update organiser profile
// @route   PUT /api/organiser/profile
// @access  Private (Organiser)
const updateOrganiserProfile = async (req, res, next) => {
  try {
    const allowedFields = [
      'companyName', 'companyType', 'registrationNumber', 'gstNumber',
      'establishedYear', 'employeeCount', 'annualTourists',
      'businessEmail', 'businessPhone', 'website', 'businessAddress',
      'servicesOffered', 'operatingRegions', 'description', 'tagline', 'logo'
    ];

    const updates = {};
    Object.keys(req.body).forEach(key => {
      if (allowedFields.includes(key)) {
        updates[`organiserProfile.${key}`] = req.body[key];
      }
    });

    // Also allow updating basic profile fields
    const basicFields = ['firstName', 'lastName', 'phone', 'address', 'profilePicture'];
    basicFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    const organiser = await User.findByIdAndUpdate(
      req.user.id,
      updates,
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: 'Organiser profile updated successfully',
      data: organiser
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Submit for verification
// @route   POST /api/organiser/submit-verification
// @access  Private (Organiser)
const submitForVerification = async (req, res, next) => {
  try {
    const organiser = await User.findById(req.user.id);
    
    if (organiser.organiserProfile.isVerified) {
      return next(new AppError('Your profile is already verified', 400));
    }
    
    if (organiser.organiserProfile.verificationStatus === 'under_review') {
      return next(new AppError('Your profile is already under review', 400));
    }

    // Validate required fields
    const { organiserProfile } = organiser;
    if (!organiserProfile.companyName) {
      return next(new AppError('Company name is required for verification', 400));
    }
    if (!organiserProfile.companyType) {
      return next(new AppError('Company type is required for verification', 400));
    }
    if (!organiserProfile.registrationNumber) {
      return next(new AppError('Registration number is required for verification', 400));
    }

    organiser.organiserProfile.verificationStatus = 'under_review';
    await organiser.save();

    res.status(200).json({
      success: true,
      message: 'Profile submitted for verification. You will be notified once reviewed.',
      data: {
        verificationStatus: organiser.organiserProfile.verificationStatus
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all organisers (public)
// @route   GET /api/organiser/all
// @access  Public
const getAllOrganisers = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    // Build query - only verified organisers
    const query = {
      role: 'organiser',
      isActive: true,
      'organiserProfile.isVerified': true
    };

    // Filter by company type
    if (req.query.companyType) {
      query['organiserProfile.companyType'] = req.query.companyType;
    }

    // Filter by region
    if (req.query.region) {
      query['organiserProfile.operatingRegions'] = req.query.region;
    }

    // Filter by service
    if (req.query.service) {
      query['organiserProfile.servicesOffered'] = req.query.service;
    }

    // Filter by minimum rating
    if (req.query.minRating) {
      query['organiserProfile.averageRating'] = { $gte: parseFloat(req.query.minRating) };
    }

    // Search by company name
    if (req.query.search) {
      query['organiserProfile.companyName'] = new RegExp(req.query.search, 'i');
    }

    const organisers = await User.find(query)
      .select('firstName lastName organiserProfile')
      .skip(skip)
      .limit(limit)
      .sort({ 'organiserProfile.averageRating': -1 });

    const total = await User.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        organisers,
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

// @desc    Get organiser by ID (public)
// @route   GET /api/organiser/:id
// @access  Public
const getOrganiserById = async (req, res, next) => {
  try {
    const organiser = await User.findOne({
      _id: req.params.id,
      role: 'organiser',
      isActive: true
    }).select('-password -passwordResetToken -emailVerificationToken -phoneVerificationOTP');

    if (!organiser) {
      return next(new AppError('Organiser not found', 404));
    }

    res.status(200).json({
      success: true,
      data: organiser
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get organiser dashboard stats
// @route   GET /api/organiser/dashboard
// @access  Private (Organiser)
const getOrganiserDashboard = async (req, res, next) => {
  try {
    const organiser = await User.findById(req.user.id);
    
    res.status(200).json({
      success: true,
      data: {
        company: {
          name: organiser.organiserProfile.companyName,
          type: organiser.organiserProfile.companyType,
          logo: organiser.organiserProfile.logo,
          isVerified: organiser.organiserProfile.isVerified,
          verificationStatus: organiser.organiserProfile.verificationStatus
        },
        stats: {
          totalPackages: organiser.organiserProfile.totalPackages || 0,
          totalBookings: organiser.organiserProfile.totalBookings || 0,
          averageRating: organiser.organiserProfile.averageRating || 0,
          totalReviews: organiser.organiserProfile.totalReviews || 0
        },
        services: organiser.organiserProfile.servicesOffered,
        regions: organiser.organiserProfile.operatingRegions
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create tour package (placeholder)
// @route   POST /api/organiser/packages
// @access  Private (Verified Organiser)
const createPackage = async (req, res, next) => {
  try {
    // This would create a package in a separate Package model
    // For now, just increment the counter
    
    const organiser = await User.findByIdAndUpdate(
      req.user.id,
      { $inc: { 'organiserProfile.totalPackages': 1 } },
      { new: true }
    );

    res.status(201).json({
      success: true,
      message: 'Package created successfully',
      data: {
        totalPackages: organiser.organiserProfile.totalPackages
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getOrganiserProfile,
  updateOrganiserProfile,
  submitForVerification,
  getAllOrganisers,
  getOrganiserById,
  getOrganiserDashboard,
  createPackage
};
