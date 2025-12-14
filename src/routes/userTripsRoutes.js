const express = require('express');
const router = express.Router();

const {
  getTripsForAttraction,
  getAvailableTrips,
  getTripDetails,
  getTripBySlug,
  bookTrip,
  getMyBookings,
  cancelMyBooking
} = require('../controllers/userTripsController');

const { protect } = require('../middleware/auth');

// =============================================
// PROTECTED ROUTES (Auth required) - Place first to avoid conflicts
// =============================================

// Get my bookings - MUST be before /:id routes
router.get('/my/bookings', protect, getMyBookings);

// Cancel my booking
router.put('/:tripId/bookings/:bookingId/cancel', protect, cancelMyBooking);

// =============================================
// PUBLIC ROUTES (No auth required)
// =============================================

// Get all available trips with filters
router.get('/', getAvailableTrips);

// Get trips for a specific attraction
router.get('/attraction/:attractionId', getTripsForAttraction);

// Get trip by slug (for SEO-friendly URLs)
router.get('/slug/:slug', getTripBySlug);

// Book a trip (requires auth)
router.post('/:id/book', protect, bookTrip);

// Get trip details by ID - MUST be last since it's a catch-all pattern
router.get('/:id([0-9a-fA-F]{24})', getTripDetails);

module.exports = router;