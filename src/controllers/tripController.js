const Trip = require('../models/Trip');
const User = require('../models/User');
const { AppError } = require('../middleware/errorHandler');

// ===================
// TRIP CRUD OPERATIONS
// ===================

// @desc    Create a new trip
// @route   POST /api/organiser/trips
// @access  Private (Verified Organiser)
const createTrip = async (req, res, next) => {
  try {
    const {
      title, description, shortDescription, tripType, categories,
      destinations, startLocation, endLocation, duration,
      startDate, endDate, reportingTime, departureTime,
      itinerary, pricing, capacity, inclusions, exclusions,
      images, difficulty, ageRestriction, languages,
      cancellationPolicy, termsAndConditions, tags
    } = req.body;

    // Validate dates
    if (new Date(startDate) >= new Date(endDate)) {
      return next(new AppError('End date must be after start date', 400));
    }

    if (new Date(startDate) < new Date()) {
      return next(new AppError('Start date cannot be in the past', 400));
    }

    // Create trip
    const trip = await Trip.create({
      title,
      description,
      shortDescription,
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
      itinerary,
      pricing,
      capacity,
      inclusions,
      exclusions,
      images,
      difficulty,
      ageRestriction,
      languages,
      cancellationPolicy,
      termsAndConditions,
      tags,
      organiser: req.user.id,
      status: 'draft'
    });

    // Update organiser's total packages count
    await User.findByIdAndUpdate(req.user.id, {
      $inc: { 'organiserProfile.totalPackages': 1 }
    });

    res.status(201).json({
      success: true,
      message: 'Trip created successfully',
      data: trip
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

    // Filter by date range
    if (req.query.startFrom) {
      query.startDate = { $gte: new Date(req.query.startFrom) };
    }

    // Search
    if (req.query.search) {
      query.title = new RegExp(req.query.search, 'i');
    }

    // Sort options
    let sortOption = { createdAt: -1 };
    if (req.query.sortBy === 'startDate') {
      sortOption = { startDate: req.query.sortOrder === 'asc' ? 1 : -1 };
    } else if (req.query.sortBy === 'price') {
      sortOption = { 'pricing.pricePerPerson': req.query.sortOrder === 'asc' ? 1 : -1 };
    }

    const trips = await Trip.find(query)
      .populate('assignedGuide', 'firstName lastName email phone profilePicture guideProfile.averageRating')
      .skip(skip)
      .limit(limit)
      .sort(sortOption);

    const total = await Trip.countDocuments(query);

    // Format response
    const formattedTrips = trips.map(trip => ({
      id: trip._id,
      title: trip.title,
      slug: trip.slug,
      shortDescription: trip.shortDescription,
      tripType: trip.tripType,
      destinations: trip.destinations.map(d => d.name),
      duration: trip.duration,
      startDate: trip.startDate,
      endDate: trip.endDate,
      pricing: {
        pricePerPerson: trip.pricing.pricePerPerson,
        discountPercentage: trip.pricing.discountPercentage,
        discountedPrice: trip.discountedPrice
      },
      capacity: {
        max: trip.capacity.maxPeople,
        booked: trip.capacity.currentBookings,
        available: trip.availableSlots
      },
      status: trip.status,
      assignedGuide: trip.assignedGuide ? {
        id: trip.assignedGuide._id,
        name: `${trip.assignedGuide.firstName} ${trip.assignedGuide.lastName}`,
        rating: trip.assignedGuide.guideProfile?.averageRating
      } : null,
      guideStatus: trip.guideStatus,
      totalBookings: trip.bookings?.length || 0,
      averageRating: trip.averageRating,
      images: trip.images?.filter(img => img.isPrimary) || [],
      createdAt: trip.createdAt
    }));

    res.status(200).json({
      success: true,
      data: {
        trips: formattedTrips,
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

// @desc    Get single trip details
// @route   GET /api/organiser/trips/:id
// @access  Private (Organiser)
const getTripById = async (req, res, next) => {
  try {
    const trip = await Trip.findOne({
      _id: req.params.id,
      organiser: req.user.id
    })
    .populate('assignedGuide', 'firstName lastName email phone profilePicture guideProfile')
    .populate('bookings.user', 'firstName lastName email phone');

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

// @desc    Update trip
// @route   PUT /api/organiser/trips/:id
// @access  Private (Organiser)
const updateTrip = async (req, res, next) => {
  try {
    let trip = await Trip.findOne({
      _id: req.params.id,
      organiser: req.user.id
    });

    if (!trip) {
      return next(new AppError('Trip not found', 404));
    }

    // Prevent editing completed or cancelled trips
    if (['completed', 'cancelled'].includes(trip.status)) {
      return next(new AppError(`Cannot edit a ${trip.status} trip`, 400));
    }

    // Fields that can be updated
    const allowedUpdates = [
      'title', 'description', 'shortDescription', 'tripType', 'categories',
      'destinations', 'startLocation', 'endLocation', 'duration',
      'startDate', 'endDate', 'reportingTime', 'departureTime',
      'itinerary', 'pricing', 'capacity', 'inclusions', 'exclusions',
      'images', 'videos', 'difficulty', 'ageRestriction', 'languages',
      'cancellationPolicy', 'termsAndConditions', 'tags', 'status', 'isFeatured'
    ];

    const updates = {};
    Object.keys(req.body).forEach(key => {
      if (allowedUpdates.includes(key)) {
        updates[key] = req.body[key];
      }
    });

    // Validate dates if being updated
    if (updates.startDate && updates.endDate) {
      if (new Date(updates.startDate) >= new Date(updates.endDate)) {
        return next(new AppError('End date must be after start date', 400));
      }
    }

    trip = await Trip.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    );

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
// @access  Private (Organiser)
const deleteTrip = async (req, res, next) => {
  try {
    const trip = await Trip.findOne({
      _id: req.params.id,
      organiser: req.user.id
    });

    if (!trip) {
      return next(new AppError('Trip not found', 404));
    }

    // Check if trip has confirmed bookings
    const confirmedBookings = trip.bookings?.filter(b => b.bookingStatus === 'confirmed') || [];
    if (confirmedBookings.length > 0) {
      return next(new AppError('Cannot delete trip with confirmed bookings. Cancel the trip instead.', 400));
    }

    await Trip.findByIdAndDelete(req.params.id);

    // Update organiser's total packages count
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

// @desc    Publish trip (change status from draft to published)
// @route   PUT /api/organiser/trips/:id/publish
// @access  Private (Organiser)
const publishTrip = async (req, res, next) => {
  try {
    const trip = await Trip.findOne({
      _id: req.params.id,
      organiser: req.user.id
    });

    if (!trip) {
      return next(new AppError('Trip not found', 404));
    }

    if (trip.status !== 'draft') {
      return next(new AppError('Only draft trips can be published', 400));
    }

    // Validate required fields before publishing
    if (!trip.title || !trip.description || !trip.startDate || !trip.endDate) {
      return next(new AppError('Please complete all required fields before publishing', 400));
    }

    if (!trip.pricing?.pricePerPerson) {
      return next(new AppError('Please set pricing before publishing', 400));
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
// @access  Private (Organiser)
const cancelTrip = async (req, res, next) => {
  try {
    const { reason } = req.body;

    const trip = await Trip.findOne({
      _id: req.params.id,
      organiser: req.user.id
    });

    if (!trip) {
      return next(new AppError('Trip not found', 404));
    }

    if (trip.status === 'cancelled') {
      return next(new AppError('Trip is already cancelled', 400));
    }

    if (trip.status === 'completed') {
      return next(new AppError('Cannot cancel a completed trip', 400));
    }

    // Cancel all pending bookings
    trip.bookings.forEach(booking => {
      if (booking.bookingStatus !== 'completed') {
        booking.bookingStatus = 'cancelled';
      }
    });

    trip.status = 'cancelled';
    trip.cancellationPolicy = reason || trip.cancellationPolicy;
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

// ===================
// GUIDE ASSIGNMENT
// ===================

// @desc    Get available guides for assignment
// @route   GET /api/organiser/trips/:id/available-guides
// @access  Private (Organiser)
const getAvailableGuides = async (req, res, next) => {
  try {
    const trip = await Trip.findOne({
      _id: req.params.id,
      organiser: req.user.id
    });

    if (!trip) {
      return next(new AppError('Trip not found', 404));
    }

    // Get trip districts
    const tripDistricts = trip.destinations.map(d => d.district).filter(Boolean);

    // Build query for verified guides
    const query = {
      role: 'guide',
      isActive: true,
      'guideProfile.isVerified': true
    };

    // Filter by operating districts if trip has destinations
    if (tripDistricts.length > 0) {
      query['guideProfile.operatingDistricts'] = { $in: tripDistricts };
    }

    // Filter by language if specified
    if (req.query.language) {
      query['guideProfile.languagesSpoken.language'] = req.query.language;
    }

    // Filter by specialization
    if (req.query.specialization) {
      query['guideProfile.specializations'] = req.query.specialization;
    }

    const guides = await User.find(query)
      .select('firstName lastName email phone profilePicture guideProfile')
      .sort({ 'guideProfile.averageRating': -1 });

    const formattedGuides = guides.map(guide => ({
      id: guide._id,
      name: `${guide.firstName} ${guide.lastName}`,
      email: guide.email,
      phone: guide.phone,
      profilePicture: guide.profilePicture,
      experience: guide.guideProfile?.experienceYears,
      rating: guide.guideProfile?.averageRating,
      totalTours: guide.guideProfile?.totalTours,
      hourlyRate: guide.guideProfile?.hourlyRate,
      dailyRate: guide.guideProfile?.dailyRate,
      languages: guide.guideProfile?.languagesSpoken,
      specializations: guide.guideProfile?.specializations,
      operatingDistricts: guide.guideProfile?.operatingDistricts
    }));

    res.status(200).json({
      success: true,
      data: formattedGuides,
      count: formattedGuides.length
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Assign guide to trip
// @route   PUT /api/organiser/trips/:id/assign-guide
// @access  Private (Organiser)
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

    // Check if trip is in valid status
    if (['cancelled', 'completed'].includes(trip.status)) {
      return next(new AppError(`Cannot assign guide to a ${trip.status} trip`, 400));
    }

    // Verify guide exists and is verified
    const guide = await User.findOne({
      _id: guideId,
      role: 'guide',
      isActive: true,
      'guideProfile.isVerified': true
    });

    if (!guide) {
      return next(new AppError('Guide not found or not verified', 404));
    }

    // Update trip with assigned guide
    trip.assignedGuide = guideId;
    trip.guideAssignedAt = Date.now();
    trip.guideStatus = 'pending';
    trip.guideRejectionReason = null;
    await trip.save();

    // Populate guide details for response
    await trip.populate('assignedGuide', 'firstName lastName email phone profilePicture guideProfile');

    res.status(200).json({
      success: true,
      message: 'Guide assigned successfully. Waiting for guide confirmation.',
      data: {
        tripId: trip._id,
        guide: {
          id: trip.assignedGuide._id,
          name: `${trip.assignedGuide.firstName} ${trip.assignedGuide.lastName}`,
          email: trip.assignedGuide.email,
          phone: trip.assignedGuide.phone
        },
        guideStatus: trip.guideStatus,
        assignedAt: trip.guideAssignedAt
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Remove guide from trip
// @route   DELETE /api/organiser/trips/:id/remove-guide
// @access  Private (Organiser)
const removeGuide = async (req, res, next) => {
  try {
    const trip = await Trip.findOne({
      _id: req.params.id,
      organiser: req.user.id
    });

    if (!trip) {
      return next(new AppError('Trip not found', 404));
    }

    if (!trip.assignedGuide) {
      return next(new AppError('No guide assigned to this trip', 400));
    }

    trip.assignedGuide = null;
    trip.guideAssignedAt = null;
    trip.guideStatus = 'not_assigned';
    trip.guideRejectionReason = null;
    await trip.save();

    res.status(200).json({
      success: true,
      message: 'Guide removed from trip successfully'
    });
  } catch (error) {
    next(error);
  }
};

// ===================
// USER/TOURIST BOOKING MANAGEMENT
// ===================

// @desc    Add booking to trip (Assign user to trip)
// @route   POST /api/organiser/trips/:id/bookings
// @access  Private (Organiser)
const addBooking = async (req, res, next) => {
  try {
    const {
      userId, numberOfPeople, totalAmount, paymentStatus,
      specialRequests, contactPhone, contactEmail
    } = req.body;

    const trip = await Trip.findOne({
      _id: req.params.id,
      organiser: req.user.id
    });

    if (!trip) {
      return next(new AppError('Trip not found', 404));
    }

    // Check trip status
    if (!['published', 'full'].includes(trip.status)) {
      return next(new AppError('Trip is not available for booking', 400));
    }

    // Check availability
    if (trip.capacity.currentBookings + numberOfPeople > trip.capacity.maxPeople) {
      return next(new AppError(`Only ${trip.availableSlots} slots available`, 400));
    }

    // Verify user exists
    const user = await User.findById(userId);
    if (!user) {
      return next(new AppError('User not found', 404));
    }

    // Check if user already has a booking for this trip
    const existingBooking = trip.bookings.find(
      b => b.user.toString() === userId && b.bookingStatus !== 'cancelled'
    );
    if (existingBooking) {
      return next(new AppError('User already has a booking for this trip', 400));
    }

    // Add booking
    const booking = {
      user: userId,
      numberOfPeople,
      totalAmount: totalAmount || (numberOfPeople * trip.pricing.pricePerPerson),
      paymentStatus: paymentStatus || 'pending',
      bookingStatus: 'confirmed',
      specialRequests,
      contactPhone: contactPhone || user.phone,
      contactEmail: contactEmail || user.email
    };

    trip.bookings.push(booking);
    trip.capacity.currentBookings += numberOfPeople;

    // Update status if full
    if (trip.capacity.currentBookings >= trip.capacity.maxPeople) {
      trip.status = 'full';
    }

    await trip.save();

    // Update organiser's total bookings
    await User.findByIdAndUpdate(req.user.id, {
      $inc: { 'organiserProfile.totalBookings': 1 }
    });

    // Get the newly added booking
    const newBooking = trip.bookings[trip.bookings.length - 1];

    res.status(201).json({
      success: true,
      message: 'Booking added successfully',
      data: {
        bookingId: newBooking._id,
        tripId: trip._id,
        user: {
          id: user._id,
          name: `${user.firstName} ${user.lastName}`,
          email: user.email
        },
        numberOfPeople,
        totalAmount: newBooking.totalAmount,
        bookingStatus: newBooking.bookingStatus,
        availableSlots: trip.availableSlots
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
    }).populate('bookings.user', 'firstName lastName email phone profilePicture');

    if (!trip) {
      return next(new AppError('Trip not found', 404));
    }

    const bookings = trip.bookings.map(booking => ({
      id: booking._id,
      user: {
        id: booking.user._id,
        name: `${booking.user.firstName} ${booking.user.lastName}`,
        email: booking.user.email,
        phone: booking.user.phone,
        profilePicture: booking.user.profilePicture
      },
      numberOfPeople: booking.numberOfPeople,
      totalAmount: booking.totalAmount,
      paymentStatus: booking.paymentStatus,
      bookingStatus: booking.bookingStatus,
      specialRequests: booking.specialRequests,
      contactPhone: booking.contactPhone,
      contactEmail: booking.contactEmail,
      bookingDate: booking.bookingDate,
      createdAt: booking.createdAt
    }));

    res.status(200).json({
      success: true,
      data: {
        tripId: trip._id,
        tripTitle: trip.title,
        totalBookings: bookings.length,
        totalPeople: trip.capacity.currentBookings,
        availableSlots: trip.availableSlots,
        bookings
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update booking status
// @route   PUT /api/organiser/trips/:tripId/bookings/:bookingId
// @access  Private (Organiser)
const updateBooking = async (req, res, next) => {
  try {
    const { paymentStatus, bookingStatus, specialRequests } = req.body;

    const trip = await Trip.findOne({
      _id: req.params.tripId,
      organiser: req.user.id
    });

    if (!trip) {
      return next(new AppError('Trip not found', 404));
    }

    const booking = trip.bookings.id(req.params.bookingId);

    if (!booking) {
      return next(new AppError('Booking not found', 404));
    }

    // Update booking fields
    if (paymentStatus) booking.paymentStatus = paymentStatus;
    if (bookingStatus) {
      // If cancelling, reduce current bookings count
      if (bookingStatus === 'cancelled' && booking.bookingStatus !== 'cancelled') {
        trip.capacity.currentBookings -= booking.numberOfPeople;
        if (trip.status === 'full') {
          trip.status = 'published';
        }
      }
      booking.bookingStatus = bookingStatus;
    }
    if (specialRequests !== undefined) booking.specialRequests = specialRequests;

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

// @desc    Remove booking from trip
// @route   DELETE /api/organiser/trips/:tripId/bookings/:bookingId
// @access  Private (Organiser)
const removeBooking = async (req, res, next) => {
  try {
    const trip = await Trip.findOne({
      _id: req.params.tripId,
      organiser: req.user.id
    });

    if (!trip) {
      return next(new AppError('Trip not found', 404));
    }

    const booking = trip.bookings.id(req.params.bookingId);

    if (!booking) {
      return next(new AppError('Booking not found', 404));
    }

    // Reduce current bookings count
    trip.capacity.currentBookings -= booking.numberOfPeople;

    // Update status if was full
    if (trip.status === 'full') {
      trip.status = 'published';
    }

    // Remove booking
    trip.bookings.pull(req.params.bookingId);

    await trip.save();

    res.status(200).json({
      success: true,
      message: 'Booking removed successfully',
      data: {
        availableSlots: trip.availableSlots
      }
    });
  } catch (error) {
    next(error);
  }
};

// ===================
// DASHBOARD & STATS
// ===================

// @desc    Get organiser trip statistics
// @route   GET /api/organiser/trips/stats
// @access  Private (Organiser)
const getTripStats = async (req, res, next) => {
  try {
    const stats = await Trip.aggregate([
      { $match: { organiser: req.user._id } },
      {
        $facet: {
          total: [{ $count: 'count' }],
          byStatus: [
            { $group: { _id: '$status', count: { $sum: 1 } } }
          ],
          totalBookings: [
            { $unwind: '$bookings' },
            { $count: 'count' }
          ],
          totalRevenue: [
            { $unwind: '$bookings' },
            { $match: { 'bookings.paymentStatus': 'completed' } },
            { $group: { _id: null, total: { $sum: '$bookings.totalAmount' } } }
          ],
          upcomingTrips: [
            { $match: { startDate: { $gte: new Date() }, status: 'published' } },
            { $count: 'count' }
          ],
          averageRating: [
            { $match: { averageRating: { $gt: 0 } } },
            { $group: { _id: null, avg: { $avg: '$averageRating' } } }
          ],
          popularDestinations: [
            { $unwind: '$destinations' },
            { $group: { _id: '$destinations.district', count: { $sum: 1 } } },
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
        totalTrips: result.total[0]?.count || 0,
        byStatus: result.byStatus.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        totalBookings: result.totalBookings[0]?.count || 0,
        totalRevenue: result.totalRevenue[0]?.total || 0,
        upcomingTrips: result.upcomingTrips[0]?.count || 0,
        averageRating: result.averageRating[0]?.avg?.toFixed(1) || 0,
        popularDestinations: result.popularDestinations
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Search tourists to add to trip
// @route   GET /api/organiser/search-tourists
// @access  Private (Organiser)
const searchTourists = async (req, res, next) => {
  try {
    const { q } = req.query;

    if (!q || q.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Search query must be at least 2 characters'
      });
    }

    const searchRegex = new RegExp(q, 'i');

    const tourists = await User.find({
      role: 'tourist',
      isActive: true,
      $or: [
        { firstName: searchRegex },
        { lastName: searchRegex },
        { email: searchRegex },
        { phone: searchRegex }
      ]
    })
    .select('firstName lastName email phone profilePicture touristProfile')
    .limit(20);

    res.status(200).json({
      success: true,
      data: tourists.map(t => ({
        id: t._id,
        name: `${t.firstName} ${t.lastName}`,
        email: t.email,
        phone: t.phone,
        profilePicture: t.profilePicture,
        membershipTier: t.touristProfile?.membershipTier
      })),
      count: tourists.length
    });
  } catch (error) {
    next(error);
  }
};

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
  // Stats
  getTripStats,
  searchTourists
};
