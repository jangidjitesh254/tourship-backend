const express = require('express');
const router = express.Router();

const {
  // Public endpoints
  getAllAttractions,
  getAttractionBySlug,
  getAttractionsByCity,
  getFeaturedAttractions,
  getPopularAttractions,
  getMustVisitAttractions,
  getHiddenGems,
  getNearbyAttractions,
  getCities,
  getCategories,
  getDistricts,
  searchAttractions,
  getAttractionReviews,
  getHomePageData,
  
  // Authenticated endpoints
  addToWishlist,
  removeFromWishlist,
  getWishlist,
  addReview,
  markReviewHelpful
} = require('../controllers/userAttractionController');

const { protect, optionalAuth } = require('../middleware/auth');

// =============================================
// PUBLIC ROUTES (No authentication required)
// =============================================

// Home page data (featured, popular, cities, categories, stats)
router.get('/home', getHomePageData);

// Search
router.get('/search', searchAttractions);

// Featured, Popular, Must Visit, Hidden Gems
router.get('/featured', getFeaturedAttractions);
router.get('/popular', getPopularAttractions);
router.get('/must-visit', getMustVisitAttractions);
router.get('/hidden-gems', getHiddenGems);

// Nearby (requires lat/lng query params)
router.get('/nearby', getNearbyAttractions);

// Cities, Categories, Districts
router.get('/cities', getCities);
router.get('/categories', getCategories);
router.get('/districts', getDistricts);

// Get attractions by city
router.get('/city/:city', getAttractionsByCity);

// Get attraction reviews
router.get('/:slug/reviews', getAttractionReviews);

// Get single attraction by slug (must be after other routes with path params)
router.get('/:slug', getAttractionBySlug);

// Get all attractions with filters
router.get('/', getAllAttractions);

// =============================================
// AUTHENTICATED ROUTES (Require login)
// =============================================

// Wishlist
router.get('/user/wishlist', protect, getWishlist);
router.post('/:id/wishlist', protect, addToWishlist);
router.delete('/:id/wishlist', protect, removeFromWishlist);

// Reviews
router.post('/:slug/reviews', protect, addReview);
router.post('/:slug/reviews/:reviewId/helpful', protect, markReviewHelpful);

module.exports = router;