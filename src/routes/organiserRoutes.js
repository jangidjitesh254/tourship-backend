const express = require('express');
const router = express.Router();

const {
  getOrganiserProfile,
  updateOrganiserProfile,
  submitForVerification,
  getAllOrganisers,
  getOrganiserById,
  getOrganiserDashboard,
  createPackage,

  // Trip-related controllers (moved here)
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
} = require('../controllers/organiserController');

const { protect, isOrganiser } = require('../middleware/auth'); // Removed requireVerified for development

// =============================================
// PUBLIC ROUTES
// =============================================
router.get('/all', getAllOrganisers);
router.get('/:id', getOrganiserById);

// =============================================
// PROTECTED ORGANISER ROUTES
// =============================================
router.use(protect);
router.use(isOrganiser);

// Dashboard & Profile
router.get('/me/profile', getOrganiserProfile);
router.put('/me/profile', updateOrganiserProfile);
router.post('/me/submit-verification', submitForVerification);
router.get('/me/dashboard', getOrganiserDashboard);
router.post('/me/packages', createPackage); // You can add requireVerified back later

// Attractions for trip creation
router.get('/attractions', getAdminAttractions);

// Trip Stats & Search
router.get('/trips/stats', getTripStats);
router.get('/search-tourists', searchTourists);

// Trip CRUD & Management
router.post('/trips', createTrip);                    // No requireVerified
router.get('/trips', getMyTrips);
router.get('/trips/:id', getTripById);
router.put('/trips/:id', updateTrip);                 // No requireVerified
router.delete('/trips/:id', deleteTrip);              // No requireVerified

router.put('/trips/:id/publish', publishTrip);        // No requireVerified
router.put('/trips/:id/cancel', cancelTrip);          // No requireVerified

// Guide Management
router.get('/trips/:id/available-guides', getAvailableGuides);
router.put('/trips/:id/assign-guide', assignGuide);   // No requireVerified
router.delete('/trips/:id/remove-guide', removeGuide); // No requireVerified

// Hotel Management
router.post('/trips/:id/hotels', addHotelOptions);    // No requireVerified
router.put('/trips/:tripId/bookings/:bookingId/confirm-hotel', confirmHotelForBooking); // No requireVerified

// Booking Management
router.post('/trips/:id/bookings', addBooking);       // No requireVerified
router.get('/trips/:id/bookings', getTripBookings);
router.put('/trips/:tripId/bookings/:bookingId', updateBooking); // No requireVerified
router.delete('/trips/:tripId/bookings/:bookingId', removeBooking); // No requireVerified

module.exports = router;