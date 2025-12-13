const mongoose = require('mongoose');

// Review Schema
const reviewSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  title: {
    type: String,
    maxlength: 100
  },
  comment: {
    type: String,
    maxlength: 1000
  },
  photos: [{
    url: String,
    caption: String
  }],
  visitDate: Date,
  visitType: {
    type: String,
    enum: ['solo', 'couple', 'family', 'friends', 'business', 'school_trip']
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  helpfulCount: {
    type: Number,
    default: 0
  }
}, { timestamps: true });

// Opening Hours Schema
const openingHoursSchema = new mongoose.Schema({
  day: {
    type: String,
    enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
    required: true
  },
  isOpen: {
    type: Boolean,
    default: true
  },
  openTime: String,  // "09:00"
  closeTime: String, // "18:00"
  breakStart: String, // "13:00" (lunch break)
  breakEnd: String    // "14:00"
}, { _id: false });

// Entry Fee Schema
const entryFeeSchema = new mongoose.Schema({
  category: {
    type: String,
    enum: ['indian_adult', 'indian_child', 'indian_senior', 'indian_student', 
           'foreign_adult', 'foreign_child', 'foreign_student',
           'camera', 'video_camera', 'tripod', 'drone', 'guide'],
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    default: 'INR'
  },
  description: String
}, { _id: false });

// Event Schema
const eventSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  description: String,
  startDate: Date,
  endDate: Date,
  timing: String,
  isRecurring: {
    type: Boolean,
    default: false
  },
  recurringType: {
    type: String,
    enum: ['daily', 'weekly', 'monthly', 'yearly']
  },
  entryFee: Number,
  image: String
}, { _id: false });

// Main Attraction Schema
const attractionSchema = new mongoose.Schema({
  // =================== BASIC INFO ===================
  name: {
    type: String,
    required: [true, 'Attraction name is required'],
    trim: true,
    maxlength: [200, 'Name cannot exceed 200 characters']
  },
  slug: {
    type: String,
    unique: true
  },
  alternateName: {
    type: String,
    maxlength: 200
  },
  shortDescription: {
    type: String,
    required: [true, 'Short description is required'],
    maxlength: [500, 'Short description cannot exceed 500 characters']
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    maxlength: [10000, 'Description cannot exceed 10000 characters']
  },
  
  // =================== LOCATION ===================
  location: {
    address: {
      type: String,
      required: true
    },
    landmark: String,
    city: {
      type: String,
      required: [true, 'City is required'],
      index: true
    },
    district: {
      type: String,
      enum: ['jaipur', 'udaipur', 'jodhpur', 'jaisalmer', 'pushkar', 'mount_abu', 
             'bikaner', 'ajmer', 'kota', 'bharatpur', 'alwar', 'chittorgarh',
             'bundi', 'sawai_madhopur', 'sikar', 'jhunjhunu', 'nagaur', 'pali',
             'barmer', 'jalore', 'sirohi', 'rajsamand', 'bhilwara', 'tonk',
             'dausa', 'karauli', 'dholpur', 'baran', 'jhalawar', 'pratapgarh',
             'banswara', 'dungarpur', 'other'],
      index: true
    },
    state: {
      type: String,
      default: 'Rajasthan'
    },
    country: {
      type: String,
      default: 'India'
    },
    pincode: String,
    coordinates: {
      latitude: {
        type: Number,
        required: true
      },
      longitude: {
        type: Number,
        required: true
      }
    },
    googleMapsUrl: String,
    googlePlaceId: String
  },

  // =================== CATEGORIZATION ===================
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: ['fort', 'palace', 'temple', 'mosque', 'church', 'gurudwara', 
           'museum', 'lake', 'garden', 'wildlife_sanctuary', 'national_park',
           'hill_station', 'desert', 'waterfall', 'cave', 'stepwell', 'cenotaph',
           'haveli', 'market', 'monument', 'heritage_site', 'adventure_spot',
           'theme_park', 'zoo', 'aquarium', 'beach', 'viewpoint', 'other'],
    index: true
  },
  subCategory: String,
  tags: [{
    type: String,
    lowercase: true
  }],
  
  // UNESCO & Heritage Status
  isUNESCOSite: {
    type: Boolean,
    default: false
  },
  unescoDetails: {
    inscriptionYear: Number,
    criteria: [String],
    description: String
  },
  isASIProtected: {
    type: Boolean,
    default: false
  },
  heritageGrade: {
    type: String,
    enum: ['grade_1', 'grade_2a', 'grade_2b', 'grade_3', 'ungraded']
  },

  // =================== MEDIA ===================
  thumbnail: {
    url: {
      type: String,
      required: [true, 'Thumbnail is required']
    },
    altText: String
  },
  images: [{
    url: {
      type: String,
      required: true
    },
    caption: String,
    altText: String,
    category: {
      type: String,
      enum: ['exterior', 'interior', 'aerial', 'night', 'historical', 'art', 'architecture', 'panorama', 'other']
    },
    isPrimary: {
      type: Boolean,
      default: false
    },
    photographer: String,
    takenAt: Date
  }],
  videos: [{
    url: String,
    title: String,
    type: {
      type: String,
      enum: ['youtube', 'vimeo', 'local', 'other']
    },
    duration: String,
    thumbnail: String
  }],
  virtualTour: {
    url: String,
    provider: String, // Google Street View, Matterport, etc.
    isAvailable: {
      type: Boolean,
      default: false
    }
  },
  audioGuide: {
    url: String,
    duration: String,
    languages: [String],
    isAvailable: {
      type: Boolean,
      default: false
    }
  },

  // =================== TIMING & PRICING ===================
  openingHours: [openingHoursSchema],
  
  specialTimings: {
    ramadan: String,
    holidays: String,
    summer: String,
    winter: String,
    monsoon: String
  },
  
  closedOn: [{
    type: String,
    enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday', 'public_holidays', 'holi', 'diwali']
  }],
  
  entryFees: [entryFeeSchema],
  
  isFreeEntry: {
    type: Boolean,
    default: false
  },
  
  freeEntryDays: [{
    type: String,
    enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday', 'national_holidays', 'world_heritage_day', 'world_tourism_day']
  }],

  // =================== VISIT INFO ===================
  bestTimeToVisit: {
    months: [{
      type: String,
      enum: ['january', 'february', 'march', 'april', 'may', 'june', 
             'july', 'august', 'september', 'october', 'november', 'december']
    }],
    season: {
      type: String,
      enum: ['summer', 'monsoon', 'winter', 'all_year']
    },
    timeOfDay: {
      type: String,
      enum: ['morning', 'afternoon', 'evening', 'night', 'sunrise', 'sunset', 'anytime']
    },
    description: String
  },
  
  recommendedDuration: {
    minimum: {
      type: Number, // in minutes
      default: 60
    },
    maximum: {
      type: Number,
      default: 180
    },
    ideal: {
      type: Number,
      default: 120
    },
    description: String
  },
  
  difficulty: {
    type: String,
    enum: ['easy', 'moderate', 'challenging', 'difficult'],
    default: 'easy'
  },

  // =================== HISTORICAL INFO ===================
  history: {
    type: String,
    maxlength: 10000
  },
  builtBy: String,
  builtIn: {
    year: Number,
    century: String,
    era: String,
    description: String
  },
  architectureStyle: [{
    type: String,
    enum: ['rajput', 'mughal', 'indo_islamic', 'indo_saracenic', 'colonial', 
           'modern', 'traditional', 'buddhist', 'jain', 'hindu', 'other']
  }],
  architect: String,
  significance: {
    type: String,
    maxlength: 2000
  },
  legends: [{
    title: String,
    story: String
  }],
  famousFor: [String],

  // =================== FACILITIES ===================
  facilities: {
    parking: {
      available: { type: Boolean, default: false },
      type: { type: String, enum: ['free', 'paid', 'valet'] },
      capacity: Number,
      fee: Number
    },
    restrooms: {
      available: { type: Boolean, default: false },
      wheelchairAccessible: { type: Boolean, default: false }
    },
    drinkingWater: { type: Boolean, default: false },
    cafeteria: {
      available: { type: Boolean, default: false },
      name: String,
      type: { type: String, enum: ['veg', 'non_veg', 'both'] }
    },
    giftShop: { type: Boolean, default: false },
    cloakRoom: { type: Boolean, default: false },
    lockers: { type: Boolean, default: false },
    atm: { type: Boolean, default: false },
    wifi: { type: Boolean, default: false },
    firstAid: { type: Boolean, default: false },
    wheelchairAccessible: { type: Boolean, default: false },
    wheelchairRental: { type: Boolean, default: false },
    babyChangingRoom: { type: Boolean, default: false },
    petFriendly: { type: Boolean, default: false },
    guidedTours: {
      available: { type: Boolean, default: false },
      languages: [String],
      fee: Number,
      duration: String
    },
    audioGuideRental: {
      available: { type: Boolean, default: false },
      languages: [String],
      fee: Number
    },
    photographyAllowed: { type: Boolean, default: true },
    videographyAllowed: { type: Boolean, default: true },
    droneAllowed: { type: Boolean, default: false },
    tripodAllowed: { type: Boolean, default: false }
  },

  // =================== HOW TO REACH ===================
  howToReach: {
    byAir: {
      nearestAirport: String,
      distance: String,
      description: String
    },
    byTrain: {
      nearestStation: String,
      distance: String,
      description: String
    },
    byBus: {
      nearestBusStand: String,
      distance: String,
      description: String
    },
    byCar: {
      description: String,
      parkingInfo: String
    },
    localTransport: {
      autoAvailable: { type: Boolean, default: true },
      taxiAvailable: { type: Boolean, default: true },
      busAvailable: { type: Boolean, default: false },
      metroAvailable: { type: Boolean, default: false },
      description: String
    }
  },

  // =================== NEARBY ===================
  nearbyAttractions: [{
    attraction: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Attraction'
    },
    distance: String,
    travelTime: String
  }],
  
  nearbyHotels: [{
    name: String,
    distance: String,
    priceRange: String,
    rating: Number,
    bookingUrl: String
  }],
  
  nearbyRestaurants: [{
    name: String,
    cuisine: String,
    distance: String,
    priceRange: String,
    rating: Number
  }],

  // =================== EVENTS & SHOWS ===================
  events: [eventSchema],
  
  lightAndSoundShow: {
    available: { type: Boolean, default: false },
    timings: [{
      language: String,
      time: String,
      duration: String
    }],
    fee: Number,
    description: String
  },

  // =================== TIPS & INFO ===================
  visitorTips: [{
    tip: String,
    category: {
      type: String,
      enum: ['must_know', 'photography', 'timing', 'budget', 'safety', 'clothing', 'food', 'other']
    }
  }],
  
  dressCode: {
    required: { type: Boolean, default: false },
    description: String,
    restrictions: [String]
  },
  
  thingsToCarry: [String],
  
  restrictions: [{
    item: String,
    description: String
  }],
  
  safetyInfo: {
    type: String,
    maxlength: 1000
  },

  // =================== CONTACT ===================
  contact: {
    phone: [String],
    email: String,
    website: String,
    bookingUrl: String,
    socialMedia: {
      facebook: String,
      instagram: String,
      twitter: String,
      youtube: String
    }
  },

  // =================== SEO & META ===================
  seo: {
    metaTitle: {
      type: String,
      maxlength: 70
    },
    metaDescription: {
      type: String,
      maxlength: 160
    },
    keywords: [String],
    canonicalUrl: String
  },

  // =================== RATINGS & REVIEWS ===================
  reviews: [reviewSchema],
  
  ratings: {
    overall: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    totalReviews: {
      type: Number,
      default: 0
    },
    distribution: {
      five: { type: Number, default: 0 },
      four: { type: Number, default: 0 },
      three: { type: Number, default: 0 },
      two: { type: Number, default: 0 },
      one: { type: Number, default: 0 }
    },
    aspects: {
      cleanliness: { type: Number, default: 0 },
      accessibility: { type: Number, default: 0 },
      valueForMoney: { type: Number, default: 0 },
      facilities: { type: Number, default: 0 },
      crowdManagement: { type: Number, default: 0 }
    }
  },

  // =================== STATUS & FLAGS ===================
  status: {
    type: String,
    enum: ['open', 'closed', 'temporarily_closed', 'under_renovation', 'seasonal'],
    default: 'open'
  },
  closureReason: String,
  reopeningDate: Date,
  
  isActive: {
    type: Boolean,
    default: true
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  isPopular: {
    type: Boolean,
    default: false
  },
  isMustVisit: {
    type: Boolean,
    default: false
  },
  isHiddenGem: {
    type: Boolean,
    default: false
  },

  // =================== ANALYTICS ===================
  analytics: {
    viewCount: {
      type: Number,
      default: 0
    },
    wishlistCount: {
      type: Number,
      default: 0
    },
    shareCount: {
      type: Number,
      default: 0
    },
    bookingCount: {
      type: Number,
      default: 0
    },
    popularityScore: {
      type: Number,
      default: 0
    }
  },

  // =================== ADMIN ===================
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  verifiedAt: Date,
  
  // Internal notes (not shown to public)
  adminNotes: {
    type: String,
    maxlength: 2000
  }

}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// =================== VIRTUALS ===================

attractionSchema.virtual('formattedAddress').get(function() {
  const loc = this.location;
  return `${loc.address}, ${loc.city}, ${loc.state} ${loc.pincode || ''}`.trim();
});

attractionSchema.virtual('isCurrentlyOpen').get(function() {
  if (this.status !== 'open') return false;
  
  const now = new Date();
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const today = days[now.getDay()];
  
  const todayHours = this.openingHours.find(h => h.day === today);
  if (!todayHours || !todayHours.isOpen) return false;
  
  const currentTime = now.getHours() * 100 + now.getMinutes();
  const openTime = parseInt(todayHours.openTime?.replace(':', '') || '0');
  const closeTime = parseInt(todayHours.closeTime?.replace(':', '') || '2359');
  
  return currentTime >= openTime && currentTime <= closeTime;
});

attractionSchema.virtual('averageEntryFee').get(function() {
  const indianAdult = this.entryFees.find(f => f.category === 'indian_adult');
  return indianAdult?.amount || 0;
});

// =================== INDEXES ===================

attractionSchema.index({ slug: 1 });
attractionSchema.index({ 'location.city': 1 });
attractionSchema.index({ 'location.district': 1 });
attractionSchema.index({ category: 1 });
attractionSchema.index({ tags: 1 });
attractionSchema.index({ 'ratings.overall': -1 });
attractionSchema.index({ 'analytics.popularityScore': -1 });
attractionSchema.index({ isActive: 1, status: 1 });
attractionSchema.index({ isFeatured: 1 });
attractionSchema.index({ isPopular: 1 });
attractionSchema.index({ 
  'location.coordinates.latitude': 1, 
  'location.coordinates.longitude': 1 
});
attractionSchema.index({ 
  name: 'text', 
  'location.city': 'text', 
  tags: 'text',
  description: 'text'
});

// =================== PRE-SAVE MIDDLEWARE ===================

attractionSchema.pre('save', function(next) {
  // Generate slug
  if (this.isNew || this.isModified('name')) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') + '-' + this.location.city.toLowerCase();
  }
  
  // Calculate popularity score
  this.analytics.popularityScore = 
    (this.ratings.overall * 20) +
    (this.analytics.viewCount * 0.01) +
    (this.analytics.wishlistCount * 0.5) +
    (this.ratings.totalReviews * 2) +
    (this.isFeatured ? 50 : 0) +
    (this.isUNESCOSite ? 100 : 0);
  
  next();
});

// =================== METHODS ===================

attractionSchema.methods.calculateRatings = function() {
  if (this.reviews.length === 0) {
    this.ratings.overall = 0;
    this.ratings.totalReviews = 0;
    return;
  }
  
  const total = this.reviews.reduce((sum, review) => sum + review.rating, 0);
  this.ratings.overall = (total / this.reviews.length).toFixed(1);
  this.ratings.totalReviews = this.reviews.length;
  
  // Calculate distribution
  this.ratings.distribution = {
    five: this.reviews.filter(r => r.rating === 5).length,
    four: this.reviews.filter(r => r.rating === 4).length,
    three: this.reviews.filter(r => r.rating === 3).length,
    two: this.reviews.filter(r => r.rating === 2).length,
    one: this.reviews.filter(r => r.rating === 1).length
  };
};

attractionSchema.methods.incrementView = function() {
  this.analytics.viewCount += 1;
  return this.save();
};

// =================== STATICS ===================

attractionSchema.statics.getByCity = function(city) {
  return this.find({ 
    'location.city': new RegExp(city, 'i'),
    isActive: true,
    status: 'open'
  }).sort({ 'analytics.popularityScore': -1 });
};

attractionSchema.statics.getFeatured = function(limit = 10) {
  return this.find({ 
    isActive: true, 
    isFeatured: true,
    status: 'open'
  })
  .limit(limit)
  .sort({ 'analytics.popularityScore': -1 });
};

attractionSchema.statics.getNearby = function(lat, lng, maxDistance = 10000) {
  return this.find({
    isActive: true,
    status: 'open',
    'location.coordinates.latitude': {
      $gte: lat - 0.1,
      $lte: lat + 0.1
    },
    'location.coordinates.longitude': {
      $gte: lng - 0.1,
      $lte: lng + 0.1
    }
  });
};

const Attraction = mongoose.model('Attraction', attractionSchema);

module.exports = Attraction;