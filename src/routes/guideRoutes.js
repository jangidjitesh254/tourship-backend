const express = require('express');
const router = express.Router();

const {
  getGuideProfile,
  updateGuideProfile,
  submitForVerification,
  getAllGuides,
  getGuideById,
  updateAvailability,
  getGuideDashboard,
  getMyAssignedTrips,
  respondToAssignment
} = require('../controllers/guideController');

const { protect, isGuide, requireVerified } = require('../middleware/auth');

// Public routes
router.get('/all', getAllGuides);
router.get('/:id', getGuideById);

// Protected routes (Guide only)
router.use(protect);
router.use(isGuide);

router.get('/me/profile', getGuideProfile);
router.put('/me/profile', updateGuideProfile);
router.post('/me/submit-verification', submitForVerification);
router.put('/me/availability', updateAvailability);
router.get('/me/dashboard', getGuideDashboard);

// Trip Assignment routes
router.get('/me/trips', getMyAssignedTrips);
router.put('/trips/:id/respond', respondToAssignment);

module.exports = router;