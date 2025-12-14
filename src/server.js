const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// Import middleware
const { errorHandler, notFound } = require('./middleware/errorHandler');

const app = express();

// ===================
// DATABASE CONNECTION
// ===================
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ Database Connection Error: ${error.message}`);
    process.exit(1);
  }
};

connectDB();

// ===================
// MIDDLEWARE
// ===================

// Security
app.use(helmet());

// CORS
app.use(cors({
  origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : ['http://localhost:3000', 'http://localhost:5173'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    success: false,
    message: 'Too many requests, please try again later.'
  }
});
app.use('/api', limiter);

// Body Parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging (development only)
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Static files
app.use('/uploads', express.static('public/uploads'));

// ===================
// DIAGNOSTIC ROUTE LOADING
// ===================
console.log('\n🔍 Checking route files...\n');

// Helper to safely load routes
const safeLoadRoute = (name, path) => {
  try {
    const route = require(path);
    
    // Check if it's a valid router/function
    if (typeof route === 'function') {
      console.log(`✅ ${name}: OK (function/router)`);
      return route;
    } else if (route && typeof route === 'object') {
      // Check if it's a router object
      if (route.stack || route.use) {
        console.log(`✅ ${name}: OK (router object)`);
        return route;
      } else {
        console.log(`❌ ${name}: PROBLEM - Exported object but not a router`);
        console.log(`   Keys found: ${Object.keys(route).join(', ')}`);
        return null;
      }
    } else {
      console.log(`❌ ${name}: PROBLEM - Exported ${typeof route}`);
      return null;
    }
  } catch (error) {
    console.log(`⚠️ ${name}: NOT FOUND or ERROR - ${error.message}`);
    return null;
  }
};

// Load all routes with diagnostics
const authRoutes = safeLoadRoute('authRoutes', './routes/authRoutes');
const userRoutes = safeLoadRoute('userRoutes', './routes/userRoutes');
const guideRoutes = safeLoadRoute('guideRoutes', './routes/guideRoutes');
const organiserRoutes = safeLoadRoute('organiserRoutes', './routes/organiserRoutes');
const adminRoutes = safeLoadRoute('adminRoutes', './routes/adminRoutes');
const tripRoutes = safeLoadRoute('tripRoutes', './routes/tripRoutes');
const attractionRoutes = safeLoadRoute('attractionRoutes', './routes/attractionRoutes');
const userAttractionRoutes = safeLoadRoute('userAttractionRoutes', './routes/userAttractionRoutes');
const userTripsRoutes = safeLoadRoute('userTripsRoutes', './routes/userTripsRoutes');

console.log('\n');

// ===================
// ROUTES
// ===================

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Tourship API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  });
});

// API Info
app.get('/api', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Welcome to Tourship API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      users: '/api/users',
      guide: '/api/guide',
      organiser: '/api/organiser',
      trips: '/api/organiser/trips',
      admin: '/api/admin',
      attractions: '/api/attractions',
      adminAttractions: '/api/admin/attractions'
    },
    roles: ['tourist', 'guide', 'organiser', 'admin'],
    documentation: '/api/docs'
  });
});

// Mount routes only if they loaded successfully
if (authRoutes) app.use('/api/auth', authRoutes);
if (userRoutes) app.use('/api/users', userRoutes);
if (guideRoutes) app.use('/api/guide', guideRoutes);
if (organiserRoutes) app.use('/api/organiser', organiserRoutes);
if (tripRoutes) app.use('/api/organiser', tripRoutes);
if (adminRoutes) app.use('/api/admin', adminRoutes);
if (attractionRoutes) app.use('/api/admin/attractions', attractionRoutes);
if (userAttractionRoutes) app.use('/api/attractions', userAttractionRoutes);
if (userTripsRoutes) app.use('/api/trips', userTripsRoutes);

// ===================
// ERROR HANDLING
// ===================

// 404 Handler
app.use(notFound);

// Global Error Handler
app.use(errorHandler);

// ===================
// SERVER STARTUP
// ===================

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   🏰 TOURSHIP API SERVER                                  ║
║   Rajasthan Tourism Intelligence System                   ║
║                                                           ║
║   Server running on port: ${PORT}                           ║
║   Environment: ${process.env.NODE_ENV || 'development'}                          ║
║   API URL: http://localhost:${PORT}/api                     ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
  `);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.error(`❌ Unhandled Rejection: ${err.message}`);
  server.close(() => process.exit(1));
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error(`❌ Uncaught Exception: ${err.message}`);
  process.exit(1);
});

module.exports = app;