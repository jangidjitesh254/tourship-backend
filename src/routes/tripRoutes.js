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
  // Stats
  getTripStats,
  searchTourists
} = require('../controllers/tripController');

const { protect, isOrganiser, requireVerified } = require('../middleware/auth');

// All routes require authentication and organiser role
router.use(protect);
router.use(isOrganiser);

// ===================
// STATS & SEARCH (Place before :id routes)
// ===================
router.get('/trips/stats', getTripStats);
router.get('/search-tourists', searchTourists);

// ===================
// TRIP CRUD
// ===================
router.post('/trips', requireVerified, createTrip);
router.get('/trips', getMyTrips);
router.get('/trips/:id', getTripById);
router.put('/trips/:id', requireVerified, updateTrip);
router.delete('/trips/:id', requireVerified, deleteTrip);

// Trip Status Management
router.put('/trips/:id/publish', requireVerified, publishTrip);
router.put('/trips/:id/cancel', requireVerified, cancelTrip);

// ===================
// GUIDE ASSIGNMENT
// ===================
router.get('/trips/:id/available-guides', getAvailableGuides);
router.put('/trips/:id/assign-guide', requireVerified, assignGuide);
router.delete('/trips/:id/remove-guide', requireVerified, removeGuide);

// ===================
// BOOKING MANAGEMENT (Assign users to trips)
// ===================
router.post('/trips/:id/bookings', requireVerified, addBooking);
router.get('/trips/:id/bookings', getTripBookings);
router.put('/trips/:tripId/bookings/:bookingId', requireVerified, updateBooking);
router.delete('/trips/:tripId/bookings/:bookingId', requireVerified, removeBooking);

module.exports = router;