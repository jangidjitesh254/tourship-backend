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
// PUBLIC ROUTES (No auth required)
// =============================================

// Get all available trips with filters
router.get('/', getAvailableTrips);

// Get trips for a specific attraction
router.get('/attraction/:attractionId', getTripsForAttraction);

// Get trip by slug (for SEO-friendly URLs)
router.get('/slug/:slug', getTripBySlug);

// Get trip details by ID
router.get('/:id([0-9a-fA-F]{24})', getTripDetails);

// =============================================
// PROTECTED ROUTES (Auth required)
// =============================================

// Book a trip
router.post('/:id/book', protect, bookTrip);

// Get my bookings
router.get('/my/bookings', protect, getMyBookings);

// Cancel my booking
router.put('/:tripId/bookings/:bookingId/cancel', protect, cancelMyBooking);

module.exports = router;