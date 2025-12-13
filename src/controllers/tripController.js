const Trip = require('../models/Trip');
const User = require('../models/User');
const Attraction = require('../models/Attraction');
const { AppError } = require('../middleware/errorHandler');

// ===================
// HELPER FUNCTIONS
// ===================

// Validate that attraction exists and is admin-created
const validateAttraction = async (attractionId) => {
  const attraction = await Attraction.findById(attractionId);
  
  if (!attraction) {
    throw new AppError('Attraction not found. Trips can only be created for admin-approved attractions.', 404);
  }
  
  if (!attraction.isActive) {
    throw new AppError('This attraction is currently inactive.', 400);
  }
  
  return attraction;
};

// Validate multiple attractions
const validateAttractions = async (attractionIds) => {
  const attractions = await Attraction.find({
    _id: { $in: attractionIds },
    isActive: true
  });
  
  if (attractions.length !== attractionIds.length) {
    throw new AppError('One or more attractions not found or inactive.', 404);
  }
  
  return attractions;
};

// ===================
// TRIP CRUD OPERATIONS
// ===================

// @desc    Create a new trip (for admin-created attractions only)
// @route   POST /api/organiser/trips
// @access  Private (Verified Organiser)
const createTrip = async (req, res, next) => {
  try {
    const {
      title,
      description,
      shortDescription,
      attraction, // Single main attraction (required)
      attractions, // Additional attractions for multi-destination trips
      tripType,
      categories,
      destinations,
      startLocation,
      endLocation,
      duration,
      startDate,
      endDate,
      reportingTime,
      departureTime,
      isRecurring,
      recurringSchedule,
      itinerary,
      pricing,
      capacity,
      inclusions,
      exclusions,
      images,
      thumbnail,
      difficulty,
      ageRestriction,
      physicalRequirements,
      whatToBring,
      languages,
      transport,
      hotelOptions,
      cancellationPolicy,
      termsAndConditions,
      tags,
      visibility
    } = req.body;

    // ============================================
    // VALIDATE MAIN ATTRACTION (REQUIRED)
    // ============================================
    if (!attraction) {
      return next(new AppError('Attraction ID is required. Trips must be created for an admin attraction.', 400));
    }

    const mainAttraction = await validateAttraction(attraction);

    // ============================================
    // VALIDATE ADDITIONAL ATTRACTIONS (OPTIONAL)
    // ============================================
    let validatedAttractions = [];
    if (attractions && attractions.length > 0) {
      const attractionIds = attractions.map(a => a.attraction);
      await validateAttractions(attractionIds);
      validatedAttractions = attractions;
    }

    // ============================================
    // VALIDATE DATES
    // ============================================
    if (new Date(startDate) >= new Date(endDate)) {
      return next(new AppError('End date must be after start date', 400));
    }

    if (new Date(startDate) < new Date()) {
      return next(new AppError('Start date cannot be in the past', 400));
    }

    // ============================================
    // AUTO-FILL FROM ATTRACTION DATA
    // ============================================
    const tripData = {
      title: title || `Trip to ${mainAttraction.name}`,
      description,
      shortDescription,
      attraction: mainAttraction._id,
      attractions: validatedAttractions,
      tripType: tripType || (validatedAttractions.length > 0 ? 'multi_attraction' : 'single_attraction'),
      categories,
      destinations: destinations || [{
        name: mainAttraction.name,
        city: mainAttraction.location?.city || mainAttraction.city,
        district: mainAttraction.location?.district || mainAttraction.district,
        coordinates: mainAttraction.location?.coordinates
      }],
      startLocation: startLocation || {
        name: mainAttraction.name,
        city: mainAttraction.location?.city || mainAttraction.city,
        address: mainAttraction.location?.fullAddress
      },
      endLocation,
      duration,
      startDate,
      endDate,
      reportingTime,
      departureTime,
      isRecurring,
      recurringSchedule,
      itinerary,
      pricing: {
        ...pricing,
        // Include attraction entry fee in pricing
        attractionEntryFee: mainAttraction.entryFee?.indian?.adult || 0
      },
      capacity,
      inclusions,
      exclusions,
      images: images || (mainAttraction.images || []).slice(0, 3).map(img => ({
        url: img.url,
        caption: img.caption || mainAttraction.name
      })),
      thumbnail: thumbnail || mainAttraction.thumbnail,
      difficulty,
      ageRestriction,
      physicalRequirements,
      whatToBring,
      languages,
      transport,
      hotelOptions,
      cancellationPolicy,
      termsAndConditions,
      tags: tags || mainAttraction.tags || [],
      visibility,
      organiser: req.user.id,
      status: 'draft'
    };

    // ============================================
    // CREATE TRIP
    // ============================================
    const trip = await Trip.create(tripData);

    // Update organiser's total packages count
    await User.findByIdAndUpdate(req.user.id, {
      $inc: { 'organiserProfile.totalPackages': 1 }
    });

    // Populate the response
    const populatedTrip = await Trip.findById(trip._id)
      .populate('attraction', 'name city category thumbnail entryFee location')
      .populate('attractions.attraction', 'name city category thumbnail');

    res.status(201).json({
      success: true,
      message: 'Trip created successfully',
      data: populatedTrip
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all trips by organiser
// @route   GET /api/organiser/trips
// @access  Private (Organiser)
const getMyTrips = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    // Build query
    const query = { organiser: req.user.id };

    // Filter by status
    if (req.query.status) {
      query.status = req.query.status;
    }

    // Filter by attraction
    if (req.query.attraction) {
      query.attraction = req.query.attraction;
    }

    // Filter by date range
    if (req.query.startFrom) {
      query.startDate = { $gte: new Date(req.query.startFrom) };
    }
    if (req.query.startTo) {
      query.startDate = { ...query.startDate, $lte: new Date(req.query.startTo) };
    }

    // Filter by category
    if (req.query.category) {
      query.categories = req.query.category;
    }

    // Search
    if (req.query.search) {
      query.$or = [
        { title: new RegExp(req.query.search, 'i') },
        { 'destinations.name': new RegExp(req.query.search, 'i') },
        { 'destinations.city': new RegExp(req.query.search, 'i') }
      ];
    }

    // Sort options
    let sortOption = { createdAt: -1 };
    if (req.query.sortBy === 'startDate') {
      sortOption = { startDate: req.query.sortOrder === 'asc' ? 1 : -1 };
    } else if (req.query.sortBy === 'price') {
      sortOption = { 'pricing.pricePerPerson': req.query.sortOrder === 'asc' ? 1 : -1 };
    } else if (req.query.sortBy === 'bookings') {
      sortOption = { 'capacity.currentBookings': -1 };
    }

    const [trips, total] = await Promise.all([
      Trip.find(query)
        .populate('attraction', 'name city category thumbnail entryFee')
        .populate('guide', 'name email phone guideProfile.photo')
        .sort(sortOption)
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

// @desc    Get single trip details
// @route   GET /api/organiser/trips/:id
// @access  Private (Organiser)
const getTripById = async (req, res, next) => {
  try {
    const trip = await Trip.findOne({
      _id: req.params.id,
      organiser: req.user.id
    })
      .populate('attraction', 'name city district category thumbnail entryFee location images facilities timing')
      .populate('attractions.attraction', 'name city category thumbnail entryFee')
      .populate('guide', 'name email phone guideProfile')
      .populate('bookings.user', 'name email phone')
      .populate('hotelOptions.hotel', 'name rating priceRange amenities images');

    if (!trip) {
      return next(new AppError('Trip not found or unauthorized', 404));
    }

    res.status(200).json({
      success: true,
      data: trip
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update trip
// @route   PUT /api/organiser/trips/:id
// @access  Private (Verified Organiser)
const updateTrip = async (req, res, next) => {
  try {
    let trip = await Trip.findOne({
      _id: req.params.id,
      organiser: req.user.id
    });

    if (!trip) {
      return next(new AppError('Trip not found or unauthorized', 404));
    }

    // Can't update completed or cancelled trips
    if (['completed', 'cancelled'].includes(trip.status)) {
      return next(new AppError(`Cannot update ${trip.status} trips`, 400));
    }

    // If changing attraction, validate new attraction
    if (req.body.attraction && req.body.attraction !== trip.attraction.toString()) {
      await validateAttraction(req.body.attraction);
    }

    // If adding/changing additional attractions, validate them
    if (req.body.attractions && req.body.attractions.length > 0) {
      const attractionIds = req.body.attractions.map(a => a.attraction);
      await validateAttractions(attractionIds);
    }

    // Fields that can't be updated
    delete req.body.organiser;
    delete req.body.bookings;
    delete req.body.analytics;

    // Validate dates if being updated
    if (req.body.startDate || req.body.endDate) {
      const newStart = req.body.startDate ? new Date(req.body.startDate) : trip.startDate;
      const newEnd = req.body.endDate ? new Date(req.body.endDate) : trip.endDate;
      
      if (newStart >= newEnd) {
        return next(new AppError('End date must be after start date', 400));
      }
    }

    trip = await Trip.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    )
      .populate('attraction', 'name city category thumbnail entryFee')
      .populate('guide', 'name email phone');

    res.status(200).json({
      success: true,
      message: 'Trip updated successfully',
      data: trip
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete trip
// @route   DELETE /api/organiser/trips/:id
// @access  Private (Verified Organiser)
const deleteTrip = async (req, res, next) => {
  try {
    const trip = await Trip.findOne({
      _id: req.params.id,
      organiser: req.user.id
    });

    if (!trip) {
      return next(new AppError('Trip not found or unauthorized', 404));
    }

    // Can't delete if has confirmed bookings
    const confirmedBookings = trip.bookings.filter(b => 
      b.bookingStatus === 'confirmed' && b.paymentStatus !== 'refunded'
    );

    if (confirmedBookings.length > 0) {
      return next(new AppError('Cannot delete trip with confirmed bookings. Cancel the trip instead.', 400));
    }

    await Trip.findByIdAndDelete(req.params.id);

    // Update organiser's package count
    await User.findByIdAndUpdate(req.user.id, {
      $inc: { 'organiserProfile.totalPackages': -1 }
    });

    res.status(200).json({
      success: true,
      message: 'Trip deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Publish trip
// @route   PUT /api/organiser/trips/:id/publish
// @access  Private (Verified Organiser)
const publishTrip = async (req, res, next) => {
  try {
    const trip = await Trip.findOne({
      _id: req.params.id,
      organiser: req.user.id
    });

    if (!trip) {
      return next(new AppError('Trip not found or unauthorized', 404));
    }

    // Validate trip has required fields before publishing
    const validationErrors = [];
    
    if (!trip.title) validationErrors.push('Title is required');
    if (!trip.description) validationErrors.push('Description is required');
    if (!trip.attraction) validationErrors.push('Attraction is required');
    if (!trip.startDate) validationErrors.push('Start date is required');
    if (!trip.endDate) validationErrors.push('End date is required');
    if (!trip.pricing?.pricePerPerson) validationErrors.push('Price per person is required');
    if (!trip.capacity?.maxPeople) validationErrors.push('Maximum capacity is required');
    if (!trip.startLocation?.name) validationErrors.push('Start location is required');

    if (validationErrors.length > 0) {
      return next(new AppError(`Cannot publish: ${validationErrors.join(', ')}`, 400));
    }

    // Check if start date is in future
    if (new Date(trip.startDate) < new Date()) {
      return next(new AppError('Cannot publish trip with past start date', 400));
    }

    trip.status = 'published';
    await trip.save();

    res.status(200).json({
      success: true,
      message: 'Trip published successfully',
      data: trip
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Cancel trip
// @route   PUT /api/organiser/trips/:id/cancel
// @access  Private (Verified Organiser)
const cancelTrip = async (req, res, next) => {
  try {
    const { reason } = req.body;

    const trip = await Trip.findOne({
      _id: req.params.id,
      organiser: req.user.id
    }).populate('bookings.user', 'name email');

    if (!trip) {
      return next(new AppError('Trip not found or unauthorized', 404));
    }

    if (trip.status === 'cancelled') {
      return next(new AppError('Trip is already cancelled', 400));
    }

    if (trip.status === 'completed') {
      return next(new AppError('Cannot cancel completed trip', 400));
    }

    // Mark all pending/confirmed bookings as cancelled
    trip.bookings.forEach(booking => {
      if (['pending', 'confirmed'].includes(booking.bookingStatus)) {
        booking.bookingStatus = 'cancelled';
        // Handle refunds based on cancellation policy
        if (booking.paymentStatus === 'completed') {
          booking.paymentStatus = 'refunded';
        }
      }
    });

    trip.status = 'cancelled';
    trip.cancellationReason = reason;
    await trip.save();

    // TODO: Send notification to all booked users about cancellation

    res.status(200).json({
      success: true,
      message: 'Trip cancelled successfully',
      data: trip
    });
  } catch (error) {
    next(error);
  }
};

// ===================
// GUIDE ASSIGNMENT
// ===================

// @desc    Get available guides for a trip
// @route   GET /api/organiser/trips/:id/available-guides
// @access  Private (Organiser)
const getAvailableGuides = async (req, res, next) => {
  try {
    const trip = await Trip.findOne({
      _id: req.params.id,
      organiser: req.user.id
    });

    if (!trip) {
      return next(new AppError('Trip not found or unauthorized', 404));
    }

    // Find verified guides who speak required languages and are available
    const query = {
      role: 'guide',
      isActive: true,
      'guideProfile.verificationStatus': 'verified',
      'guideProfile.isAvailable': true
    };

    // Filter by languages if trip has language requirements
    if (trip.languages && trip.languages.length > 0) {
      query['guideProfile.languages'] = { $in: trip.languages };
    }

    // Filter by specializations that match trip categories
    if (trip.categories && trip.categories.length > 0) {
      query['guideProfile.specializations'] = { $in: trip.categories };
    }

    const guides = await User.find(query)
      .select('name email phone guideProfile')
      .sort({ 'guideProfile.rating': -1 });

    res.status(200).json({
      success: true,
      count: guides.length,
      data: guides
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Assign guide to trip
// @route   PUT /api/organiser/trips/:id/assign-guide
// @access  Private (Verified Organiser)
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
      return next(new AppError('Trip not found or unauthorized', 404));
    }

    // Verify the guide exists and is verified
    const guide = await User.findOne({
      _id: guideId,
      role: 'guide',
      isActive: true,
      'guideProfile.verificationStatus': 'verified'
    });

    if (!guide) {
      return next(new AppError('Guide not found or not verified', 404));
    }

    // Check if guide is available
    if (!guide.guideProfile.isAvailable) {
      return next(new AppError('Guide is currently not available', 400));
    }

    // Assign guide
    trip.guide = guideId;
    trip.guideAssignment = {
      status: 'pending',
      assignedAt: new Date()
    };
    await trip.save();

    // TODO: Send notification to guide about new assignment

    res.status(200).json({
      success: true,
      message: 'Guide assigned successfully. Waiting for guide confirmation.',
      data: trip
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Remove guide from trip
// @route   DELETE /api/organiser/trips/:id/remove-guide
// @access  Private (Verified Organiser)
const removeGuide = async (req, res, next) => {
  try {
    const trip = await Trip.findOne({
      _id: req.params.id,
      organiser: req.user.id
    });

    if (!trip) {
      return next(new AppError('Trip not found or unauthorized', 404));
    }

    if (!trip.guide) {
      return next(new AppError('No guide assigned to this trip', 400));
    }

    trip.guide = null;
    trip.guideAssignment = {
      status: 'not_assigned'
    };
    await trip.save();

    // TODO: Notify the removed guide

    res.status(200).json({
      success: true,
      message: 'Guide removed from trip'
    });
  } catch (error) {
    next(error);
  }
};

// ===================
// BOOKING MANAGEMENT
// ===================

// @desc    Add user booking to trip
// @route   POST /api/organiser/trips/:id/bookings
// @access  Private (Verified Organiser)
const addBooking = async (req, res, next) => {
  try {
    const {
      userId,
      numberOfPeople,
      travelers,
      specialRequests,
      contactPhone,
      contactEmail,
      emergencyContact,
      selectedHotel,
      paymentStatus
    } = req.body;

    if (!userId || !numberOfPeople) {
      return next(new AppError('User ID and number of people are required', 400));
    }

    const trip = await Trip.findOne({
      _id: req.params.id,
      organiser: req.user.id
    });

    if (!trip) {
      return next(new AppError('Trip not found or unauthorized', 404));
    }

    // Check capacity
    if (trip.capacity.currentBookings + numberOfPeople > trip.capacity.maxPeople) {
      return next(new AppError(`Only ${trip.capacity.maxPeople - trip.capacity.currentBookings} slots available`, 400));
    }

    // Verify user exists
    const user = await User.findOne({ _id: userId, role: 'tourist', isActive: true });
    if (!user) {
      return next(new AppError('User not found or inactive', 404));
    }

    // Check if user already booked this trip
    const existingBooking = trip.bookings.find(
      b => b.user.toString() === userId && b.bookingStatus !== 'cancelled'
    );
    if (existingBooking) {
      return next(new AppError('User already has an active booking for this trip', 400));
    }

    // Calculate total amount
    const totalAmount = trip.pricing.pricePerPerson * numberOfPeople;

    // Create booking
    const booking = {
      user: userId,
      numberOfPeople,
      travelers,
      totalAmount,
      paymentStatus: paymentStatus || 'pending',
      bookingStatus: 'pending',
      specialRequests,
      contactPhone: contactPhone || user.phone,
      contactEmail: contactEmail || user.email,
      emergencyContact,
      selectedHotel,
      hotelStatus: selectedHotel ? 'pending' : 'not_required'
    };

    trip.bookings.push(booking);
    trip.capacity.currentBookings += numberOfPeople;
    trip.analytics.bookingsCount += 1;

    // Update status if full
    if (trip.capacity.currentBookings >= trip.capacity.maxPeople) {
      trip.status = 'full';
    }

    await trip.save();

    // TODO: Send booking confirmation to user

    res.status(201).json({
      success: true,
      message: 'Booking added successfully',
      data: {
        booking: trip.bookings[trip.bookings.length - 1],
        trip: {
          id: trip._id,
          title: trip.title,
          availableSlots: trip.capacity.maxPeople - trip.capacity.currentBookings
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all bookings for a trip
// @route   GET /api/organiser/trips/:id/bookings
// @access  Private (Organiser)
const getTripBookings = async (req, res, next) => {
  try {
    const trip = await Trip.findOne({
      _id: req.params.id,
      organiser: req.user.id
    })
      .populate('bookings.user', 'name email phone profilePicture')
      .populate('bookings.selectedHotel', 'name rating priceRange');

    if (!trip) {
      return next(new AppError('Trip not found or unauthorized', 404));
    }

    // Filter options
    let bookings = trip.bookings;

    if (req.query.status) {
      bookings = bookings.filter(b => b.bookingStatus === req.query.status);
    }

    if (req.query.paymentStatus) {
      bookings = bookings.filter(b => b.paymentStatus === req.query.paymentStatus);
    }

    // Statistics
    const stats = {
      total: trip.bookings.length,
      pending: trip.bookings.filter(b => b.bookingStatus === 'pending').length,
      confirmed: trip.bookings.filter(b => b.bookingStatus === 'confirmed').length,
      cancelled: trip.bookings.filter(b => b.bookingStatus === 'cancelled').length,
      totalRevenue: trip.bookings.reduce((sum, b) => sum + (b.totalAmount || 0), 0),
      paidAmount: trip.bookings.reduce((sum, b) => sum + (b.paidAmount || 0), 0)
    };

    res.status(200).json({
      success: true,
      count: bookings.length,
      stats,
      data: bookings
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update booking
// @route   PUT /api/organiser/trips/:tripId/bookings/:bookingId
// @access  Private (Verified Organiser)
const updateBooking = async (req, res, next) => {
  try {
    const { tripId, bookingId } = req.params;
    const { bookingStatus, paymentStatus, paidAmount, hotelStatus, specialRequests } = req.body;

    const trip = await Trip.findOne({
      _id: tripId,
      organiser: req.user.id
    });

    if (!trip) {
      return next(new AppError('Trip not found or unauthorized', 404));
    }

    const booking = trip.bookings.id(bookingId);
    if (!booking) {
      return next(new AppError('Booking not found', 404));
    }

    // Update allowed fields
    if (bookingStatus) booking.bookingStatus = bookingStatus;
    if (paymentStatus) booking.paymentStatus = paymentStatus;
    if (paidAmount !== undefined) booking.paidAmount = paidAmount;
    if (hotelStatus) booking.hotelStatus = hotelStatus;
    if (specialRequests) booking.specialRequests = specialRequests;

    await trip.save();

    res.status(200).json({
      success: true,
      message: 'Booking updated successfully',
      data: booking
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Cancel/Remove booking
// @route   DELETE /api/organiser/trips/:tripId/bookings/:bookingId
// @access  Private (Verified Organiser)
const removeBooking = async (req, res, next) => {
  try {
    const { tripId, bookingId } = req.params;
    const { refund } = req.body;

    const trip = await Trip.findOne({
      _id: tripId,
      organiser: req.user.id
    });

    if (!trip) {
      return next(new AppError('Trip not found or unauthorized', 404));
    }

    const booking = trip.bookings.id(bookingId);
    if (!booking) {
      return next(new AppError('Booking not found', 404));
    }

    // Update capacity
    trip.capacity.currentBookings -= booking.numberOfPeople;

    // Handle refund
    if (refund && booking.paymentStatus === 'completed') {
      booking.paymentStatus = 'refunded';
    }

    // Mark as cancelled instead of removing
    booking.bookingStatus = 'cancelled';

    // If trip was full, reopen it
    if (trip.status === 'full') {
      trip.status = 'published';
    }

    await trip.save();

    // TODO: Notify user about cancellation

    res.status(200).json({
      success: true,
      message: 'Booking cancelled successfully'
    });
  } catch (error) {
    next(error);
  }
};

// ===================
// HOTEL MANAGEMENT
// ===================

// @desc    Add hotel options to trip
// @route   POST /api/organiser/trips/:id/hotels
// @access  Private (Verified Organiser)
const addHotelOptions = async (req, res, next) => {
  try {
    const { hotels } = req.body;

    if (!hotels || !Array.isArray(hotels) || hotels.length === 0) {
      return next(new AppError('At least one hotel option is required', 400));
    }

    const trip = await Trip.findOne({
      _id: req.params.id,
      organiser: req.user.id
    });

    if (!trip) {
      return next(new AppError('Trip not found or unauthorized', 404));
    }

    // Add hotel options
    trip.hotelOptions = hotels.map((hotel, index) => ({
      hotelName: hotel.hotelName,
      hotelRating: hotel.hotelRating,
      roomType: hotel.roomType,
      pricePerNight: hotel.pricePerNight,
      amenities: hotel.amenities || [],
      images: hotel.images || [],
      isRecommended: index === 0, // First hotel is recommended by default
      availableRooms: hotel.availableRooms
    }));

    await trip.save();

    res.status(200).json({
      success: true,
      message: 'Hotel options added successfully',
      data: trip.hotelOptions
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Confirm hotel for booking
// @route   PUT /api/organiser/trips/:tripId/bookings/:bookingId/confirm-hotel
// @access  Private (Verified Organiser)
const confirmHotelForBooking = async (req, res, next) => {
  try {
    const { tripId, bookingId } = req.params;
    const { hotelIndex } = req.body;

    const trip = await Trip.findOne({
      _id: tripId,
      organiser: req.user.id
    });

    if (!trip) {
      return next(new AppError('Trip not found or unauthorized', 404));
    }

    const booking = trip.bookings.id(bookingId);
    if (!booking) {
      return next(new AppError('Booking not found', 404));
    }

    if (!trip.hotelOptions || trip.hotelOptions.length === 0) {
      return next(new AppError('No hotel options available for this trip', 400));
    }

    if (hotelIndex < 0 || hotelIndex >= trip.hotelOptions.length) {
      return next(new AppError('Invalid hotel selection', 400));
    }

    booking.hotelStatus = 'confirmed';
    // Store the selected hotel info in the booking
    booking.confirmedHotel = trip.hotelOptions[hotelIndex];

    await trip.save();

    res.status(200).json({
      success: true,
      message: 'Hotel confirmed for booking',
      data: {
        booking,
        hotel: trip.hotelOptions[hotelIndex]
      }
    });
  } catch (error) {
    next(error);
  }
};

// ===================
// STATS & ANALYTICS
// ===================

// @desc    Get trip statistics for organiser
// @route   GET /api/organiser/trips/stats
// @access  Private (Organiser)
const getTripStats = async (req, res, next) => {
  try {
    const organiserId = req.user.id;

    // Overall stats
    const [
      totalTrips,
      publishedTrips,
      completedTrips,
      cancelledTrips,
      upcomingTrips
    ] = await Promise.all([
      Trip.countDocuments({ organiser: organiserId }),
      Trip.countDocuments({ organiser: organiserId, status: 'published' }),
      Trip.countDocuments({ organiser: organiserId, status: 'completed' }),
      Trip.countDocuments({ organiser: organiserId, status: 'cancelled' }),
      Trip.countDocuments({ 
        organiser: organiserId, 
        status: 'published',
        startDate: { $gt: new Date() }
      })
    ]);

    // Booking stats
    const bookingStats = await Trip.aggregate([
      { $match: { organiser: new mongoose.Types.ObjectId(organiserId) } },
      { $unwind: '$bookings' },
      {
        $group: {
          _id: null,
          totalBookings: { $sum: 1 },
          confirmedBookings: {
            $sum: { $cond: [{ $eq: ['$bookings.bookingStatus', 'confirmed'] }, 1, 0] }
          },
          totalRevenue: { $sum: '$bookings.totalAmount' },
          paidAmount: { $sum: '$bookings.paidAmount' },
          totalTravelers: { $sum: '$bookings.numberOfPeople' }
        }
      }
    ]);

    // Revenue by month (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const monthlyRevenue = await Trip.aggregate([
      { $match: { organiser: new mongoose.Types.ObjectId(organiserId) } },
      { $unwind: '$bookings' },
      { $match: { 'bookings.createdAt': { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: {
            year: { $year: '$bookings.createdAt' },
            month: { $month: '$bookings.createdAt' }
          },
          revenue: { $sum: '$bookings.totalAmount' },
          bookings: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    // Top performing trips
    const topTrips = await Trip.find({ organiser: organiserId })
      .select('title analytics.bookingsCount analytics.revenue')
      .sort({ 'analytics.bookingsCount': -1 })
      .limit(5);

    // Trips by attraction
    const tripsByAttraction = await Trip.aggregate([
      { $match: { organiser: new mongoose.Types.ObjectId(organiserId) } },
      {
        $lookup: {
          from: 'attractions',
          localField: 'attraction',
          foreignField: '_id',
          as: 'attractionInfo'
        }
      },
      { $unwind: '$attractionInfo' },
      {
        $group: {
          _id: '$attraction',
          attractionName: { $first: '$attractionInfo.name' },
          city: { $first: '$attractionInfo.city' },
          tripCount: { $sum: 1 }
        }
      },
      { $sort: { tripCount: -1 } },
      { $limit: 10 }
    ]);

    res.status(200).json({
      success: true,
      data: {
        overview: {
          totalTrips,
          publishedTrips,
          completedTrips,
          cancelledTrips,
          upcomingTrips,
          draftTrips: totalTrips - publishedTrips - completedTrips - cancelledTrips
        },
        bookings: bookingStats[0] || {
          totalBookings: 0,
          confirmedBookings: 0,
          totalRevenue: 0,
          paidAmount: 0,
          totalTravelers: 0
        },
        monthlyRevenue,
        topTrips,
        tripsByAttraction
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Search tourists for booking
// @route   GET /api/organiser/search-tourists
// @access  Private (Organiser)
const searchTourists = async (req, res, next) => {
  try {
    const { q, limit = 10 } = req.query;

    if (!q || q.length < 2) {
      return next(new AppError('Search query must be at least 2 characters', 400));
    }

    const tourists = await User.find({
      role: 'tourist',
      isActive: true,
      $or: [
        { name: new RegExp(q, 'i') },
        { email: new RegExp(q, 'i') },
        { phone: new RegExp(q, 'i') }
      ]
    })
      .select('name email phone profilePicture')
      .limit(parseInt(limit));

    res.status(200).json({
      success: true,
      count: tourists.length,
      data: tourists
    });
  } catch (error) {
    next(error);
  }
};

// ===================
// GET ADMIN ATTRACTIONS (for creating trips)
// ===================

// @desc    Get list of admin attractions for trip creation
// @route   GET /api/organiser/attractions
// @access  Private (Organiser)
const getAdminAttractions = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const skip = (page - 1) * limit;

    const query = { isActive: true };

    // Filter by city
    if (req.query.city) {
      query['location.city'] = new RegExp(req.query.city, 'i');
    }

    // Filter by district
    if (req.query.district) {
      query['location.district'] = req.query.district;
    }

    // Filter by category
    if (req.query.category) {
      query.category = req.query.category;
    }

    // Search
    if (req.query.search) {
      query.$or = [
        { name: new RegExp(req.query.search, 'i') },
        { 'location.city': new RegExp(req.query.search, 'i') },
        { tags: new RegExp(req.query.search, 'i') }
      ];
    }

    const [attractions, total] = await Promise.all([
      Attraction.find(query)
        .select('name slug category location thumbnail entryFee timing status tags')
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

// Import mongoose for ObjectId in aggregations
const mongoose = require('mongoose');

module.exports = {
  // CRUD
  createTrip,
  getMyTrips,
  getTripById,
  updateTrip,
  deleteTrip,
  publishTrip,
  cancelTrip,
  // Guide Assignment
  getAvailableGuides,
  assignGuide,
  removeGuide,
  // Booking Management
  addBooking,
  getTripBookings,
  updateBooking,
  removeBooking,
  // Hotel Management
  addHotelOptions,
  confirmHotelForBooking,
  // Stats & Search
  getTripStats,
  searchTourists,
  // Attractions
  getAdminAttractions
};