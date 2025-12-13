const express = require('express');
const router = express.Router();

const {
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  banUser,
  getPendingVerifications,
  verifyGuide,
  verifyOrganiser,
  getDashboardStats,
  getRegistrationAnalytics,
  getUserCounts,
  getRecentActivity,
  searchUsers,
  exportUsers,
  createAdmin
} = require('../controllers/adminController');

const { protect, isAdmin, requirePermission } = require('../middleware/auth');

// All admin routes require authentication and admin role
router.use(protect);
router.use(isAdmin);

// Dashboard & Analytics
router.get('/dashboard', getDashboardStats);
router.get('/analytics/registrations', requirePermission('view_analytics'), getRegistrationAnalytics);
router.get('/activity', requirePermission('view_analytics'), getRecentActivity);

// User Management
router.get('/users', requirePermission('manage_users', 'view_analytics'), getAllUsers);
router.get('/users/counts', requirePermission('view_analytics'), getUserCounts);
router.get('/users/search', requirePermission('manage_users'), searchUsers);
router.get('/users/export', requirePermission('manage_users', 'full_access'), exportUsers);
router.get('/users/:id', requirePermission('manage_users'), getUserById);
router.put('/users/:id', requirePermission('manage_users'), updateUser);
router.delete('/users/:id', requirePermission('manage_users'), deleteUser);
router.put('/users/:id/ban', requirePermission('manage_users'), banUser);

// Verification Management
router.get('/verifications/pending', requirePermission('verify_users', 'manage_guides', 'manage_organisers'), getPendingVerifications);
router.put('/verify/guide/:id', requirePermission('verify_users', 'manage_guides'), verifyGuide);
router.put('/verify/organiser/:id', requirePermission('verify_users', 'manage_organisers'), verifyOrganiser);

// Admin Management (Super Admin only)
router.post('/create-admin', requirePermission('full_access'), createAdmin);

module.exports = router;