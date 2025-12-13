const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Import database connection
const connectDB = require('./config/database');

// Import routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const guideRoutes = require('./routes/guideRoutes');
const organiserRoutes = require('./routes/organiserRoutes');
const adminRoutes = require('./routes/adminRoutes');
const tripRoutes = require('./routes/tripRoutes');
const attractionRoutes = require('./routes/attractionRoutes');
const userAttractionRoutes = require('./routes/userAttractionRoutes');

// Import error handlers
const { notFound, errorHandler } = require('./middleware/errorHandler');

// Initialize express app
const app = express();

// Connect to database
connectDB();

// ===================
// MIDDLEWARE
// ===================

// Security Headers
app.use(helmet());

// CORS Configuration
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:5174',
  process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps or Postman)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(null, true); // Allow all origins in development
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Rate Limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
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
      attractions: '/api/attractions',
      adminAttractions: '/api/admin/attractions',
      admin: '/api/admin'
    },
    attractionEndpoints: {
      home: 'GET /api/attractions/home',
      list: 'GET /api/attractions',
      search: 'GET /api/attractions/search?q=',
      featured: 'GET /api/attractions/featured',
      popular: 'GET /api/attractions/popular',
      mustVisit: 'GET /api/attractions/must-visit',
      hiddenGems: 'GET /api/attractions/hidden-gems',
      nearby: 'GET /api/attractions/nearby?lat=&lng=',
      cities: 'GET /api/attractions/cities',
      categories: 'GET /api/attractions/categories',
      districts: 'GET /api/attractions/districts',
      byCity: 'GET /api/attractions/city/:city',
      single: 'GET /api/attractions/:slug',
      reviews: 'GET /api/attractions/:slug/reviews'
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
app.use('/api/attractions', userAttractionRoutes);  // User-facing attraction routes
app.use('/api/admin/attractions', attractionRoutes);  // Admin attraction routes

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
  // Close server & exit process
  server.close(() => process.exit(1));
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error(`❌ Uncaught Exception: ${err.message}`);
  process.exit(1);
});

module.exports = app;