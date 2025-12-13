const express = require('express');
const router = express.Router();

const {
  // Admin CRUD
  createAttraction,
  getAllAttractions,
  getAttractionById,
  updateAttraction,
  deleteAttraction,
  
  // Status Management
  toggleActive,
  toggleFeatured,
  updateStatus,
  verifyAttraction,
  
  // Media Management
  addImages,
  removeImage,
  updateThumbnail,
  
  // Details Management
  updateEntryFees,
  updateOpeningHours,
  addEvent,
  removeEvent,
  
  // Statistics
  getAttractionStats,
  getCitySummary,
  
  // Bulk Operations
  bulkUpdate,
  bulkDelete,
  
  // Public Endpoints
  getPublicAttractions,
  getAttractionBySlug,
  getAttractionsByCity,
  getFeaturedAttractions,
  getAvailableCities,
  getCategories
} = require('../controllers/attractionController');

const { protect, isAdmin, requirePermission } = require('../middleware/auth');

// =============================================
// PUBLIC ROUTES (No authentication required)
// =============================================

router.get('/public', getPublicAttractions);
router.get('/public/featured', getFeaturedAttractions);
router.get('/public/cities', getAvailableCities);
router.get('/public/categories', getCategories);
router.get('/public/city/:city', getAttractionsByCity);
router.get('/public/:slug', getAttractionBySlug);

// =============================================
// ADMIN ROUTES (Authentication required)
// =============================================

// Apply authentication middleware for all admin routes below
router.use(protect);
router.use(isAdmin);

// Statistics (place before :id routes)
router.get('/stats', requirePermission('view_analytics', 'manage_attractions'), getAttractionStats);
router.get('/cities-summary', requirePermission('view_analytics', 'manage_attractions'), getCitySummary);

// Bulk Operations
router.put('/bulk-update', requirePermission('manage_attractions'), bulkUpdate);
router.delete('/bulk-delete', requirePermission('manage_attractions', 'full_access'), bulkDelete);

// CRUD Operations
router.post('/', requirePermission('manage_attractions'), createAttraction);
router.get('/', requirePermission('manage_attractions', 'view_analytics'), getAllAttractions);
router.get('/:id', requirePermission('manage_attractions'), getAttractionById);
router.put('/:id', requirePermission('manage_attractions'), updateAttraction);
router.delete('/:id', requirePermission('manage_attractions'), deleteAttraction);

// Status Management
router.put('/:id/toggle-active', requirePermission('manage_attractions'), toggleActive);
router.put('/:id/toggle-featured', requirePermission('manage_attractions'), toggleFeatured);
router.put('/:id/status', requirePermission('manage_attractions'), updateStatus);
router.put('/:id/verify', requirePermission('manage_attractions', 'verify_users'), verifyAttraction);

// Media Management
router.post('/:id/images', requirePermission('manage_attractions'), addImages);
router.delete('/:id/images/:imageIndex', requirePermission('manage_attractions'), removeImage);
router.put('/:id/thumbnail', requirePermission('manage_attractions'), updateThumbnail);

// Details Management
router.put('/:id/entry-fees', requirePermission('manage_attractions'), updateEntryFees);
router.put('/:id/opening-hours', requirePermission('manage_attractions'), updateOpeningHours);
router.post('/:id/events', requirePermission('manage_attractions'), addEvent);
router.delete('/:id/events/:eventIndex', requirePermission('manage_attractions'), removeEvent);

module.exports = router;