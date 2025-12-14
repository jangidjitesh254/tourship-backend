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

// =============================================
// GET TRIP BY ID
// =============================================
const getTripById = async (req, res, next) => {
  try {
    const trip = await Trip.findOne({
      _id: req.params.id,
      organiser: req.user.id
    })
      .populate('attraction', 'name city category thumbnail entryFee location')
      .populate('guide', 'firstName lastName email phone guideProfile');

    if (!trip) {
      return next(new AppError('Trip not found', 404));
    }

    res.status(200).json({
      success: true,
      data: trip
    });
  } catch (error) {
    next(error);
  }
};

// =============================================
// UPDATE TRIP
// =============================================
const updateTrip = async (req, res, next) => {
  try {
    const trip = await Trip.findOne({
      _id: req.params.id,
      organiser: req.user.id
    });

    if (!trip) {
      return next(new AppError('Trip not found', 404));
    }

    // Don't allow updates to published trips (except certain fields)
    const allowedFieldsForPublished = ['status', 'isActive', 'hotelOptions', 'images'];
    if (trip.status === 'published') {
      const updateKeys = Object.keys(req.body);
      const disallowedFields = updateKeys.filter(key => !allowedFieldsForPublished.includes(key));
      if (disallowedFields.length > 0) {
        return next(new AppError(`Cannot update ${disallowedFields.join(', ')} for published trips`, 400));
      }
    }

    // If attraction is being changed, validate it
    if (req.body.attraction) {
      const attraction = await validateAttraction(req.body.attraction);
      req.body.attraction = attraction._id;
    }

    // Update the trip
    const updatedTrip = await Trip.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    )
      .populate('attraction', 'name city category thumbnail entryFee')
      .populate('guide', 'firstName lastName email phone');

    res.status(200).json({
      success: true,
      message: 'Trip updated successfully',
      data: updatedTrip
    });
  } catch (error) {
    next(error);
  }
};

// =============================================
// DELETE TRIP
// =============================================
const deleteTrip = async (req, res, next) => {
  try {
    const trip = await Trip.findOne({
      _id: req.params.id,
      organiser: req.user.id
    });

    if (!trip) {
      return next(new AppError('Trip not found', 404));
    }

    // Don't allow deleting trips with confirmed bookings
    const confirmedBookings = trip.bookings.filter(b => 
      b.bookingStatus === 'confirmed' || b.bookingStatus === 'completed'
    );
    if (confirmedBookings.length > 0) {
      return next(new AppError('Cannot delete trip with confirmed bookings. Cancel the trip instead.', 400));
    }

    await Trip.findByIdAndDelete(req.params.id);

    // Decrement organiser's package count
    await User.findByIdAndUpdate(req.user.id, { $inc: { 'organiserProfile.totalPackages': -1 } });

    res.status(200).json({
      success: true,
      message: 'Trip deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// =============================================
// PUBLISH TRIP
// =============================================
const publishTrip = async (req, res, next) => {
  try {
    const trip = await Trip.findOne({
      _id: req.params.id,
      organiser: req.user.id
    });

    if (!trip) {
      return next(new AppError('Trip not found', 404));
    }

    if (trip.status === 'published') {
      return res.status(200).json({
        success: true,
        message: 'Trip is already published',
        data: trip
      });
    }

    if (trip.status === 'cancelled') {
      return next(new AppError('Cannot publish a cancelled trip', 400));
    }

    // Validate required fields for publishing
    const validationErrors = [];
    if (!trip.title) validationErrors.push('Title is required');
    if (!trip.description) validationErrors.push('Description is required');
    if (!trip.startDate) validationErrors.push('Start date is required');
    if (!trip.endDate) validationErrors.push('End date is required');
    if (!trip.pricing?.pricePerPerson) validationErrors.push('Price per person is required');
    if (!trip.capacity?.maxPeople) validationErrors.push('Maximum capacity is required');
    if (!trip.startLocation?.name) validationErrors.push('Start location is required');

    if (validationErrors.length > 0) {
      return next(new AppError(`Cannot publish: ${validationErrors.join(', ')}`, 400));
    }

    // Check if start date is in the future
    if (new Date(trip.startDate) <= new Date()) {
      return next(new AppError('Cannot publish a trip with a past start date', 400));
    }

    trip.status = 'published';
    await trip.save();

    const populatedTrip = await Trip.findById(trip._id)
      .populate('attraction', 'name city category thumbnail entryFee');

    res.status(200).json({
      success: true,
      message: 'Trip published successfully',
      data: populatedTrip
    });
  } catch (error) {
    next(error);
  }
};

// =============================================
// CANCEL TRIP
// =============================================
const cancelTrip = async (req, res, next) => {
  try {
    const trip = await Trip.findOne({
      _id: req.params.id,
      organiser: req.user.id
    });

    if (!trip) {
      return next(new AppError('Trip not found', 404));
    }

    if (trip.status === 'cancelled') {
      return res.status(200).json({
        success: true,
        message: 'Trip is already cancelled',
        data: trip
      });
    }

    if (trip.status === 'completed') {
      return next(new AppError('Cannot cancel a completed trip', 400));
    }

    // Store cancellation reason if provided
    const { reason } = req.body;

    trip.status = 'cancelled';
    trip.isActive = false;
    if (reason) {
      trip.cancellationPolicy = {
        ...trip.cancellationPolicy,
        description: `Cancelled: ${reason}`
      };
    }

    // Update all pending/confirmed bookings to cancelled
    trip.bookings.forEach(booking => {
      if (booking.bookingStatus === 'pending' || booking.bookingStatus === 'confirmed') {
        booking.bookingStatus = 'cancelled';
      }
    });

    await trip.save();

    res.status(200).json({
      success: true,
      message: 'Trip cancelled successfully',
      data: trip
    });
  } catch (error) {
    next(error);
  }
};

// =============================================
// GET AVAILABLE GUIDES
// =============================================
const getAvailableGuides = async (req, res, next) => {
  try {
    const trip = await Trip.findOne({
      _id: req.params.id,
      organiser: req.user.id
    }).populate('attraction', 'location');

    if (!trip) {
      return next(new AppError('Trip not found', 404));
    }

    // Get the trip's district from the attraction
    const tripDistrict = trip.attraction?.location?.district || 
                        trip.destinations?.[0]?.district;

    // Find verified guides who operate in the trip's area
    const query = {
      role: 'guide',
      isActive: true,
      'guideProfile.isVerified': true
    };

    // If we have a district, filter by it
    if (tripDistrict) {
      query['guideProfile.operatingDistricts'] = tripDistrict;
    }

    const guides = await User.find(query)
      .select('firstName lastName profilePicture guideProfile')
      .sort({ 'guideProfile.averageRating': -1 });

    res.status(200).json({
      success: true,
      count: guides.length,
      data: guides
    });
  } catch (error) {
    next(error);
  }
};

// =============================================
// ASSIGN GUIDE
// =============================================
const assignGuide = async (req, res, next) => {
  try {
    const { guideId } = req.body;

    if (!guideId) {
      return next(new AppError('Guide ID is required', 400));
    }

    const trip = await Trip.findOne({
      _id: req.params.id,
      organiser: req.user.id
    });

    if (!trip) {
      return next(new AppError('Trip not found', 404));
    }

    // Verify the guide exists and is verified
    const guide = await User.findOne({
      _id: guideId,
      role: 'guide',
      isActive: true,
      'guideProfile.isVerified': true
    });

    if (!guide) {
      return next(new AppError('Guide not found or not verified', 404));
    }

    // Assign the guide
    trip.guide = guideId;
    trip.guideAssignment = {
      status: 'pending',
      assignedAt: new Date()
    };

    await trip.save();

    const populatedTrip = await Trip.findById(trip._id)
      .populate('attraction', 'name city category thumbnail')
      .populate('guide', 'firstName lastName email phone guideProfile');

    res.status(200).json({
      success: true,
      message: 'Guide assigned successfully. Awaiting guide acceptance.',
      data: populatedTrip
    });
  } catch (error) {
    next(error);
  }
};

// =============================================
// REMOVE GUIDE
// =============================================
const removeGuide = async (req, res, next) => {
  try {
    const trip = await Trip.findOne({
      _id: req.params.id,
      organiser: req.user.id
    });

    if (!trip) {
      return next(new AppError('Trip not found', 404));
    }

    if (!trip.guide) {
      return next(new AppError('No guide assigned to this trip', 400));
    }

    trip.guide = null;
    trip.guideAssignment = {
      status: 'not_assigned',
      assignedAt: null,
      respondedAt: null,
      rejectionReason: null
    };

    await trip.save();

    res.status(200).json({
      success: true,
      message: 'Guide removed successfully',
      data: trip
    });
  } catch (error) {
    next(error);
  }
};

// =============================================
// ADD BOOKING
// =============================================
const addBooking = async (req, res, next) => {
  try {
    const trip = await Trip.findOne({
      _id: req.params.id,
      organiser: req.user.id
    });

    if (!trip) {
      return next(new AppError('Trip not found', 404));
    }

    if (trip.status !== 'published' && trip.status !== 'draft') {
      return next(new AppError('Cannot add bookings to this trip', 400));
    }

    const {
      user,
      numberOfPeople,
      totalAmount,
      travelers,
      specialRequests,
      contactPhone,
      contactEmail,
      emergencyContact
    } = req.body;

    // Validate required fields
    if (!user || !numberOfPeople || !totalAmount) {
      return next(new AppError('User, numberOfPeople, and totalAmount are required', 400));
    }

    // Check capacity
    const availableSlots = trip.capacity.maxPeople - trip.capacity.currentBookings;
    if (numberOfPeople > availableSlots) {
      return next(new AppError(`Only ${availableSlots} slots available`, 400));
    }

    // Verify the user exists
    const touristUser = await User.findById(user);
    if (!touristUser) {
      return next(new AppError('User not found', 404));
    }

    const booking = {
      user,
      numberOfPeople,
      totalAmount,
      travelers: travelers || [],
      specialRequests,
      contactPhone: contactPhone || touristUser.phone,
      contactEmail: contactEmail || touristUser.email,
      emergencyContact,
      bookingDate: new Date(),
      bookingStatus: 'pending',
      paymentStatus: 'pending',
      paidAmount: 0
    };

    trip.bookings.push(booking);
    trip.capacity.currentBookings += numberOfPeople;
    trip.analytics.bookingsCount += 1;

    // Check if trip is now full
    if (trip.capacity.currentBookings >= trip.capacity.maxPeople) {
      trip.status = 'full';
    }

    await trip.save();

    const populatedTrip = await Trip.findById(trip._id)
      .populate('attraction', 'name city category thumbnail')
      .populate('bookings.user', 'firstName lastName email phone');

    res.status(201).json({
      success: true,
      message: 'Booking added successfully',
      data: populatedTrip
    });
  } catch (error) {
    next(error);
  }
};

// =============================================
// GET TRIP BOOKINGS
// =============================================
const getTripBookings = async (req, res, next) => {
  try {
    const trip = await Trip.findOne({
      _id: req.params.id,
      organiser: req.user.id
    })
      .select('bookings title startDate')
      .populate('bookings.user', 'firstName lastName email phone profilePicture');

    if (!trip) {
      return next(new AppError('Trip not found', 404));
    }

    res.status(200).json({
      success: true,
      count: trip.bookings.length,
      data: trip.bookings
    });
  } catch (error) {
    next(error);
  }
};

// =============================================
// UPDATE BOOKING
// =============================================
const updateBooking = async (req, res, next) => {
  try {
    const { tripId, bookingId } = req.params;

    const trip = await Trip.findOne({
      _id: tripId,
      organiser: req.user.id
    });

    if (!trip) {
      return next(new AppError('Trip not found', 404));
    }

    const booking = trip.bookings.id(bookingId);
    if (!booking) {
      return next(new AppError('Booking not found', 404));
    }

    const {
      bookingStatus,
      paymentStatus,
      paidAmount,
      numberOfPeople,
      totalAmount
    } = req.body;

    // Handle capacity changes if numberOfPeople is updated
    if (numberOfPeople && numberOfPeople !== booking.numberOfPeople) {
      const diff = numberOfPeople - booking.numberOfPeople;
      const newCurrentBookings = trip.capacity.currentBookings + diff;
      
      if (newCurrentBookings > trip.capacity.maxPeople) {
        return next(new AppError('Not enough capacity for this change', 400));
      }
      
      trip.capacity.currentBookings = newCurrentBookings;
      booking.numberOfPeople = numberOfPeople;
    }

    // Update allowed fields
    if (bookingStatus) booking.bookingStatus = bookingStatus;
    if (paymentStatus) booking.paymentStatus = paymentStatus;
    if (paidAmount !== undefined) booking.paidAmount = paidAmount;
    if (totalAmount) booking.totalAmount = totalAmount;

    // Update revenue tracking
    if (paymentStatus === 'completed' && booking.paymentStatus !== 'completed') {
      trip.analytics.revenue += booking.totalAmount - (booking.paidAmount || 0);
    }

    await trip.save();

    const populatedTrip = await Trip.findById(trip._id)
      .populate('attraction', 'name city category thumbnail')
      .populate('bookings.user', 'firstName lastName email phone');

    res.status(200).json({
      success: true,
      message: 'Booking updated successfully',
      data: populatedTrip
    });
  } catch (error) {
    next(error);
  }
};

// =============================================
// REMOVE BOOKING
// =============================================
const removeBooking = async (req, res, next) => {
  try {
    const { tripId, bookingId } = req.params;

    const trip = await Trip.findOne({
      _id: tripId,
      organiser: req.user.id
    });

    if (!trip) {
      return next(new AppError('Trip not found', 404));
    }

    const booking = trip.bookings.id(bookingId);
    if (!booking) {
      return next(new AppError('Booking not found', 404));
    }

    // Don't allow removing completed bookings
    if (booking.bookingStatus === 'completed') {
      return next(new AppError('Cannot remove completed bookings', 400));
    }

    // Update capacity
    trip.capacity.currentBookings -= booking.numberOfPeople;
    trip.analytics.bookingsCount -= 1;

    // If trip was full, update status
    if (trip.status === 'full') {
      trip.status = 'published';
    }

    // Remove the booking
    trip.bookings.pull(bookingId);

    await trip.save();

    res.status(200).json({
      success: true,
      message: 'Booking removed successfully'
    });
  } catch (error) {
    next(error);
  }
};

// =============================================
// ADD HOTEL OPTIONS
// =============================================
const addHotelOptions = async (req, res, next) => {
  try {
    const trip = await Trip.findOne({
      _id: req.params.id,
      organiser: req.user.id
    });

    if (!trip) {
      return next(new AppError('Trip not found', 404));
    }

    const { hotels } = req.body;

    if (!hotels || !Array.isArray(hotels) || hotels.length === 0) {
      return next(new AppError('Hotels array is required', 400));
    }

    // Validate each hotel option
    const validatedHotels = hotels.map(hotel => ({
      hotelName: hotel.hotelName,
      hotelRating: hotel.hotelRating || 3,
      roomType: hotel.roomType || 'Standard',
      pricePerNight: hotel.pricePerNight || 0,
      amenities: hotel.amenities || [],
      images: hotel.images || [],
      isRecommended: hotel.isRecommended || false,
      availableRooms: hotel.availableRooms || 10
    }));

    // Add new hotels to existing ones
    trip.hotelOptions = [...(trip.hotelOptions || []), ...validatedHotels];

    await trip.save();

    res.status(200).json({
      success: true,
      message: 'Hotel options added successfully',
      data: trip
    });
  } catch (error) {
    next(error);
  }
};

// =============================================
// CONFIRM HOTEL FOR BOOKING
// =============================================
const confirmHotelForBooking = async (req, res, next) => {
  try {
    const { tripId, bookingId } = req.params;
    const { hotelIndex } = req.body;

    const trip = await Trip.findOne({
      _id: tripId,
      organiser: req.user.id
    });

    if (!trip) {
      return next(new AppError('Trip not found', 404));
    }

    const booking = trip.bookings.id(bookingId);
    if (!booking) {
      return next(new AppError('Booking not found', 404));
    }

    if (hotelIndex === undefined || hotelIndex < 0 || hotelIndex >= trip.hotelOptions.length) {
      return next(new AppError('Invalid hotel index', 400));
    }

    const selectedHotel = trip.hotelOptions[hotelIndex];

    booking.selectedHotel = selectedHotel._id;
    booking.hotelStatus = 'confirmed';

    await trip.save();

    res.status(200).json({
      success: true,
      message: 'Hotel confirmed for booking',
      data: {
        booking,
        hotel: selectedHotel
      }
    });
  } catch (error) {
    next(error);
  }
};

// =============================================
// GET TRIP STATS
// =============================================
const getTripStats = async (req, res, next) => {
  try {
    const stats = await Trip.aggregate([
      {
        $match: { organiser: new mongoose.Types.ObjectId(req.user.id) }
      },
      {
        $group: {
          _id: null,
          totalTrips: { $sum: 1 },
          draftTrips: {
            $sum: { $cond: [{ $eq: ['$status', 'draft'] }, 1, 0] }
          },
          publishedTrips: {
            $sum: { $cond: [{ $eq: ['$status', 'published'] }, 1, 0] }
          },
          completedTrips: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          },
          cancelledTrips: {
            $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] }
          },
          fullTrips: {
            $sum: { $cond: [{ $eq: ['$status', 'full'] }, 1, 0] }
          },
          totalBookings: { $sum: '$capacity.currentBookings' },
          totalRevenue: { $sum: '$analytics.revenue' },
          totalViews: { $sum: '$analytics.views' },
          avgRating: { $avg: '$analytics.avgRating' }
        }
      }
    ]);

    // Get upcoming trips count
    const upcomingTrips = await Trip.countDocuments({
      organiser: req.user.id,
      status: 'published',
      startDate: { $gt: new Date() }
    });

    // Get recent bookings (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentBookingsCount = await Trip.aggregate([
      { $match: { organiser: new mongoose.Types.ObjectId(req.user.id) } },
      { $unwind: '$bookings' },
      { $match: { 'bookings.bookingDate': { $gte: thirtyDaysAgo } } },
      { $count: 'count' }
    ]);

    const result = stats[0] || {
      totalTrips: 0,
      draftTrips: 0,
      publishedTrips: 0,
      completedTrips: 0,
      cancelledTrips: 0,
      fullTrips: 0,
      totalBookings: 0,
      totalRevenue: 0,
      totalViews: 0,
      avgRating: 0
    };

    res.status(200).json({
      success: true,
      data: {
        ...result,
        upcomingTrips,
        recentBookings: recentBookingsCount[0]?.count || 0
      }
    });
  } catch (error) {
    next(error);
  }
};

// =============================================
// SEARCH TOURISTS
// =============================================
const searchTourists = async (req, res, next) => {
  try {
    const { q } = req.query;

    if (!q || q.length < 2) {
      return res.status(200).json({
        success: true,
        count: 0,
        data: []
      });
    }

    const tourists = await User.find({
      role: 'tourist',
      isActive: true,
      $or: [
        { firstName: new RegExp(q, 'i') },
        { lastName: new RegExp(q, 'i') },
        { email: new RegExp(q, 'i') },
        { phone: new RegExp(q, 'i') }
      ]
    })
      .select('firstName lastName email phone profilePicture')
      .limit(20)
      .sort({ firstName: 1 });

    res.status(200).json({
      success: true,
      count: tourists.length,
      data: tourists
    });
  } catch (error) {
    next(error);
  }
};

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