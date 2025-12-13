const Attraction = require('../models/Attraction');
const User = require('../models/User');
const { AppError } = require('../middleware/errorHandler');

// =============================================
// PUBLIC ENDPOINTS (No Auth Required)
// =============================================

// @desc    Get all attractions (public listing)
// @route   GET /api/attractions
// @access  Public
const getAllAttractions = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 12;
    const skip = (page - 1) * limit;

    // Base query - only active and open attractions
    const query = { 
      isActive: true,
      status: { $in: ['open', 'seasonal'] }
    };

    // Filter by city
    if (req.query.city) {
      query['location.city'] = new RegExp(req.query.city, 'i');
    }

    // Filter by district
    if (req.query.district) {
      query['location.district'] = req.query.district.toLowerCase();
    }

    // Filter by category
    if (req.query.category) {
      query.category = req.query.category;
    }

    // Filter by multiple categories
    if (req.query.categories) {
      const categories = req.query.categories.split(',');
      query.category = { $in: categories };
    }

    // Filter featured only
    if (req.query.featured === 'true') {
      query.isFeatured = true;
    }

    // Filter UNESCO sites
    if (req.query.unesco === 'true') {
      query.isUNESCOSite = true;
    }

    // Filter free entry
    if (req.query.freeEntry === 'true') {
      query.isFreeEntry = true;
    }

    // Filter must visit
    if (req.query.mustVisit === 'true') {
      query.isMustVisit = true;
    }

    // Filter hidden gems
    if (req.query.hiddenGem === 'true') {
      query.isHiddenGem = true;
    }

    // Filter by minimum rating
    if (req.query.minRating) {
      query['ratings.overall'] = { $gte: parseFloat(req.query.minRating) };
    }

    // Filter by best season
    if (req.query.season) {
      query['bestTimeToVisit.season'] = req.query.season;
    }

    // Search by text
    if (req.query.search) {
      query.$or = [
        { name: new RegExp(req.query.search, 'i') },
        { 'location.city': new RegExp(req.query.search, 'i') },
        { tags: new RegExp(req.query.search, 'i') },
        { shortDescription: new RegExp(req.query.search, 'i') }
      ];
    }

    // Full text search
    if (req.query.q) {
      query.$text = { $search: req.query.q };
    }

    // Sort options
    let sortOption = { 'analytics.popularityScore': -1 }; // Default: popularity
    
    switch (req.query.sortBy) {
      case 'rating':
        sortOption = { 'ratings.overall': -1 };
        break;
      case 'rating_asc':
        sortOption = { 'ratings.overall': 1 };
        break;
      case 'name':
        sortOption = { name: 1 };
        break;
      case 'name_desc':
        sortOption = { name: -1 };
        break;
      case 'newest':
        sortOption = { createdAt: -1 };
        break;
      case 'views':
        sortOption = { 'analytics.viewCount': -1 };
        break;
      case 'reviews':
        sortOption = { 'ratings.totalReviews': -1 };
        break;
      default:
        sortOption = { 'analytics.popularityScore': -1 };
    }

    // Execute query
    const attractions = await Attraction.find(query)
      .select('name slug shortDescription thumbnail location category ratings.overall ratings.totalReviews recommendedDuration isFreeEntry isUNESCOSite isFeatured isMustVisit tags bestTimeToVisit.season')
      .skip(skip)
      .limit(limit)
      .sort(sortOption)
      .lean();

    const total = await Attraction.countDocuments(query);

    // Format response
    const formattedAttractions = attractions.map(attr => ({
      id: attr._id,
      name: attr.name,
      slug: attr.slug,
      shortDescription: attr.shortDescription,
      thumbnail: attr.thumbnail?.url,
      city: attr.location?.city,
      district: attr.location?.district,
      category: attr.category,
      rating: attr.ratings?.overall || 0,
      reviewCount: attr.ratings?.totalReviews || 0,
      duration: attr.recommendedDuration?.ideal || 120,
      isFreeEntry: attr.isFreeEntry,
      isUNESCO: attr.isUNESCOSite,
      isFeatured: attr.isFeatured,
      isMustVisit: attr.isMustVisit,
      tags: attr.tags || [],
      bestSeason: attr.bestTimeToVisit?.season
    }));

    res.status(200).json({
      success: true,
      data: {
        attractions: formattedAttractions,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single attraction by slug
// @route   GET /api/attractions/:slug
// @access  Public
const getAttractionBySlug = async (req, res, next) => {
  try {
    const { slug } = req.params;

    const attraction = await Attraction.findOne({
      slug: slug,
      isActive: true
    })
    .populate('nearbyAttractions.attraction', 'name slug thumbnail location.city ratings.overall category')
    .select('-adminNotes -createdBy -updatedBy -verifiedBy')
    .lean();

    if (!attraction) {
      return next(new AppError('Attraction not found', 404));
    }

    // Increment view count (fire and forget)
    Attraction.findByIdAndUpdate(attraction._id, {
      $inc: { 'analytics.viewCount': 1 }
    }).exec();

    // Format response
    const formattedAttraction = {
      id: attraction._id,
      name: attraction.name,
      slug: attraction.slug,
      alternateName: attraction.alternateName,
      shortDescription: attraction.shortDescription,
      description: attraction.description,
      
      // Location
      location: {
        address: attraction.location?.address,
        landmark: attraction.location?.landmark,
        city: attraction.location?.city,
        district: attraction.location?.district,
        state: attraction.location?.state,
        pincode: attraction.location?.pincode,
        coordinates: attraction.location?.coordinates,
        googleMapsUrl: attraction.location?.googleMapsUrl
      },
      
      // Category & Tags
      category: attraction.category,
      tags: attraction.tags,
      
      // UNESCO
      isUNESCO: attraction.isUNESCOSite,
      unescoDetails: attraction.unescoDetails,
      
      // Media
      thumbnail: attraction.thumbnail,
      images: attraction.images,
      videos: attraction.videos,
      virtualTour: attraction.virtualTour,
      audioGuide: attraction.audioGuide,
      
      // Timing
      openingHours: attraction.openingHours,
      specialTimings: attraction.specialTimings,
      closedOn: attraction.closedOn,
      status: attraction.status,
      
      // Pricing
      entryFees: attraction.entryFees,
      isFreeEntry: attraction.isFreeEntry,
      freeEntryDays: attraction.freeEntryDays,
      
      // Visit Info
      bestTimeToVisit: attraction.bestTimeToVisit,
      recommendedDuration: attraction.recommendedDuration,
      difficulty: attraction.difficulty,
      
      // History
      history: attraction.history,
      builtBy: attraction.builtBy,
      builtIn: attraction.builtIn,
      architectureStyle: attraction.architectureStyle,
      significance: attraction.significance,
      legends: attraction.legends,
      famousFor: attraction.famousFor,
      
      // Facilities
      facilities: attraction.facilities,
      
      // How to Reach
      howToReach: attraction.howToReach,
      
      // Nearby
      nearbyAttractions: attraction.nearbyAttractions?.map(n => ({
        id: n.attraction?._id,
        name: n.attraction?.name,
        slug: n.attraction?.slug,
        thumbnail: n.attraction?.thumbnail?.url,
        city: n.attraction?.location?.city,
        rating: n.attraction?.ratings?.overall,
        category: n.attraction?.category,
        distance: n.distance,
        travelTime: n.travelTime
      })),
      nearbyHotels: attraction.nearbyHotels,
      nearbyRestaurants: attraction.nearbyRestaurants,
      
      // Events
      events: attraction.events,
      lightAndSoundShow: attraction.lightAndSoundShow,
      
      // Tips
      visitorTips: attraction.visitorTips,
      dressCode: attraction.dressCode,
      thingsToCarry: attraction.thingsToCarry,
      restrictions: attraction.restrictions,
      safetyInfo: attraction.safetyInfo,
      
      // Contact
      contact: attraction.contact,
      
      // Ratings
      ratings: {
        overall: attraction.ratings?.overall || 0,
        totalReviews: attraction.ratings?.totalReviews || 0,
        distribution: attraction.ratings?.distribution,
        aspects: attraction.ratings?.aspects
      },
      
      // Flags
      isFeatured: attraction.isFeatured,
      isMustVisit: attraction.isMustVisit,
      isHiddenGem: attraction.isHiddenGem,
      
      // Analytics
      viewCount: attraction.analytics?.viewCount || 0,
      
      // SEO
      seo: attraction.seo
    };

    res.status(200).json({
      success: true,
      data: formattedAttraction
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get attractions by city
// @route   GET /api/attractions/city/:city
// @access  Public
const getAttractionsByCity = async (req, res, next) => {
  try {
    const { city } = req.params;
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 12;
    const skip = (page - 1) * limit;

    const query = {
      'location.city': new RegExp(`^${city}$`, 'i'),
      isActive: true,
      status: { $in: ['open', 'seasonal'] }
    };

    // Additional filters
    if (req.query.category) {
      query.category = req.query.category;
    }

    const attractions = await Attraction.find(query)
      .select('name slug shortDescription thumbnail location category ratings.overall ratings.totalReviews recommendedDuration isFreeEntry isUNESCOSite tags')
      .skip(skip)
      .limit(limit)
      .sort({ 'analytics.popularityScore': -1 })
      .lean();

    const total = await Attraction.countDocuments(query);

    // Get city stats
    const cityStats = await Attraction.aggregate([
      { $match: { 'location.city': new RegExp(`^${city}$`, 'i'), isActive: true } },
      {
        $group: {
          _id: null,
          totalAttractions: { $sum: 1 },
          avgRating: { $avg: '$ratings.overall' },
          categories: { $addToSet: '$category' },
          unescoCount: { $sum: { $cond: ['$isUNESCOSite', 1, 0] } },
          freeEntryCount: { $sum: { $cond: ['$isFreeEntry', 1, 0] } }
        }
      }
    ]);

    const stats = cityStats[0] || {};

    res.status(200).json({
      success: true,
      data: {
        city: city,
        stats: {
          total: stats.totalAttractions || 0,
          avgRating: stats.avgRating?.toFixed(1) || 0,
          categories: stats.categories || [],
          unescoSites: stats.unescoCount || 0,
          freeEntryPlaces: stats.freeEntryCount || 0
        },
        attractions: attractions.map(attr => ({
          id: attr._id,
          name: attr.name,
          slug: attr.slug,
          shortDescription: attr.shortDescription,
          thumbnail: attr.thumbnail?.url,
          category: attr.category,
          rating: attr.ratings?.overall || 0,
          reviewCount: attr.ratings?.totalReviews || 0,
          duration: attr.recommendedDuration?.ideal,
          isFreeEntry: attr.isFreeEntry,
          isUNESCO: attr.isUNESCOSite,
          tags: attr.tags
        })),
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get featured attractions
// @route   GET /api/attractions/featured
// @access  Public
const getFeaturedAttractions = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 8;

    const attractions = await Attraction.find({
      isActive: true,
      status: 'open',
      isFeatured: true
    })
    .select('name slug shortDescription thumbnail location category ratings.overall isUNESCOSite')
    .limit(limit)
    .sort({ 'analytics.popularityScore': -1 })
    .lean();

    res.status(200).json({
      success: true,
      data: attractions.map(attr => ({
        id: attr._id,
        name: attr.name,
        slug: attr.slug,
        shortDescription: attr.shortDescription,
        thumbnail: attr.thumbnail?.url,
        city: attr.location?.city,
        category: attr.category,
        rating: attr.ratings?.overall || 0,
        isUNESCO: attr.isUNESCOSite
      }))
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get popular attractions
// @route   GET /api/attractions/popular
// @access  Public
const getPopularAttractions = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 10;
    const city = req.query.city;

    const query = {
      isActive: true,
      status: 'open'
    };

    if (city) {
      query['location.city'] = new RegExp(city, 'i');
    }

    const attractions = await Attraction.find(query)
      .select('name slug shortDescription thumbnail location category ratings.overall ratings.totalReviews analytics.viewCount')
      .limit(limit)
      .sort({ 'analytics.popularityScore': -1 })
      .lean();

    res.status(200).json({
      success: true,
      data: attractions.map(attr => ({
        id: attr._id,
        name: attr.name,
        slug: attr.slug,
        shortDescription: attr.shortDescription,
        thumbnail: attr.thumbnail?.url,
        city: attr.location?.city,
        category: attr.category,
        rating: attr.ratings?.overall || 0,
        reviewCount: attr.ratings?.totalReviews || 0,
        viewCount: attr.analytics?.viewCount || 0
      }))
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get must visit attractions
// @route   GET /api/attractions/must-visit
// @access  Public
const getMustVisitAttractions = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 10;

    const attractions = await Attraction.find({
      isActive: true,
      status: 'open',
      isMustVisit: true
    })
    .select('name slug shortDescription thumbnail location category ratings.overall isUNESCOSite')
    .limit(limit)
    .sort({ 'ratings.overall': -1 })
    .lean();

    res.status(200).json({
      success: true,
      data: attractions.map(attr => ({
        id: attr._id,
        name: attr.name,
        slug: attr.slug,
        shortDescription: attr.shortDescription,
        thumbnail: attr.thumbnail?.url,
        city: attr.location?.city,
        category: attr.category,
        rating: attr.ratings?.overall || 0,
        isUNESCO: attr.isUNESCOSite
      }))
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get hidden gems
// @route   GET /api/attractions/hidden-gems
// @access  Public
const getHiddenGems = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 10;

    const attractions = await Attraction.find({
      isActive: true,
      status: 'open',
      isHiddenGem: true
    })
    .select('name slug shortDescription thumbnail location category ratings.overall')
    .limit(limit)
    .sort({ 'ratings.overall': -1 })
    .lean();

    res.status(200).json({
      success: true,
      data: attractions.map(attr => ({
        id: attr._id,
        name: attr.name,
        slug: attr.slug,
        shortDescription: attr.shortDescription,
        thumbnail: attr.thumbnail?.url,
        city: attr.location?.city,
        category: attr.category,
        rating: attr.ratings?.overall || 0
      }))
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get nearby attractions
// @route   GET /api/attractions/nearby
// @access  Public
const getNearbyAttractions = async (req, res, next) => {
  try {
    const { lat, lng, radius = 10 } = req.query; // radius in km

    if (!lat || !lng) {
      return next(new AppError('Please provide latitude and longitude', 400));
    }

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);
    const radiusInDegrees = radius / 111; // Approximate conversion

    const attractions = await Attraction.find({
      isActive: true,
      status: 'open',
      'location.coordinates.latitude': {
        $gte: latitude - radiusInDegrees,
        $lte: latitude + radiusInDegrees
      },
      'location.coordinates.longitude': {
        $gte: longitude - radiusInDegrees,
        $lte: longitude + radiusInDegrees
      }
    })
    .select('name slug shortDescription thumbnail location category ratings.overall')
    .limit(20)
    .lean();

    // Calculate distance for each attraction
    const attractionsWithDistance = attractions.map(attr => {
      const attrLat = attr.location?.coordinates?.latitude;
      const attrLng = attr.location?.coordinates?.longitude;
      
      // Haversine formula for distance
      const R = 6371; // Earth's radius in km
      const dLat = (attrLat - latitude) * Math.PI / 180;
      const dLng = (attrLng - longitude) * Math.PI / 180;
      const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(latitude * Math.PI / 180) * Math.cos(attrLat * Math.PI / 180) *
                Math.sin(dLng/2) * Math.sin(dLng/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      const distance = R * c;

      return {
        id: attr._id,
        name: attr.name,
        slug: attr.slug,
        shortDescription: attr.shortDescription,
        thumbnail: attr.thumbnail?.url,
        city: attr.location?.city,
        category: attr.category,
        rating: attr.ratings?.overall || 0,
        distance: distance.toFixed(1) + ' km',
        distanceValue: distance
      };
    });

    // Sort by distance
    attractionsWithDistance.sort((a, b) => a.distanceValue - b.distanceValue);

    res.status(200).json({
      success: true,
      data: attractionsWithDistance
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all cities with attractions
// @route   GET /api/attractions/cities
// @access  Public
const getCities = async (req, res, next) => {
  try {
    const cities = await Attraction.aggregate([
      { $match: { isActive: true, status: 'open' } },
      {
        $group: {
          _id: '$location.city',
          district: { $first: '$location.district' },
          count: { $sum: 1 },
          avgRating: { $avg: '$ratings.overall' },
          thumbnail: { $first: '$thumbnail.url' },
          unescoCount: { $sum: { $cond: ['$isUNESCOSite', 1, 0] } }
        }
      },
      { $match: { _id: { $ne: null } } },
      { $sort: { count: -1 } }
    ]);

    res.status(200).json({
      success: true,
      data: cities.map(city => ({
        name: city._id,
        district: city.district,
        attractionsCount: city.count,
        avgRating: city.avgRating?.toFixed(1) || 0,
        thumbnail: city.thumbnail,
        unescoSites: city.unescoCount
      })),
      total: cities.length
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all categories with counts
// @route   GET /api/attractions/categories
// @access  Public
const getCategories = async (req, res, next) => {
  try {
    const categories = await Attraction.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          avgRating: { $avg: '$ratings.overall' }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // Category labels
    const categoryLabels = {
      fort: { label: 'Forts', icon: '🏰' },
      palace: { label: 'Palaces', icon: '👑' },
      temple: { label: 'Temples', icon: '🛕' },
      mosque: { label: 'Mosques', icon: '🕌' },
      church: { label: 'Churches', icon: '⛪' },
      gurudwara: { label: 'Gurudwaras', icon: '🙏' },
      museum: { label: 'Museums', icon: '🏛️' },
      lake: { label: 'Lakes', icon: '💧' },
      garden: { label: 'Gardens', icon: '🌳' },
      wildlife_sanctuary: { label: 'Wildlife Sanctuaries', icon: '🦁' },
      national_park: { label: 'National Parks', icon: '🌲' },
      desert: { label: 'Deserts', icon: '🏜️' },
      stepwell: { label: 'Stepwells', icon: '🪜' },
      haveli: { label: 'Havelis', icon: '🏠' },
      monument: { label: 'Monuments', icon: '🗿' },
      heritage_site: { label: 'Heritage Sites', icon: '🏛️' },
      market: { label: 'Markets', icon: '🛒' },
      waterfall: { label: 'Waterfalls', icon: '💦' },
      cave: { label: 'Caves', icon: '🕳️' },
      hill_station: { label: 'Hill Stations', icon: '⛰️' },
      other: { label: 'Other', icon: '📍' }
    };

    res.status(200).json({
      success: true,
      data: categories.map(cat => ({
        id: cat._id,
        name: cat._id,
        label: categoryLabels[cat._id]?.label || cat._id,
        icon: categoryLabels[cat._id]?.icon || '📍',
        count: cat.count,
        avgRating: cat.avgRating?.toFixed(1) || 0
      }))
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get districts with counts
// @route   GET /api/attractions/districts
// @access  Public
const getDistricts = async (req, res, next) => {
  try {
    const districts = await Attraction.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: '$location.district',
          count: { $sum: 1 },
          cities: { $addToSet: '$location.city' },
          thumbnail: { $first: '$thumbnail.url' }
        }
      },
      { $match: { _id: { $ne: null } } },
      { $sort: { count: -1 } }
    ]);

    res.status(200).json({
      success: true,
      data: districts.map(d => ({
        name: d._id,
        label: d._id.charAt(0).toUpperCase() + d._id.slice(1).replace(/_/g, ' '),
        count: d.count,
        cities: d.cities,
        thumbnail: d.thumbnail
      }))
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Search attractions
// @route   GET /api/attractions/search
// @access  Public
const searchAttractions = async (req, res, next) => {
  try {
    const { q, limit = 10 } = req.query;

    if (!q || q.length < 2) {
      return res.status(200).json({
        success: true,
        data: []
      });
    }

    const attractions = await Attraction.find({
      isActive: true,
      $or: [
        { name: new RegExp(q, 'i') },
        { 'location.city': new RegExp(q, 'i') },
        { tags: new RegExp(q, 'i') },
        { category: new RegExp(q, 'i') }
      ]
    })
    .select('name slug thumbnail location.city category')
    .limit(parseInt(limit))
    .lean();

    res.status(200).json({
      success: true,
      data: attractions.map(attr => ({
        id: attr._id,
        name: attr.name,
        slug: attr.slug,
        thumbnail: attr.thumbnail?.url,
        city: attr.location?.city,
        category: attr.category
      }))
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get attraction reviews
// @route   GET /api/attractions/:slug/reviews
// @access  Public
const getAttractionReviews = async (req, res, next) => {
  try {
    const { slug } = req.params;
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    const attraction = await Attraction.findOne({ slug, isActive: true })
      .select('reviews ratings')
      .populate('reviews.user', 'firstName lastName profilePicture')
      .lean();

    if (!attraction) {
      return next(new AppError('Attraction not found', 404));
    }

    // Sort reviews by newest first
    const sortedReviews = attraction.reviews
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const paginatedReviews = sortedReviews.slice(skip, skip + limit);

    res.status(200).json({
      success: true,
      data: {
        ratings: attraction.ratings,
        reviews: paginatedReviews.map(review => ({
          id: review._id,
          user: {
            name: `${review.user?.firstName || 'Anonymous'} ${review.user?.lastName?.[0] || ''}`.trim(),
            avatar: review.user?.profilePicture
          },
          rating: review.rating,
          title: review.title,
          comment: review.comment,
          photos: review.photos,
          visitDate: review.visitDate,
          visitType: review.visitType,
          isVerified: review.isVerified,
          helpfulCount: review.helpfulCount,
          createdAt: review.createdAt
        })),
        pagination: {
          page,
          limit,
          total: attraction.reviews.length,
          pages: Math.ceil(attraction.reviews.length / limit)
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// =============================================
// AUTHENTICATED USER ENDPOINTS
// =============================================

// @desc    Add attraction to wishlist
// @route   POST /api/attractions/:id/wishlist
// @access  Private
const addToWishlist = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const attraction = await Attraction.findById(id);
    if (!attraction) {
      return next(new AppError('Attraction not found', 404));
    }

    // Check if user has touristProfile
    const user = await User.findById(userId);
    if (!user.touristProfile) {
      user.touristProfile = { wishlist: [] };
    }
    if (!user.touristProfile.wishlist) {
      user.touristProfile.wishlist = [];
    }

    // Check if already in wishlist
    if (user.touristProfile.wishlist.includes(id)) {
      return res.status(200).json({
        success: true,
        message: 'Already in wishlist'
      });
    }

    user.touristProfile.wishlist.push(id);
    await user.save();

    // Increment wishlist count
    attraction.analytics.wishlistCount += 1;
    await attraction.save();

    res.status(200).json({
      success: true,
      message: 'Added to wishlist'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Remove from wishlist
// @route   DELETE /api/attractions/:id/wishlist
// @access  Private
const removeFromWishlist = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const user = await User.findById(userId);
    if (!user.touristProfile?.wishlist) {
      return next(new AppError('Wishlist not found', 404));
    }

    user.touristProfile.wishlist = user.touristProfile.wishlist.filter(
      attractionId => attractionId.toString() !== id
    );
    await user.save();

    // Decrement wishlist count
    await Attraction.findByIdAndUpdate(id, {
      $inc: { 'analytics.wishlistCount': -1 }
    });

    res.status(200).json({
      success: true,
      message: 'Removed from wishlist'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user's wishlist
// @route   GET /api/attractions/wishlist
// @access  Private
const getWishlist = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const user = await User.findById(userId)
      .populate({
        path: 'touristProfile.wishlist',
        select: 'name slug thumbnail location category ratings.overall'
      });

    const wishlist = user.touristProfile?.wishlist || [];

    res.status(200).json({
      success: true,
      data: wishlist.map(attr => ({
        id: attr._id,
        name: attr.name,
        slug: attr.slug,
        thumbnail: attr.thumbnail?.url,
        city: attr.location?.city,
        category: attr.category,
        rating: attr.ratings?.overall || 0
      }))
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Add review to attraction
// @route   POST /api/attractions/:slug/reviews
// @access  Private
const addReview = async (req, res, next) => {
  try {
    const { slug } = req.params;
    const { rating, title, comment, photos, visitDate, visitType } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return next(new AppError('Please provide a rating between 1 and 5', 400));
    }

    const attraction = await Attraction.findOne({ slug, isActive: true });
    if (!attraction) {
      return next(new AppError('Attraction not found', 404));
    }

    // Check if user already reviewed
    const existingReview = attraction.reviews.find(
      r => r.user.toString() === req.user.id
    );
    if (existingReview) {
      return next(new AppError('You have already reviewed this attraction', 400));
    }

    // Add review
    attraction.reviews.push({
      user: req.user.id,
      rating,
      title,
      comment,
      photos: photos || [],
      visitDate,
      visitType,
      isVerified: false
    });

    // Recalculate ratings
    attraction.calculateRatings();
    await attraction.save();

    res.status(201).json({
      success: true,
      message: 'Review added successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark review as helpful
// @route   POST /api/attractions/:slug/reviews/:reviewId/helpful
// @access  Private
const markReviewHelpful = async (req, res, next) => {
  try {
    const { slug, reviewId } = req.params;

    const attraction = await Attraction.findOne({ slug });
    if (!attraction) {
      return next(new AppError('Attraction not found', 404));
    }

    const review = attraction.reviews.id(reviewId);
    if (!review) {
      return next(new AppError('Review not found', 404));
    }

    review.helpfulCount += 1;
    await attraction.save();

    res.status(200).json({
      success: true,
      message: 'Marked as helpful',
      helpfulCount: review.helpfulCount
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get home page data
// @route   GET /api/attractions/home
// @access  Public
const getHomePageData = async (req, res, next) => {
  try {
    // Featured attractions
    const featured = await Attraction.find({
      isActive: true,
      status: 'open',
      isFeatured: true
    })
    .select('name slug shortDescription thumbnail location category ratings.overall isUNESCOSite')
    .limit(6)
    .sort({ 'analytics.popularityScore': -1 })
    .lean();

    // Popular attractions
    const popular = await Attraction.find({
      isActive: true,
      status: 'open'
    })
    .select('name slug thumbnail location category ratings.overall')
    .limit(8)
    .sort({ 'analytics.popularityScore': -1 })
    .lean();

    // Top cities
    const cities = await Attraction.aggregate([
      { $match: { isActive: true, status: 'open' } },
      {
        $group: {
          _id: '$location.city',
          count: { $sum: 1 },
          thumbnail: { $first: '$thumbnail.url' }
        }
      },
      { $match: { _id: { $ne: null } } },
      { $sort: { count: -1 } },
      { $limit: 6 }
    ]);

    // Categories with counts
    const categories = await Attraction.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 8 }
    ]);

    // Stats
    const stats = await Attraction.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: null,
          totalAttractions: { $sum: 1 },
          totalCities: { $addToSet: '$location.city' },
          unescoSites: { $sum: { $cond: ['$isUNESCOSite', 1, 0] } }
        }
      }
    ]);

    const categoryLabels = {
      fort: '🏰 Forts', palace: '👑 Palaces', temple: '🛕 Temples',
      museum: '🏛️ Museums', lake: '💧 Lakes', garden: '🌳 Gardens'
    };

    res.status(200).json({
      success: true,
      data: {
        featured: featured.map(attr => ({
          id: attr._id,
          name: attr.name,
          slug: attr.slug,
          shortDescription: attr.shortDescription,
          thumbnail: attr.thumbnail?.url,
          city: attr.location?.city,
          category: attr.category,
          rating: attr.ratings?.overall || 0,
          isUNESCO: attr.isUNESCOSite
        })),
        popular: popular.map(attr => ({
          id: attr._id,
          name: attr.name,
          slug: attr.slug,
          thumbnail: attr.thumbnail?.url,
          city: attr.location?.city,
          category: attr.category,
          rating: attr.ratings?.overall || 0
        })),
        cities: cities.map(city => ({
          name: city._id,
          count: city.count,
          thumbnail: city.thumbnail
        })),
        categories: categories.map(cat => ({
          id: cat._id,
          label: categoryLabels[cat._id] || cat._id,
          count: cat.count
        })),
        stats: {
          totalAttractions: stats[0]?.totalAttractions || 0,
          totalCities: stats[0]?.totalCities?.length || 0,
          unescoSites: stats[0]?.unescoSites || 0
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  // Public
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
  
  // Authenticated
  addToWishlist,
  removeFromWishlist,
  getWishlist,
  addReview,
  markReviewHelpful
};