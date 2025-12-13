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
    duration: String
  }],
  meals: {
    breakfast: { type: Boolean, default: false },
    lunch: { type: Boolean, default: false },
    dinner: { type: Boolean, default: false }
  },
  accommodation: {
    name: String,
    type: { type: String, enum: ['hotel', 'resort', 'homestay', 'camp', 'heritage', 'other'] },
    location: String
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
  totalAmount: {
    type: Number,
    required: true
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'partial', 'completed', 'refunded', 'cancelled'],
    default: 'pending'
  },
  bookingStatus: {
    type: String,
    enum: ['pending', 'confirmed', 'cancelled', 'completed'],
    default: 'pending'
  },
  specialRequests: String,
  contactPhone: String,
  contactEmail: String
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
    unique: true
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
  
  // Organiser (Creator)
  organiser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Assigned Guide
  assignedGuide: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  guideAssignedAt: Date,
  guideStatus: {
    type: String,
    enum: ['not_assigned', 'pending', 'accepted', 'rejected'],
    default: 'not_assigned'
  },
  guideRejectionReason: String,
  
  // Trip Type & Category
  tripType: {
    type: String,
    enum: ['group', 'private', 'custom', 'corporate', 'educational', 'adventure'],
    default: 'group'
  },
  categories: [{
    type: String,
    enum: ['heritage', 'wildlife', 'desert', 'spiritual', 'adventure', 'cultural', 'photography', 'food', 'luxury', 'budget', 'family', 'honeymoon']
  }],
  
  // Location Details
  destinations: [{
    name: {
      type: String,
      required: true
    },
    district: {
      type: String,
      enum: ['jaipur', 'udaipur', 'jodhpur', 'jaisalmer', 'pushkar', 'mount_abu', 'bikaner', 'ajmer', 'kota', 'bharatpur', 'other']
    },
    stayDuration: String,
    highlights: [String]
  }],
  startLocation: {
    name: String,
    address: String,
    coordinates: {
      lat: Number,
      lng: Number
    }
  },
  endLocation: {
    name: String,
    address: String,
    coordinates: {
      lat: Number,
      lng: Number
    }
  },
  
  // Duration & Schedule
  duration: {
    days: {
      type: Number,
      required: true,
      min: 1
    },
    nights: {
      type: Number,
      required: true,
      min: 0
    }
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  reportingTime: String,
  departureTime: String,
  
  // Itinerary
  itinerary: [itineraryDaySchema],
  
  // Pricing
  pricing: {
    basePrice: {
      type: Number,
      required: true,
      min: 0
    },
    currency: {
      type: String,
      default: 'INR'
    },
    pricePerPerson: {
      type: Number,
      required: true,
      min: 0
    },
    childPrice: {
      type: Number,
      default: 0
    },
    singleSupplementPrice: {
      type: Number,
      default: 0
    },
    discountPercentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    earlyBirdDiscount: {
      percentage: { type: Number, default: 0 },
      validTill: Date
    }
  },
  
  // Capacity
  capacity: {
    minPeople: {
      type: Number,
      default: 1,
      min: 1
    },
    maxPeople: {
      type: Number,
      required: true,
      min: 1
    },
    currentBookings: {
      type: Number,
      default: 0
    }
  },
  
  // Inclusions & Exclusions
  inclusions: [{
    type: String
  }],
  exclusions: [{
    type: String
  }],
  
  // Media
  images: [{
    url: String,
    caption: String,
    isPrimary: { type: Boolean, default: false }
  }],
  videos: [{
    url: String,
    title: String
  }],
  
  // Bookings
  bookings: [bookingSchema],
  
  // Status
  status: {
    type: String,
    enum: ['draft', 'published', 'cancelled', 'completed', 'full'],
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
  
  // Ratings & Reviews
  averageRating: {
    type: Number,
    min: 0,
    max: 5,
    default: 0
  },
  totalReviews: {
    type: Number,
    default: 0
  },
  
  // Additional Info
  difficulty: {
    type: String,
    enum: ['easy', 'moderate', 'challenging', 'difficult'],
    default: 'easy'
  },
  ageRestriction: {
    minAge: { type: Number, default: 0 },
    maxAge: { type: Number, default: 100 }
  },
  languages: [{
    type: String,
    enum: ['english', 'hindi', 'rajasthani', 'german', 'french', 'spanish', 'other']
  }],
  
  // Policies
  cancellationPolicy: {
    type: String,
    maxlength: 2000
  },
  termsAndConditions: {
    type: String,
    maxlength: 5000
  },
  
  // Metadata
  tags: [String],
  viewCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtuals
tripSchema.virtual('availableSlots').get(function() {
  return this.capacity.maxPeople - this.capacity.currentBookings;
});

tripSchema.virtual('isSoldOut').get(function() {
  return this.capacity.currentBookings >= this.capacity.maxPeople;
});

tripSchema.virtual('discountedPrice').get(function() {
  if (this.pricing.discountPercentage > 0) {
    return this.pricing.pricePerPerson * (1 - this.pricing.discountPercentage / 100);
  }
  return this.pricing.pricePerPerson;
});

tripSchema.virtual('totalBookingsCount').get(function() {
  return this.bookings?.length || 0;
});

// Indexes
tripSchema.index({ organiser: 1 });
tripSchema.index({ assignedGuide: 1 });
tripSchema.index({ status: 1 });
tripSchema.index({ startDate: 1 });
tripSchema.index({ 'destinations.district': 1 });
tripSchema.index({ categories: 1 });
tripSchema.index({ slug: 1 });
tripSchema.index({ createdAt: -1 });

// Generate slug before saving
tripSchema.pre('save', function(next) {
  if (this.isNew || this.isModified('title')) {
    this.slug = this.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') + '-' + Date.now();
  }
  next();
});

// Update status if full
tripSchema.pre('save', function(next) {
  if (this.capacity.currentBookings >= this.capacity.maxPeople) {
    this.status = 'full';
  }
  next();
});

const Trip = mongoose.model('Trip', tripSchema);

module.exports = Trip;