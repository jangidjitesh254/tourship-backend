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
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
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
// IMPORT ROUTES
// ===================
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const guideRoutes = require('./routes/guideRoutes');
const organiserRoutes = require('./routes/organiserRoutes');
const adminRoutes = require('./routes/adminRoutes');
const tripRoutes = require('./routes/tripRoutes');

// Optional routes - only import if they exist
let attractionRoutes = null;
let userAttractionRoutes = null;

try {
  attractionRoutes = require('./routes/attractionRoutes');
} catch (e) {
  console.log('⚠️ attractionRoutes not found, skipping...');
}

try {
  userAttractionRoutes = require('./routes/userAttractionRoutes');
} catch (e) {
  console.log('⚠️ userAttractionRoutes not found, skipping...');
}

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

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/guide', guideRoutes);
app.use('/api/organiser', organiserRoutes);
app.use('/api/organiser', tripRoutes);  // Trip routes under organiser
app.use('/api/admin', adminRoutes);

// Mount attraction routes if they exist
if (attractionRoutes) {
  app.use('/api/admin/attractions', attractionRoutes);
}
if (userAttractionRoutes) {
  app.use('/api/attractions', userAttractionRoutes);
}

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