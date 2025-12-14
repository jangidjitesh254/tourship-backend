const mongoose = require('mongoose');
const Trip = require('../models/Trip');
const User = require('../models/User');
const { AppError } = require('../middleware/errorHandler');

// =============================================
// PUBLIC: Get trips for an attraction
// =============================================
const getTripsForAttraction = async (req, res, next) => {
  try {
    const { attractionId } = req.params;
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    // Validate attractionId
    if (!mongoose.Types.ObjectId.isValid(attractionId)) {
      return next(new AppError('Invalid attraction ID', 400));
    }

    const query = {
      $or: [
        { attraction: attractionId },
        { 'attractions.attraction': attractionId }
      ],
      status: 'published',
      isActive: true,
      visibility: 'public',
      startDate: { $gt: new Date() }
    };

    const [trips, total] = await Promise.all([
      Trip.find(query)
        .populate('organiser', 'firstName lastName organiserProfile.companyName organiserProfile.logo organiserProfile.averageRating')
        .populate('attraction', 'name city category thumbnail')
        .select('-bookings -reviews')
        .sort({ startDate: 1 })
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
// PUBLIC: Get all available trips
// =============================================
const getAvailableTrips = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    const query = {
      status: 'published',
      isActive: true,
      visibility: 'public',
      startDate: { $gt: new Date() },
      $expr: { $lt: ['$capacity.currentBookings', '$capacity.maxPeople'] }
    };

    // Filters
    if (req.query.city) {
      query['destinations.city'] = new RegExp(req.query.city, 'i');
    }
    if (req.query.category) {
      query.categories = req.query.category;
    }
    if (req.query.minPrice) {
      query['pricing.pricePerPerson'] = { $gte: parseFloat(req.query.minPrice) };
    }
    if (req.query.maxPrice) {
      query['pricing.pricePerPerson'] = { 
        ...query['pricing.pricePerPerson'], 
        $lte: parseFloat(req.query.maxPrice) 
      };
    }
    if (req.query.startDate) {
      query.startDate = { $gte: new Date(req.query.startDate) };
    }
    if (req.query.difficulty) {
      query.difficulty = req.query.difficulty;
    }

    const [trips, total] = await Promise.all([
      Trip.find(query)
        .populate('organiser', 'firstName lastName organiserProfile.companyName organiserProfile.logo organiserProfile.averageRating')
        .populate('attraction', 'name city category thumbnail')
        .select('-bookings -reviews')
        .sort({ startDate: 1 })
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
// PUBLIC: Get single trip details
// =============================================
const getTripDetails = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(new AppError('Invalid trip ID', 400));
    }

    const trip = await Trip.findOne({
      _id: id,
      status: { $in: ['published', 'full'] },
      isActive: true
    })
      .populate('organiser', 'firstName lastName email phone organiserProfile.companyName organiserProfile.logo organiserProfile.averageRating organiserProfile.totalReviews organiserProfile.businessPhone')
      .populate('attraction', 'name city category thumbnail description location entryFee')
      .populate('guide', 'firstName lastName guideProfile.experienceYears guideProfile.specializations guideProfile.languagesSpoken guideProfile.averageRating');

    if (!trip) {
      return next(new AppError('Trip not found or not available', 404));
    }

    // Increment view count
    trip.analytics.views += 1;
    await trip.save();

    res.status(200).json({
      success: true,
      data: trip
    });
  } catch (error) {
    next(error);
  }
};

// =============================================
// PROTECTED: Book a trip (Tourist only)
// =============================================
const bookTrip = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const {
      numberOfPeople,
      travelers,
      specialRequests,
      contactPhone,
      contactEmail,
      emergencyContact,
      selectedHotelIndex
    } = req.body;

    // Validate required fields
    if (!numberOfPeople || numberOfPeople < 1) {
      return next(new AppError('Number of people is required', 400));
    }

    // Get the trip
    const trip = await Trip.findOne({
      _id: id,
      status: { $in: ['published'] },
      isActive: true,
      startDate: { $gt: new Date() }
    });

    if (!trip) {
      return next(new AppError('Trip not found or no longer available', 404));
    }

    // Check capacity
    const availableSlots = trip.capacity.maxPeople - trip.capacity.currentBookings;
    if (numberOfPeople > availableSlots) {
      return next(new AppError(`Only ${availableSlots} slots available`, 400));
    }

    // Get user details
    const user = await User.findById(userId);
    if (!user) {
      return next(new AppError('User not found', 404));
    }

    // Calculate total amount
    let totalAmount = trip.pricing.pricePerPerson * numberOfPeople;
    
    // Apply group discount if applicable
    if (trip.pricing.groupDiscount && numberOfPeople >= trip.pricing.groupDiscount.minPeople) {
      const discount = totalAmount * (trip.pricing.groupDiscount.discountPercent / 100);
      totalAmount -= discount;
    }

    // Apply early bird discount if applicable
    if (trip.pricing.earlyBirdDiscount && trip.pricing.earlyBirdDiscount.deadline) {
      if (new Date() < new Date(trip.pricing.earlyBirdDiscount.deadline)) {
        const discount = totalAmount * (trip.pricing.earlyBirdDiscount.discountPercent / 100);
        totalAmount -= discount;
      }
    }

    // Create booking
    const booking = {
      user: userId,
      numberOfPeople,
      totalAmount,
      travelers: travelers || [],
      specialRequests,
      contactPhone: contactPhone || user.phone,
      contactEmail: contactEmail || user.email,
      emergencyContact,
      bookingDate: new Date(),
      bookingStatus: 'pending',
      paymentStatus: 'pending',
      paidAmount: 0,
      hotelStatus: trip.hotelOptions.length > 0 ? 'pending' : 'not_required'
    };

    // Set selected hotel if provided
    if (selectedHotelIndex !== undefined && trip.hotelOptions[selectedHotelIndex]) {
      booking.selectedHotel = trip.hotelOptions[selectedHotelIndex]._id;
    }

    // Add booking to trip
    trip.bookings.push(booking);
    trip.capacity.currentBookings += numberOfPeople;
    trip.analytics.bookingsCount += 1;

    // Check if trip is now full
    if (trip.capacity.currentBookings >= trip.capacity.maxPeople) {
      trip.status = 'full';
    }

    await trip.save();

    // Get the created booking
    const createdBooking = trip.bookings[trip.bookings.length - 1];

    res.status(201).json({
      success: true,
      message: 'Booking created successfully',
      data: {
        bookingId: createdBooking._id,
        tripId: trip._id,
        tripTitle: trip.title,
        startDate: trip.startDate,
        numberOfPeople,
        totalAmount,
        bookingStatus: 'pending',
        paymentStatus: 'pending'
      }
    });
  } catch (error) {
    next(error);
  }
};

// =============================================
// PROTECTED: Get user's bookings
// =============================================
const getMyBookings = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;

    // Find all trips that have bookings by this user
    const trips = await Trip.find({
      'bookings.user': userId
    })
      .populate('organiser', 'firstName lastName organiserProfile.companyName organiserProfile.businessPhone')
      .populate('attraction', 'name city category thumbnail')
      .select('title slug startDate endDate startLocation pricing bookings status attraction organiser');

    // Extract user's bookings from trips
    const bookings = [];
    trips.forEach(trip => {
      trip.bookings.forEach(booking => {
        if (booking.user.toString() === userId) {
          bookings.push({
            _id: booking._id,
            tripId: trip._id,
            tripTitle: trip.title,
            tripSlug: trip.slug,
            tripStatus: trip.status,
            startDate: trip.startDate,
            endDate: trip.endDate,
            startLocation: trip.startLocation,
            attraction: trip.attraction,
            organiser: trip.organiser,
            pricing: trip.pricing,
            numberOfPeople: booking.numberOfPeople,
            totalAmount: booking.totalAmount,
            paidAmount: booking.paidAmount,
            bookingStatus: booking.bookingStatus,
            paymentStatus: booking.paymentStatus,
            bookingDate: booking.bookingDate,
            travelers: booking.travelers,
            hotelStatus: booking.hotelStatus,
            createdAt: booking.createdAt
          });
        }
      });
    });

    // Sort by booking date (newest first)
    bookings.sort((a, b) => new Date(b.bookingDate) - new Date(a.bookingDate));

    // Paginate
    const total = bookings.length;
    const paginatedBookings = bookings.slice((page - 1) * limit, page * limit);

    res.status(200).json({
      success: true,
      count: paginatedBookings.length,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      data: paginatedBookings
    });
  } catch (error) {
    next(error);
  }
};

// =============================================
// PROTECTED: Cancel user's booking
// =============================================
const cancelMyBooking = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { tripId, bookingId } = req.params;

    const trip = await Trip.findById(tripId);
    if (!trip) {
      return next(new AppError('Trip not found', 404));
    }

    const booking = trip.bookings.id(bookingId);
    if (!booking) {
      return next(new AppError('Booking not found', 404));
    }

    // Verify ownership
    if (booking.user.toString() !== userId) {
      return next(new AppError('Not authorized to cancel this booking', 403));
    }

    // Check if booking can be cancelled
    if (booking.bookingStatus === 'cancelled') {
      return next(new AppError('Booking is already cancelled', 400));
    }
    if (booking.bookingStatus === 'completed') {
      return next(new AppError('Cannot cancel a completed booking', 400));
    }

    // Calculate refund based on cancellation policy
    let refundAmount = 0;
    const daysUntilTrip = Math.ceil((new Date(trip.startDate) - new Date()) / (1000 * 60 * 60 * 24));

    if (trip.cancellationPolicy.refundRules && trip.cancellationPolicy.refundRules.length > 0) {
      // Find applicable refund rule
      const sortedRules = [...trip.cancellationPolicy.refundRules].sort((a, b) => b.daysBeforeTrip - a.daysBeforeTrip);
      for (const rule of sortedRules) {
        if (daysUntilTrip >= rule.daysBeforeTrip) {
          refundAmount = (booking.paidAmount * rule.refundPercent) / 100;
          break;
        }
      }
    } else {
      // Default cancellation policy
      if (daysUntilTrip > 7) {
        refundAmount = booking.paidAmount * 0.9; // 90% refund
      } else if (daysUntilTrip > 3) {
        refundAmount = booking.paidAmount * 0.5; // 50% refund
      } else {
        refundAmount = 0; // No refund
      }
    }

    // Update booking
    booking.bookingStatus = 'cancelled';
    
    // Update trip capacity
    trip.capacity.currentBookings -= booking.numberOfPeople;
    
    // If trip was full, make it available again
    if (trip.status === 'full') {
      trip.status = 'published';
    }

    await trip.save();

    res.status(200).json({
      success: true,
      message: 'Booking cancelled successfully',
      data: {
        bookingId: booking._id,
        refundAmount,
        refundStatus: refundAmount > 0 ? 'processing' : 'not_applicable'
      }
    });
  } catch (error) {
    next(error);
  }
};

// =============================================
// PUBLIC: Get trip by slug
// =============================================
const getTripBySlug = async (req, res, next) => {
  try {
    const { slug } = req.params;

    const trip = await Trip.findOne({
      slug,
      status: { $in: ['published', 'full'] },
      isActive: true
    })
      .populate('organiser', 'firstName lastName email phone organiserProfile.companyName organiserProfile.logo organiserProfile.averageRating organiserProfile.totalReviews organiserProfile.businessPhone')
      .populate('attraction', 'name city category thumbnail description location entryFee')
      .populate('guide', 'firstName lastName guideProfile.experienceYears guideProfile.specializations guideProfile.languagesSpoken guideProfile.averageRating');

    if (!trip) {
      return next(new AppError('Trip not found', 404));
    }

    // Increment view count
    trip.analytics.views += 1;
    await trip.save();

    res.status(200).json({
      success: true,
      data: trip
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getTripsForAttraction,
  getAvailableTrips,
  getTripDetails,
  getTripBySlug,
  bookTrip,
  getMyBookings,
  cancelMyBooking
};