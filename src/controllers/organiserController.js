const mongoose = require('mongoose');
const User = require('../models/User');
const Trip = require('../models/Trip');
const Attraction = require('../models/Attraction');
const { AppError } = require('../middleware/errorHandler');

// =============================================
// ORGANISER PROFILE MANAGEMENT
// =============================================

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

    const basicFields = ['firstName', 'lastName', 'phone', 'address', 'profilePicture'];
    basicFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    const organiser = await User.findByIdAndUpdate(req.user.id, updates, { new: true, runValidators: true });

    res.status(200).json({
      success: true,
      message: 'Organiser profile updated successfully',
      data: organiser
    });
  } catch (error) {
    next(error);
  }
};

const submitForVerification = async (req, res, next) => {
  try {
    const organiser = await User.findById(req.user.id);

    if (organiser.organiserProfile.isVerified) {
      return res.status(200).json({
        success: true,
        message: 'Your profile is already verified',
        data: { isVerified: true }
      });
    }

    const { organiserProfile } = organiser;
    if (!organiserProfile.companyName || !organiserProfile.companyType || !organiserProfile.registrationNumber) {
      return next(new AppError('Required fields missing for verification', 400));
    }

    // AUTO VERIFY FOR DEVELOPMENT/TESTING
    organiser.organiserProfile.verificationStatus = 'verified';
    organiser.organiserProfile.isVerified = true;
    organiser.organiserProfile.verifiedAt = new Date();

    await organiser.save();

    res.status(200).json({
      success: true,
      message: 'Profile verified successfully!',
      data: {
        isVerified: true,
        verificationStatus: 'verified'
      }
    });
  } catch (error) {
    next(error);
  }
};

const getAllOrganisers = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    const query = {
      role: 'organiser',
      isActive: true,
      'organiserProfile.isVerified': true
    };

    if (req.query.companyType) query['organiserProfile.companyType'] = req.query.companyType;
    if (req.query.region) query['organiserProfile.operatingRegions'] = req.query.region;
    if (req.query.service) query['organiserProfile.servicesOffered'] = req.query.service;
    if (req.query.minRating) query['organiserProfile.averageRating'] = { $gte: parseFloat(req.query.minRating) };
    if (req.query.search) query['organiserProfile.companyName'] = new RegExp(req.query.search, 'i');

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
        pagination: { page, limit, total, pages: Math.ceil(total / limit) }
      }
    });
  } catch (error) {
    next(error);
  }
};

const getOrganiserById = async (req, res, next) => {
  try {
    const organiser = await User.findOne({ _id: req.params.id, role: 'organiser', isActive: true })
      .select('-password -passwordResetToken -emailVerificationToken -phoneVerificationOTP');

    if (!organiser) return next(new AppError('Organiser not found', 404));

    res.status(200).json({ success: true, data: organiser });
  } catch (error) {
    next(error);
  }
};

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

const createPackage = async (req, res, next) => {
  try {
    const organiser = await User.findByIdAndUpdate(
      req.user.id,
      { $inc: { 'organiserProfile.totalPackages': 1 } },
      { new: true }
    );

    res.status(201).json({
      success: true,
      message: 'Package created successfully',
      data: { totalPackages: organiser.organiserProfile.totalPackages }
    });
  } catch (error) {
    next(error);
  }
};

// =============================================
// TRIP MANAGEMENT (merged from tripController)
// =============================================

const validateAttraction = async (attractionId) => {
  const attraction = await Attraction.findById(attractionId);
  if (!attraction) throw new AppError('Attraction not found', 404);
  if (!attraction.isActive) throw new AppError('Attraction is inactive', 400);
  return attraction;
};

const createTrip = async (req, res, next) => {
  try {
    const { 
      title, 
      description, 
      shortDescription, 
      attraction, 
      tripType, 
      categories, 
      duration, 
      startDate, 
      endDate, 
      reportingTime,
      departureTime,
      startLocation,
      pricing, 
      capacity, 
      difficulty 
    } = req.body;

    // Validate required fields
    if (!attraction) return next(new AppError('Main attraction is required', 400));
    if (!startLocation || !startLocation.name) {
      return next(new AppError('Start location name is required', 400));
    }

    const mainAttraction = await validateAttraction(attraction);

    // Validate dates
    if (new Date(startDate) >= new Date(endDate)) {
      return next(new AppError('End date must be after start date', 400));
    }
    if (new Date(startDate) < new Date()) {
      return next(new AppError('Start date cannot be in the past', 400));
    }

    // Build trip data with ALL required fields
    const tripData = {
      title: title || `Trip to ${mainAttraction.name}`,
      description,
      shortDescription,
      attraction: mainAttraction._id,
      tripType: tripType || 'single_attraction',
      categories,
      duration,
      startDate,
      endDate,
      reportingTime,
      departureTime,
      startLocation: {
        name: startLocation.name,
        address: startLocation.address,
        city: startLocation.city,
        coordinates: startLocation.coordinates, // Already in correct format: { lat, lng }
        meetingPoint: startLocation.meetingPoint
      },
      pricing: {
        ...pricing,
        attractionEntryFee: mainAttraction.entryFee?.indian?.adult || 0
      },
      capacity,
      difficulty,
      organiser: req.user.id,
      status: 'draft'
    };

    const trip = await Trip.create(tripData);

    await User.findByIdAndUpdate(req.user.id, { $inc: { 'organiserProfile.totalPackages': 1 } });

    const populatedTrip = await Trip.findById(trip._id).populate('attraction', 'name city category thumbnail');

    res.status(201).json({
      success: true,
      message: 'Trip created successfully',
      data: populatedTrip
    });
  } catch (error) {
    next(error);
  }
};

const getMyTrips = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    const query = { organiser: req.user.id };
    if (req.query.status) query.status = req.query.status;

    const [trips, total] = await Promise.all([
      Trip.find(query)
        .populate('attraction', 'name city category thumbnail')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Trip.countDocuments(query)
    ]);

    res.status(200).json({
      success: true,
      count: trips.length,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      data: trips
    });
  } catch (error) {
    next(error);
  }
};

// Placeholder stubs for other trip functions (you can expand later)
const getTripById = async (req, res, next) => { res.status(501).json({ success: false, message: 'Not implemented' }); };
const updateTrip = async (req, res, next) => { res.status(501).json({ success: false, message: 'Not implemented' }); };
const deleteTrip = async (req, res, next) => { res.status(501).json({ success: false, message: 'Not implemented' }); };
const publishTrip = async (req, res, next) => { res.status(501).json({ success: false, message: 'Not implemented' }); };
const cancelTrip = async (req, res, next) => { res.status(501).json({ success: false, message: 'Not implemented' }); };
const getAvailableGuides = async (req, res, next) => { res.status(501).json({ success: false, message: 'Not implemented' }); };
const assignGuide = async (req, res, next) => { res.status(501).json({ success: false, message: 'Not implemented' }); };
const removeGuide = async (req, res, next) => { res.status(501).json({ success: false, message: 'Not implemented' }); };
const addBooking = async (req, res, next) => { res.status(501).json({ success: false, message: 'Not implemented' }); };
const getTripBookings = async (req, res, next) => { res.status(501).json({ success: false, message: 'Not implemented' }); };
const updateBooking = async (req, res, next) => { res.status(501).json({ success: false, message: 'Not implemented' }); };
const removeBooking = async (req, res, next) => { res.status(501).json({ success: false, message: 'Not implemented' }); };
const addHotelOptions = async (req, res, next) => { res.status(501).json({ success: false, message: 'Not implemented' }); };
const confirmHotelForBooking = async (req, res, next) => { res.status(501).json({ success: false, message: 'Not implemented' }); };
const getTripStats = async (req, res, next) => { res.status(501).json({ success: false, message: 'Not implemented' }); };
const searchTourists = async (req, res, next) => { res.status(501).json({ success: false, message: 'Not implemented' }); };

const getAdminAttractions = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const skip = (page - 1) * limit;

    const query = { isActive: true };
    if (req.query.search) {
      query.$or = [
        { name: new RegExp(req.query.search, 'i') },
        { 'location.city': new RegExp(req.query.search, 'i') }
      ];
    }

    const [attractions, total] = await Promise.all([
      Attraction.find(query)
        .select('name slug category location thumbnail entryFee isFreeEntry city')
        .sort({ name: 1 })
        .skip(skip)
        .limit(limit),
      Attraction.countDocuments(query)
    ]);

    res.status(200).json({
      success: true,
      count: attractions.length,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      data: attractions
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
  createPackage,
  createTrip,
  getMyTrips,
  getTripById,
  updateTrip,
  deleteTrip,
  publishTrip,
  cancelTrip,
  getAvailableGuides,
  assignGuide,
  removeGuide,
  addBooking,
  getTripBookings,
  updateBooking,
  removeBooking,
  addHotelOptions,
  confirmHotelForBooking,
  getTripStats,
  searchTourists,
  getAdminAttractions
};