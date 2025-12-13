const express = require('express');
const router = express.Router();

const {
  getOrganiserProfile,
  updateOrganiserProfile,
  submitForVerification,
  getAllOrganisers,
  getOrganiserById,
  getOrganiserDashboard,
  createPackage
} = require('../controllers/organiserController');

const { protect, isOrganiser, requireVerified } = require('../middleware/auth');

// Public routes
router.get('/all', getAllOrganisers);
router.get('/:id', getOrganiserById);

// Protected routes (Organiser only)
router.use(protect);
router.use(isOrganiser);

router.get('/me/profile', getOrganiserProfile);
router.put('/me/profile', updateOrganiserProfile);
router.post('/me/submit-verification', submitForVerification);
router.get('/me/dashboard', getOrganiserDashboard);

// Routes requiring verification
router.post('/me/packages', requireVerified, createPackage);

module.exports = router;
