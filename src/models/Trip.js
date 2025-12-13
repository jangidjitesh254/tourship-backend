const mongoose = require('mongoose');

// Itinerary day schema
const itineraryDaySchema = new mongoose.Schema({
  day: {
    type: Number,
    required: true
  },
  title: {
    type: String,
    required: true,
    maxlength: 200
  },
  description: {
    type: String,
    maxlength: 1000
  },
  activities: [{
    time: String,
    activity: String,
    location: String,
    duration: String,
    notes: String
  }],
  meals: {
    breakfast: { included: { type: Boolean, default: false }, venue: String },
    lunch: { included: { type: Boolean, default: false }, venue: String },
    dinner: { included: { type: Boolean, default: false }, venue: String }
  },
  accommodation: {
    hotel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Hotel'
    },
    hotelName: String,
    hotelType: { 
      type: String, 
      enum: ['hotel', 'resort', 'homestay', 'camp', 'heritage', 'dharamshala', 'guest_house', 'other'] 
    },
    roomType: String,
    checkIn: String,
    checkOut: String
  }
}, { _id: false });

// Booking schema for users who book this trip
const bookingSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  bookingDate: {
    type: Date,
    default: Date.now
  },
  numberOfPeople: {
    type: Number,
    required: true,
    min: 1
  },
  travelers: [{
    name: String,
    age: Number,
    gender: String,
    idType: String,
    idNumber: String
  }],
  totalAmount: {
    type: Number,
    required: true
  },
  paidAmount: {
    type: Number,
    default: 0
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'partial', 'completed', 'refunded', 'cancelled'],
    default: 'pending'
  },
  bookingStatus: {
    type: String,
    enum: ['pending', 'confirmed', 'cancelled', 'completed', 'no_show'],
    default: 'pending'
  },
  specialRequests: String,
  contactPhone: String,
  contactEmail: String,
  emergencyContact: {
    name: String,
    phone: String,
    relation: String
  },
  // Hotel selection by user
  selectedHotel: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Hotel'
  },
  hotelStatus: {
    type: String,
    enum: ['pending', 'confirmed', 'not_required'],
    default: 'pending'
  }
}, { timestamps: true });

// Main Trip Schema
const tripSchema = new mongoose.Schema({
  // Basic Info
  title: {
    type: String,
    required: [true, 'Trip title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  slug: {
    type: String,
    unique: true,
    sparse: true
  },
  description: {
    type: String,
    required: [true, 'Trip description is required'],
    maxlength: [5000, 'Description cannot exceed 5000 characters']
  },
  shortDescription: {
    type: String,
    maxlength: [300, 'Short description cannot exceed 300 characters']
  },

  // ============================================
  // ATTRACTION REFERENCE (Admin-created only)
  // ============================================
  attraction: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Attraction',
    required: [true, 'Attraction is required - trips can only be created for admin attractions']
  },
  
  // Multiple attractions for multi-destination trips
  attractions: [{
    attraction: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Attraction'
    },
    visitOrder: Number,
    visitDuration: String, // e.g., "2 hours", "half day"
    notes: String
  }],

  // Trip Type
  tripType: {
    type: String,
    enum: ['single_attraction', 'multi_attraction', 'city_tour', 'multi_city', 'custom'],
    default: 'single_attraction'
  },
  
  categories: [{
    type: String,
    enum: [
      'heritage', 'cultural', 'adventure', 'wildlife', 'pilgrimage',
      'desert_safari', 'lake_tour', 'fort_palace', 'village_tour',
      'photography', 'food_tour', 'shopping', 'honeymoon', 'family',
      'solo', 'group', 'luxury', 'budget', 'weekend', 'long_weekend'
    ]
  }],

  // Destinations (derived from attractions)
  destinations: [{
    name: String,
    city: String,
    district: {
      type: String,
      enum: [
        'jaipur', 'udaipur', 'jodhpur', 'jaisalmer', 'pushkar', 'mount_abu',
        'bikaner', 'ajmer', 'kota', 'bharatpur', 'alwar', 'chittorgarh',
        'bundi', 'sawai_madhopur', 'sikar', 'jhunjhunu', 'nagaur', 'pali',
        'barmer', 'jalore', 'sirohi', 'rajsamand', 'bhilwara', 'tonk',
        'dausa', 'karauli', 'dholpur', 'baran', 'jhalawar', 'pratapgarh',
        'banswara', 'dungarpur', 'other'
      ]
    },
    stayDuration: String,
    coordinates: {
      lat: Number,
      lng: Number
    }
  }],

  // Location Details
  startLocation: {
    name: { type: String, required: true },
    address: String,
    city: String,
    coordinates: {
      lat: Number,
      lng: Number
    },
    meetingPoint: String
  },
  endLocation: {
    name: String,
    address: String,
    city: String,
    coordinates: {
      lat: Number,
      lng: Number
    }
  },

  // Duration
  duration: {
    days: { type: Number, required: true, min: 1 },
    nights: { type: Number, default: 0 }
  },

  // Dates & Timing
  startDate: {
    type: Date,
    required: [true, 'Start date is required']
  },
  endDate: {
    type: Date,
    required: [true, 'End date is required']
  },
  reportingTime: String,
  departureTime: String,

  // Recurring trips
  isRecurring: {
    type: Boolean,
    default: false
  },
  recurringSchedule: {
    frequency: { type: String, enum: ['daily', 'weekly', 'monthly', 'custom'] },
    daysOfWeek: [{ type: Number, min: 0, max: 6 }], // 0 = Sunday
    excludeDates: [Date]
  },

  // Itinerary
  itinerary: [itineraryDaySchema],

  // ============================================
  // PRICING (includes attraction entry fee)
  // ============================================
  pricing: {
    basePrice: {
      type: Number,
      required: [true, 'Base price is required'],
      min: 0
    },
    pricePerPerson: {
      type: Number,
      required: true,
      min: 0
    },
    // Breakdown
    attractionEntryFee: {
      type: Number,
      default: 0
    },
    transportCost: {
      type: Number,
      default: 0
    },
    guideFee: {
      type: Number,
      default: 0
    },
    mealsCost: {
      type: Number,
      default: 0
    },
    accommodationCost: {
      type: Number,
      default: 0
    },
    miscCost: {
      type: Number,
      default: 0
    },
    // Pricing tiers
    childPrice: Number, // For ages 5-12
    infantPrice: Number, // Under 5
    seniorPrice: Number, // 60+
    groupDiscount: {
      minPeople: Number,
      discountPercent: Number
    },
    earlyBirdDiscount: {
      deadline: Date,
      discountPercent: Number
    },
    currency: {
      type: String,
      default: 'INR'
    }
  },

  // Capacity
  capacity: {
    minPeople: { type: Number, default: 1, min: 1 },
    maxPeople: { type: Number, required: true, min: 1 },
    currentBookings: { type: Number, default: 0 },
    availableSlots: Number
  },

  // What's included/excluded
  inclusions: [{
    item: String,
    description: String,
    icon: String
  }],
  exclusions: [{
    item: String,
    description: String
  }],

  // Images
  images: [{
    url: { type: String, required: true },
    caption: String,
    isMain: { type: Boolean, default: false },
    order: Number
  }],
  thumbnail: {
    url: String,
    alt: String
  },

  // Trip difficulty & requirements
  difficulty: {
    type: String,
    enum: ['easy', 'moderate', 'challenging', 'difficult'],
    default: 'easy'
  },
  ageRestriction: {
    minAge: { type: Number, default: 0 },
    maxAge: { type: Number, default: 100 }
  },
  physicalRequirements: String,
  whatToBring: [String],

  // Languages
  languages: [{
    type: String,
    enum: ['english', 'hindi', 'rajasthani', 'gujarati', 'punjabi', 'marathi', 'german', 'french', 'spanish', 'japanese', 'chinese', 'other']
  }],

  // Transport
  transport: {
    type: { 
      type: String, 
      enum: ['ac_bus', 'non_ac_bus', 'tempo_traveller', 'innova', 'sedan', 'suv', 'train', 'flight', 'self', 'mixed'] 
    },
    pickupAvailable: { type: Boolean, default: false },
    pickupLocations: [String],
    dropOffAvailable: { type: Boolean, default: false }
  },

  // ============================================
  // ORGANISER (Creator of the trip)
  // ============================================
  organiser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  // ============================================
  // GUIDE ASSIGNMENT
  // ============================================
  guide: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  guideAssignment: {
    status: {
      type: String,
      enum: ['not_assigned', 'pending', 'accepted', 'rejected'],
      default: 'not_assigned'
    },
    assignedAt: Date,
    respondedAt: Date,
    rejectionReason: String
  },

  // ============================================
  // HOTEL OPTIONS (for user selection)
  // ============================================
  hotelOptions: [{
    hotel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Hotel'
    },
    hotelName: String,
    hotelRating: Number, // 1-5 stars
    roomType: String,
    pricePerNight: Number,
    amenities: [String],
    images: [String],
    isRecommended: { type: Boolean, default: false },
    availableRooms: Number
  }],

  // ============================================
  // BOOKINGS
  // ============================================
  bookings: [bookingSchema],

  // ============================================
  // STATUS & VISIBILITY
  // ============================================
  status: {
    type: String,
    enum: ['draft', 'pending_approval', 'published', 'cancelled', 'completed', 'full', 'expired'],
    default: 'draft'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  visibility: {
    type: String,
    enum: ['public', 'private', 'unlisted'],
    default: 'public'
  },

  // Policies
  cancellationPolicy: {
    type: {
      type: String,
      enum: ['flexible', 'moderate', 'strict', 'non_refundable'],
      default: 'moderate'
    },
    description: String,
    refundRules: [{
      daysBeforeTrip: Number,
      refundPercent: Number
    }]
  },
  termsAndConditions: String,

  // Tags & SEO
  tags: [String],
  metaTitle: String,
  metaDescription: String,

  // Analytics
  analytics: {
    views: { type: Number, default: 0 },
    enquiries: { type: Number, default: 0 },
    bookingsCount: { type: Number, default: 0 },
    revenue: { type: Number, default: 0 },
    avgRating: { type: Number, default: 0 },
    reviewsCount: { type: Number, default: 0 }
  },

  // Reviews
  reviews: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    rating: { type: Number, min: 1, max: 5 },
    title: String,
    comment: String,
    photos: [String],
    isVerified: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
  }]

}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// ============================================
// INDEXES
// ============================================
tripSchema.index({ organiser: 1, status: 1 });
tripSchema.index({ attraction: 1 });
tripSchema.index({ 'attractions.attraction': 1 });
tripSchema.index({ startDate: 1, endDate: 1 });
tripSchema.index({ status: 1, isActive: 1, visibility: 1 });
tripSchema.index({ slug: 1 });
tripSchema.index({ 'destinations.city': 1 });
tripSchema.index({ 'destinations.district': 1 });
tripSchema.index({ categories: 1 });
tripSchema.index({ tags: 1 });

// Text index for search
tripSchema.index({
  title: 'text',
  description: 'text',
  'destinations.name': 'text',
  tags: 'text'
});

// ============================================
// VIRTUALS
// ============================================
tripSchema.virtual('daysUntilStart').get(function() {
  if (!this.startDate) return null;
  const now = new Date();
  const diff = this.startDate - now;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
});

tripSchema.virtual('availableSlotsCount').get(function() {
  return this.capacity.maxPeople - this.capacity.currentBookings;
});

tripSchema.virtual('isFullyBooked').get(function() {
  return this.capacity.currentBookings >= this.capacity.maxPeople;
});

tripSchema.virtual('isTripStarted').get(function() {
  return new Date() >= this.startDate;
});

tripSchema.virtual('isTripEnded').get(function() {
  return new Date() > this.endDate;
});

// ============================================
// PRE-SAVE MIDDLEWARE
// ============================================
tripSchema.pre('save', async function(next) {
  // Generate slug if not exists
  if (!this.slug && this.title) {
    const baseSlug = this.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    
    // Check for existing slugs
    const existingCount = await this.constructor.countDocuments({
      slug: new RegExp(`^${baseSlug}(-\\d+)?$`),
      _id: { $ne: this._id }
    });
    
    this.slug = existingCount > 0 ? `${baseSlug}-${existingCount + 1}` : baseSlug;
  }

  // Calculate available slots
  this.capacity.availableSlots = this.capacity.maxPeople - this.capacity.currentBookings;

  // Auto-update status based on capacity
  if (this.capacity.currentBookings >= this.capacity.maxPeople && this.status === 'published') {
    this.status = 'full';
  }

  // Auto-expire past trips
  if (this.endDate && new Date() > this.endDate && this.status !== 'completed' && this.status !== 'cancelled') {
    this.status = 'expired';
  }

  next();
});

// ============================================
// STATIC METHODS
// ============================================

// Get trips by organiser
tripSchema.statics.getByOrganiser = function(organiserId, options = {}) {
  const query = { organiser: organiserId };
  
  if (options.status) query.status = options.status;
  if (options.isActive !== undefined) query.isActive = options.isActive;
  
  return this.find(query)
    .populate('attraction', 'name city thumbnail entryFee')
    .populate('guide', 'name email phone')
    .sort(options.sort || { createdAt: -1 });
};

// Get trips by attraction
tripSchema.statics.getByAttraction = function(attractionId) {
  return this.find({
    $or: [
      { attraction: attractionId },
      { 'attractions.attraction': attractionId }
    ],
    status: 'published',
    isActive: true
  })
  .populate('organiser', 'name organiserProfile.companyName organiserProfile.logo')
  .sort({ startDate: 1 });
};

// Get available trips
tripSchema.statics.getAvailable = function(filters = {}) {
  const query = {
    status: 'published',
    isActive: true,
    visibility: 'public',
    startDate: { $gt: new Date() },
    $expr: { $lt: ['$capacity.currentBookings', '$capacity.maxPeople'] }
  };

  if (filters.city) {
    query['destinations.city'] = new RegExp(filters.city, 'i');
  }
  if (filters.district) {
    query['destinations.district'] = filters.district;
  }
  if (filters.category) {
    query.categories = filters.category;
  }
  if (filters.minPrice) {
    query['pricing.pricePerPerson'] = { $gte: filters.minPrice };
  }
  if (filters.maxPrice) {
    query['pricing.pricePerPerson'] = { 
      ...query['pricing.pricePerPerson'], 
      $lte: filters.maxPrice 
    };
  }
  if (filters.startDate) {
    query.startDate = { $gte: new Date(filters.startDate) };
  }

  return this.find(query)
    .populate('attraction', 'name city thumbnail category')
    .populate('organiser', 'name organiserProfile.companyName organiserProfile.logo organiserProfile.rating')
    .sort({ startDate: 1 });
};

// ============================================
// INSTANCE METHODS
// ============================================

// Add booking
tripSchema.methods.addBooking = async function(bookingData) {
  if (this.capacity.currentBookings >= this.capacity.maxPeople) {
    throw new Error('Trip is fully booked');
  }

  this.bookings.push(bookingData);
  this.capacity.currentBookings += bookingData.numberOfPeople;
  this.analytics.bookingsCount += 1;
  this.analytics.revenue += bookingData.totalAmount;

  return this.save();
};

// Cancel booking
tripSchema.methods.cancelBooking = async function(bookingId) {
  const booking = this.bookings.id(bookingId);
  if (!booking) {
    throw new Error('Booking not found');
  }

  booking.bookingStatus = 'cancelled';
  this.capacity.currentBookings -= booking.numberOfPeople;
  
  // Reset status if trip was full
  if (this.status === 'full') {
    this.status = 'published';
  }

  return this.save();
};

// Assign guide
tripSchema.methods.assignGuide = async function(guideId) {
  this.guide = guideId;
  this.guideAssignment = {
    status: 'pending',
    assignedAt: new Date()
  };
  return this.save();
};

// Respond to guide assignment
tripSchema.methods.respondToGuideAssignment = async function(accept, reason) {
  this.guideAssignment.status = accept ? 'accepted' : 'rejected';
  this.guideAssignment.respondedAt = new Date();
  if (!accept && reason) {
    this.guideAssignment.rejectionReason = reason;
    this.guide = null;
  }
  return this.save();
};

// Increment view count
tripSchema.methods.incrementViews = async function() {
  this.analytics.views += 1;
  return this.save();
};

const Trip = mongoose.model('Trip', tripSchema);

module.exports = Trip;