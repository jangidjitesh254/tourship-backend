const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// ===================
// SUB-SCHEMAS FOR ROLES
// ===================

// Tourist-specific fields
const touristProfileSchema = new mongoose.Schema({
  travelPreferences: [{
    type: String,
    enum: ['solo', 'couple', 'family', 'group', 'adventure', 'luxury', 'budget', 'cultural', 'spiritual']
  }],
  visitedAttractions: [{
    attraction: { type: mongoose.Schema.Types.ObjectId, ref: 'Attraction' },
    visitedAt: { type: Date, default: Date.now },
    rating: { type: Number, min: 1, max: 5 },
    review: String
  }],
  savedItineraries: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Itinerary' }],
  bookingHistory: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Booking' }],
  loyaltyPoints: { type: Number, default: 0 },
  membershipTier: {
    type: String,
    enum: ['bronze', 'silver', 'gold', 'platinum'],
    default: 'bronze'
  }
}, { _id: false });

// Guide-specific fields
const guideProfileSchema = new mongoose.Schema({
  // Professional Info
  licenseNumber: {
    type: String,
    trim: true
  },
  experienceYears: {
    type: Number,
    min: 0,
    default: 0
  },
  specializations: [{
    type: String,
    enum: ['historical', 'cultural', 'adventure', 'wildlife', 'photography', 'spiritual', 'food', 'architecture', 'desert_safari', 'trekking']
  }],
  languagesSpoken: [{
    language: {
      type: String,
      enum: ['english', 'hindi', 'rajasthani', 'german', 'french', 'spanish', 'japanese', 'chinese', 'russian', 'italian', 'other']
    },
    proficiency: {
      type: String,
      enum: ['basic', 'conversational', 'fluent', 'native']
    }
  }],
  
  // Service Areas
  operatingDistricts: [{
    type: String,
    enum: ['jaipur', 'udaipur', 'jodhpur', 'jaisalmer', 'pushkar', 'mount_abu', 'bikaner', 'ajmer', 'kota', 'bharatpur']
  }],
  
  // Pricing
  hourlyRate: { type: Number, min: 0, default: 500 },
  dailyRate: { type: Number, min: 0, default: 3000 },
  currency: { type: String, default: 'INR' },
  
  // Availability
  availability: {
    monday: { available: { type: Boolean, default: true }, slots: [String] },
    tuesday: { available: { type: Boolean, default: true }, slots: [String] },
    wednesday: { available: { type: Boolean, default: true }, slots: [String] },
    thursday: { available: { type: Boolean, default: true }, slots: [String] },
    friday: { available: { type: Boolean, default: true }, slots: [String] },
    saturday: { available: { type: Boolean, default: true }, slots: [String] },
    sunday: { available: { type: Boolean, default: true }, slots: [String] }
  },
  
  // Verification & Documents
  isVerified: { type: Boolean, default: false },
  verificationStatus: {
    type: String,
    enum: ['pending', 'under_review', 'approved', 'rejected'],
    default: 'pending'
  },
  verifiedAt: Date,
  verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  rejectionReason: String,
  documents: {
    idProof: { url: String, verified: { type: Boolean, default: false } },
    license: { url: String, verified: { type: Boolean, default: false } },
    certificate: { url: String, verified: { type: Boolean, default: false } },
    photo: { url: String, verified: { type: Boolean, default: false } }
  },
  
  // Ratings & Stats
  averageRating: { type: Number, min: 0, max: 5, default: 0 },
  totalReviews: { type: Number, default: 0 },
  totalTours: { type: Number, default: 0 },
  completedTours: { type: Number, default: 0 },
  
  // Bio
  bio: { type: String, maxlength: 1000 },
  tagline: { type: String, maxlength: 150 }
}, { _id: false });

// Organiser-specific fields
const organiserProfileSchema = new mongoose.Schema({
  // Company Info
  companyName: { type: String, trim: true, maxlength: 200 },
  companyType: {
    type: String,
    enum: ['travel_agency', 'tour_operator', 'hotel', 'transport', 'event_organizer', 'destination_management']
  },
  registrationNumber: { type: String, trim: true },
  gstNumber: {
    type: String,
    trim: true,
    match: [/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, 'Invalid GST number']
  },
  
  // Business Details
  establishedYear: { type: Number, min: 1900, max: new Date().getFullYear() },
  employeeCount: { type: String, enum: ['1-10', '11-50', '51-200', '200+'] },
  annualTourists: { type: String, enum: ['0-100', '100-500', '500-2000', '2000-10000', '10000+'] },
  
  // Contact
  businessEmail: { type: String, lowercase: true, trim: true },
  businessPhone: { type: String, trim: true },
  website: { type: String, trim: true },
  
  // Address
  businessAddress: {
    street: String,
    city: String,
    state: { type: String, default: 'Rajasthan' },
    pincode: String,
    country: { type: String, default: 'India' }
  },
  
  // Services
  servicesOffered: [{
    type: String,
    enum: ['guided_tours', 'package_tours', 'custom_itineraries', 'hotel_booking', 'transport', 'event_management', 'corporate_tours', 'wedding_planning', 'adventure_sports', 'cultural_experiences']
  }],
  operatingRegions: [{
    type: String,
    enum: ['jaipur', 'udaipur', 'jodhpur', 'jaisalmer', 'pushkar', 'mount_abu', 'bikaner', 'ajmer', 'all_rajasthan', 'pan_india']
  }],
  
  // Verification
  isVerified: { type: Boolean, default: false },
  verificationStatus: {
    type: String,
    enum: ['pending', 'under_review', 'approved', 'rejected'],
    default: 'pending'
  },
  verifiedAt: Date,
  verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  rejectionReason: String,
  documents: {
    registrationCertificate: { url: String, verified: { type: Boolean, default: false } },
    gstCertificate: { url: String, verified: { type: Boolean, default: false } },
    panCard: { url: String, verified: { type: Boolean, default: false } },
    bankDetails: { url: String, verified: { type: Boolean, default: false } }
  },
  
  // Stats
  activePackages: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Package' }],
  totalPackages: { type: Number, default: 0 },
  totalBookings: { type: Number, default: 0 },
  averageRating: { type: Number, min: 0, max: 5, default: 0 },
  totalReviews: { type: Number, default: 0 },
  
  // Description
  description: { type: String, maxlength: 2000 },
  tagline: { type: String, maxlength: 200 },
  logo: String
}, { _id: false });

// Admin-specific fields
const adminProfileSchema = new mongoose.Schema({
  department: {
    type: String,
    enum: ['operations', 'support', 'marketing', 'technical', 'management', 'super_admin']
  },
  permissions: [{
    type: String,
    enum: [
      'manage_users',
      'manage_guides',
      'manage_organisers',
      'manage_attractions',
      'manage_bookings',
      'view_analytics',
      'manage_content',
      'manage_settings',
      'verify_users',
      'financial_access',
      'full_access'
    ]
  }],
  assignedDistricts: [{
    type: String,
    enum: ['jaipur', 'udaipur', 'jodhpur', 'jaisalmer', 'pushkar', 'mount_abu', 'bikaner', 'ajmer', 'all']
  }]
}, { _id: false });

// ===================
// MAIN USER SCHEMA
// ===================

const userSchema = new mongoose.Schema({
  // Basic Information
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    match: [/^[6-9]\d{9}$/, 'Please provide a valid 10-digit Indian phone number']
  },
  
  // Personal Information
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true,
    maxlength: [50, 'First name cannot exceed 50 characters']
  },
  lastName: {
    type: String,
    trim: true,
    maxlength: [50, 'Last name cannot exceed 50 characters']
  },
  profilePicture: { type: String, default: null },
  dateOfBirth: Date,
  gender: {
    type: String,
    enum: ['male', 'female', 'other', 'prefer_not_to_say'],
    default: 'prefer_not_to_say'
  },

  // Address
  address: {
    street: { type: String, trim: true, maxlength: 200 },
    city: { type: String, trim: true, maxlength: 100 },
    state: { type: String, trim: true, default: 'Rajasthan' },
    pincode: { type: String, match: [/^\d{6}$/, 'Please provide a valid 6-digit pincode'] },
    country: { type: String, default: 'India' }
  },

  // ====================
  // ROLE SYSTEM
  // ====================
  role: {
    type: String,
    enum: ['tourist', 'guide', 'organiser', 'admin'],
    default: 'tourist'
  },
  
  // Role-specific profiles
  touristProfile: touristProfileSchema,
  guideProfile: guideProfileSchema,
  organiserProfile: organiserProfileSchema,
  adminProfile: adminProfileSchema,

  // Common Tourist Info
  nationality: { type: String, default: 'Indian' },
  touristType: {
    type: String,
    enum: ['domestic', 'international'],
    default: 'domestic'
  },
  passportNumber: String,
  preferredLanguage: {
    type: String,
    enum: ['english', 'hindi', 'rajasthani', 'other'],
    default: 'english'
  },

  // Preferences
  preferences: {
    notifications: {
      email: { type: Boolean, default: true },
      sms: { type: Boolean, default: true },
      push: { type: Boolean, default: true }
    },
    interests: [{
      type: String,
      enum: ['forts', 'palaces', 'temples', 'wildlife', 'desert', 'lakes', 'culture', 'food', 'shopping', 'adventure']
    }]
  },

  // Account Status
  isEmailVerified: { type: Boolean, default: false },
  isPhoneVerified: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  isBanned: { type: Boolean, default: false },
  banReason: String,

  // Tokens
  emailVerificationToken: String,
  emailVerificationExpire: Date,
  phoneVerificationOTP: String,
  phoneVerificationExpire: Date,
  passwordResetToken: String,
  passwordResetExpire: Date,

  // Timestamps
  lastLogin: Date,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// ===================
// VIRTUALS
// ===================

userSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName || ''}`.trim();
});

// ===================
// INDEXES
// ===================

userSchema.index({ email: 1 });
userSchema.index({ phone: 1 });
userSchema.index({ role: 1 });
userSchema.index({ 'address.city': 1 });
userSchema.index({ createdAt: -1 });
userSchema.index({ 'guideProfile.operatingDistricts': 1 });
userSchema.index({ 'guideProfile.isVerified': 1 });
userSchema.index({ 'organiserProfile.isVerified': 1 });

// ===================
// MIDDLEWARE
// ===================

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

userSchema.pre('save', function(next) {
  if (this.isNew) {
    switch (this.role) {
      case 'tourist':
        if (!this.touristProfile) this.touristProfile = {};
        break;
      case 'guide':
        if (!this.guideProfile) this.guideProfile = {};
        break;
      case 'organiser':
        if (!this.organiserProfile) this.organiserProfile = {};
        break;
      case 'admin':
        if (!this.adminProfile) this.adminProfile = {};
        break;
    }
  }
  this.updatedAt = Date.now();
  next();
});

// ===================
// METHODS
// ===================

userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.generateAuthToken = function() {
  return jwt.sign(
    { id: this._id, email: this.email, role: this.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '7d' }
  );
};

userSchema.methods.generatePasswordResetToken = function() {
  const crypto = require('crypto');
  const resetToken = crypto.randomBytes(32).toString('hex');
  
  this.passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');
  this.passwordResetExpire = Date.now() + 10 * 60 * 1000;
  
  return resetToken;
};

userSchema.methods.generateOTP = function() {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  this.phoneVerificationOTP = otp;
  this.phoneVerificationExpire = Date.now() + 10 * 60 * 1000;
  return otp;
};

userSchema.methods.hasPermission = function(permission) {
  if (this.role !== 'admin') return false;
  if (this.adminProfile?.permissions?.includes('full_access')) return true;
  return this.adminProfile?.permissions?.includes(permission) || false;
};

// ===================
// STATICS
// ===================

userSchema.statics.findByCredentials = async function(email, password) {
  const user = await this.findOne({ email }).select('+password');
  if (!user) throw new Error('Invalid email or password');
  
  const isMatch = await user.comparePassword(password);
  if (!isMatch) throw new Error('Invalid email or password');
  
  return user;
};

const User = mongoose.model('User', userSchema);

module.exports = User;
