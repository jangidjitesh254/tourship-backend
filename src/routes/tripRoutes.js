const express = require('express');
const router = express.Router();

const {
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
  // Stats
  getTripStats,
  searchTourists,
  // Attractions
  getAdminAttractions
} = require('../controllers/tripController');

const { protect, isOrganiser, requireVerified } = require('../middleware/auth');

// All routes require authentication and organiser role
router.use(protect);
router.use(isOrganiser);

// ===================
// STATS & SEARCH (Place before :id routes to avoid conflicts)
// ===================
router.get('/trips/stats', getTripStats);
router.get('/search-tourists', searchTourists);

// ===================
// ATTRACTIONS (for trip creation)
// Organisers can view admin-created attractions to create trips
// ===================
router.get('/attractions', getAdminAttractions);

// ===================
// TRIP CRUD
// ===================
// Create trip - requires verified organiser, must link to admin attraction
router.post('/trips', requireVerified, createTrip);

// Get all my trips (with filters)
router.get('/trips', getMyTrips);

// Get single trip details
router.get('/trips/:id', getTripById);

// Update trip
router.put('/trips/:id', requireVerified, updateTrip);

// Delete trip (only if no confirmed bookings)
router.delete('/trips/:id', requireVerified, deleteTrip);

// ===================
// TRIP STATUS MANAGEMENT
// ===================
// Publish trip (make it visible to users)
router.put('/trips/:id/publish', requireVerified, publishTrip);

// Cancel trip
router.put('/trips/:id/cancel', requireVerified, cancelTrip);

// ===================
// GUIDE ASSIGNMENT
// ===================
// Get available guides for a trip
router.get('/trips/:id/available-guides', getAvailableGuides);

// Assign guide to trip
router.put('/trips/:id/assign-guide', requireVerified, assignGuide);

// Remove guide from trip
router.delete('/trips/:id/remove-guide', requireVerified, removeGuide);

// ===================
// HOTEL MANAGEMENT
// ===================
// Add hotel options to trip (top 3 or more)
router.post('/trips/:id/hotels', requireVerified, addHotelOptions);

// Confirm hotel for a booking
router.put('/trips/:tripId/bookings/:bookingId/confirm-hotel', requireVerified, confirmHotelForBooking);

// ===================
// BOOKING MANAGEMENT (Assign users to trips)
// ===================
// Add user booking to trip
router.post('/trips/:id/bookings', requireVerified, addBooking);

// Get all bookings for a trip
router.get('/trips/:id/bookings', getTripBookings);

// Update booking status/payment
router.put('/trips/:tripId/bookings/:bookingId', requireVerified, updateBooking);

// Cancel/Remove booking
router.delete('/trips/:tripId/bookings/:bookingId', requireVerified, removeBooking);

module.exports = router;