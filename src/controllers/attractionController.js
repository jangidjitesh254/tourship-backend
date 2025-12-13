const Attraction = require('../models/Attraction');
const User = require('../models/User');
const { AppError } = require('../middleware/errorHandler');

// =============================================
// ADMIN CRUD OPERATIONS
// =============================================

// @desc    Create new attraction
// @route   POST /api/admin/attractions
// @access  Private (Admin)
const createAttraction = async (req, res, next) => {
  try {
    const attractionData = {
      ...req.body,
      createdBy: req.user.id
    };

    const attraction = await Attraction.create(attractionData);

    res.status(201).json({
      success: true,
      message: 'Attraction created successfully',
      data: attraction
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all attractions (Admin view with filters)
// @route   GET /api/admin/attractions
// @access  Private (Admin)
const getAllAttractions = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const skip = (page - 1) * limit;

    // Build query
    const query = {};

    // Filter by city
    if (req.query.city) {
      query['location.city'] = new RegExp(req.query.city, 'i');
    }

    // Filter by district
    if (req.query.district) {
      query['location.district'] = req.query.district;
    }

    // Filter by category
    if (req.query.category) {
      query.category = req.query.category;
    }

    // Filter by status
    if (req.query.status) {
      query.status = req.query.status;
    }

    // Filter by active
    if (req.query.isActive !== undefined) {
      query.isActive = req.query.isActive === 'true';
    }

    // Filter by featured
    if (req.query.isFeatured !== undefined) {
      query.isFeatured = req.query.isFeatured === 'true';
    }

    // Filter by UNESCO
    if (req.query.isUNESCO !== undefined) {
      query.isUNESCOSite = req.query.isUNESCO === 'true';
    }

    // Filter by verified
    if (req.query.isVerified !== undefined) {
      query.isVerified = req.query.isVerified === 'true';
    }

    // Search
    if (req.query.search) {
      query.$or = [
        { name: new RegExp(req.query.search, 'i') },
        { 'location.city': new RegExp(req.query.search, 'i') },
        { tags: new RegExp(req.query.search, 'i') }
      ];
    }

    // Sort
    let sortOption = { createdAt: -1 };
    if (req.query.sortBy) {
      const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;
      switch (req.query.sortBy) {
        case 'name':
          sortOption = { name: sortOrder };
          break;
        case 'rating':
          sortOption = { 'ratings.overall': sortOrder };
          break;
        case 'popularity':
          sortOption = { 'analytics.popularityScore': sortOrder };
          break;
        case 'views':
          sortOption = { 'analytics.viewCount': sortOrder };
          break;
        case 'city':
          sortOption = { 'location.city': sortOrder };
          break;
        default:
          sortOption = { createdAt: -1 };
      }
    }

    const attractions = await Attraction.find(query)
      .select('name slug thumbnail location category status isActive isFeatured isVerified ratings.overall analytics.viewCount createdAt')
      .skip(skip)
      .limit(limit)
      .sort(sortOption);

    const total = await Attraction.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        attractions: attractions.map(a => ({
          id: a._id,
          name: a.name,
          slug: a.slug,
          thumbnail: a.thumbnail,
          city: a.location.city,
          district: a.location.district,
          category: a.category,
          status: a.status,
          isActive: a.isActive,
          isFeatured: a.isFeatured,
          isVerified: a.isVerified,
          rating: a.ratings.overall,
          views: a.analytics.viewCount,
          createdAt: a.createdAt
        })),
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

// @desc    Get single attraction (full details)
// @route   GET /api/admin/attractions/:id
// @access  Private (Admin)
const getAttractionById = async (req, res, next) => {
  try {
    const attraction = await Attraction.findById(req.params.id)
      .populate('createdBy', 'firstName lastName email')
      .populate('updatedBy', 'firstName lastName email')
      .populate('verifiedBy', 'firstName lastName email')
      .populate('nearbyAttractions.attraction', 'name slug thumbnail');

    if (!attraction) {
      return next(new AppError('Attraction not found', 404));
    }

    res.status(200).json({
      success: true,
      data: attraction
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update attraction
// @route   PUT /api/admin/attractions/:id
// @access  Private (Admin)
const updateAttraction = async (req, res, next) => {
  try {
    const attraction = await Attraction.findById(req.params.id);

    if (!attraction) {
      return next(new AppError('Attraction not found', 404));
    }

    // Update with new data
    const updatedData = {
      ...req.body,
      updatedBy: req.user.id
    };

    const updatedAttraction = await Attraction.findByIdAndUpdate(
      req.params.id,
      updatedData,
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: 'Attraction updated successfully',
      data: updatedAttraction
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete attraction
// @route   DELETE /api/admin/attractions/:id
// @access  Private (Admin)
const deleteAttraction = async (req, res, next) => {
  try {
    const attraction = await Attraction.findById(req.params.id);

    if (!attraction) {
      return next(new AppError('Attraction not found', 404));
    }

    await Attraction.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Attraction deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// =============================================
// STATUS & FLAGS MANAGEMENT
// =============================================

// @desc    Toggle attraction status (active/inactive)
// @route   PUT /api/admin/attractions/:id/toggle-active
// @access  Private (Admin)
const toggleActive = async (req, res, next) => {
  try {
    const attraction = await Attraction.findById(req.params.id);

    if (!attraction) {
      return next(new AppError('Attraction not found', 404));
    }

    attraction.isActive = !attraction.isActive;
    attraction.updatedBy = req.user.id;
    await attraction.save();

    res.status(200).json({
      success: true,
      message: `Attraction ${attraction.isActive ? 'activated' : 'deactivated'} successfully`,
      data: { isActive: attraction.isActive }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Toggle featured status
// @route   PUT /api/admin/attractions/:id/toggle-featured
// @access  Private (Admin)
const toggleFeatured = async (req, res, next) => {
  try {
    const attraction = await Attraction.findById(req.params.id);

    if (!attraction) {
      return next(new AppError('Attraction not found', 404));
    }

    attraction.isFeatured = !attraction.isFeatured;
    attraction.updatedBy = req.user.id;
    await attraction.save();

    res.status(200).json({
      success: true,
      message: `Attraction ${attraction.isFeatured ? 'featured' : 'unfeatured'} successfully`,
      data: { isFeatured: attraction.isFeatured }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update attraction status (open/closed/renovation)
// @route   PUT /api/admin/attractions/:id/status
// @access  Private (Admin)
const updateStatus = async (req, res, next) => {
  try {
    const { status, closureReason, reopeningDate } = req.body;

    const attraction = await Attraction.findById(req.params.id);

    if (!attraction) {
      return next(new AppError('Attraction not found', 404));
    }

    attraction.status = status;
    if (closureReason) attraction.closureReason = closureReason;
    if (reopeningDate) attraction.reopeningDate = reopeningDate;
    attraction.updatedBy = req.user.id;
    
    await attraction.save();

    res.status(200).json({
      success: true,
      message: 'Attraction status updated successfully',
      data: { 
        status: attraction.status,
        closureReason: attraction.closureReason,
        reopeningDate: attraction.reopeningDate
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Verify attraction
// @route   PUT /api/admin/attractions/:id/verify
// @access  Private (Admin)
const verifyAttraction = async (req, res, next) => {
  try {
    const attraction = await Attraction.findById(req.params.id);

    if (!attraction) {
      return next(new AppError('Attraction not found', 404));
    }

    attraction.isVerified = true;
    attraction.verifiedBy = req.user.id;
    attraction.verifiedAt = Date.now();
    await attraction.save();

    res.status(200).json({
      success: true,
      message: 'Attraction verified successfully',
      data: { 
        isVerified: attraction.isVerified,
        verifiedAt: attraction.verifiedAt
      }
    });
  } catch (error) {
    next(error);
  }
};

// =============================================
// MEDIA MANAGEMENT
// =============================================

// @desc    Add images to attraction
// @route   POST /api/admin/attractions/:id/images
// @access  Private (Admin)
const addImages = async (req, res, next) => {
  try {
    const { images } = req.body; // Array of image objects

    const attraction = await Attraction.findById(req.params.id);

    if (!attraction) {
      return next(new AppError('Attraction not found', 404));
    }

    attraction.images.push(...images);
    attraction.updatedBy = req.user.id;
    await attraction.save();

    res.status(200).json({
      success: true,
      message: 'Images added successfully',
      data: attraction.images
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Remove image from attraction
// @route   DELETE /api/admin/attractions/:id/images/:imageIndex
// @access  Private (Admin)
const removeImage = async (req, res, next) => {
  try {
    const { imageIndex } = req.params;

    const attraction = await Attraction.findById(req.params.id);

    if (!attraction) {
      return next(new AppError('Attraction not found', 404));
    }

    if (imageIndex >= attraction.images.length) {
      return next(new AppError('Image not found', 404));
    }

    attraction.images.splice(imageIndex, 1);
    attraction.updatedBy = req.user.id;
    await attraction.save();

    res.status(200).json({
      success: true,
      message: 'Image removed successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update thumbnail
// @route   PUT /api/admin/attractions/:id/thumbnail
// @access  Private (Admin)
const updateThumbnail = async (req, res, next) => {
  try {
    const { url, altText } = req.body;

    const attraction = await Attraction.findById(req.params.id);

    if (!attraction) {
      return next(new AppError('Attraction not found', 404));
    }

    attraction.thumbnail = { url, altText };
    attraction.updatedBy = req.user.id;
    await attraction.save();

    res.status(200).json({
      success: true,
      message: 'Thumbnail updated successfully',
      data: attraction.thumbnail
    });
  } catch (error) {
    next(error);
  }
};

// =============================================
// ENTRY FEES MANAGEMENT
// =============================================

// @desc    Update entry fees
// @route   PUT /api/admin/attractions/:id/entry-fees
// @access  Private (Admin)
const updateEntryFees = async (req, res, next) => {
  try {
    const { entryFees, isFreeEntry, freeEntryDays } = req.body;

    const attraction = await Attraction.findById(req.params.id);

    if (!attraction) {
      return next(new AppError('Attraction not found', 404));
    }

    if (entryFees) attraction.entryFees = entryFees;
    if (isFreeEntry !== undefined) attraction.isFreeEntry = isFreeEntry;
    if (freeEntryDays) attraction.freeEntryDays = freeEntryDays;
    attraction.updatedBy = req.user.id;
    
    await attraction.save();

    res.status(200).json({
      success: true,
      message: 'Entry fees updated successfully',
      data: {
        entryFees: attraction.entryFees,
        isFreeEntry: attraction.isFreeEntry,
        freeEntryDays: attraction.freeEntryDays
      }
    });
  } catch (error) {
    next(error);
  }
};

// =============================================
// OPENING HOURS MANAGEMENT
// =============================================

// @desc    Update opening hours
// @route   PUT /api/admin/attractions/:id/opening-hours
// @access  Private (Admin)
const updateOpeningHours = async (req, res, next) => {
  try {
    const { openingHours, specialTimings, closedOn } = req.body;

    const attraction = await Attraction.findById(req.params.id);

    if (!attraction) {
      return next(new AppError('Attraction not found', 404));
    }

    if (openingHours) attraction.openingHours = openingHours;
    if (specialTimings) attraction.specialTimings = specialTimings;
    if (closedOn) attraction.closedOn = closedOn;
    attraction.updatedBy = req.user.id;
    
    await attraction.save();

    res.status(200).json({
      success: true,
      message: 'Opening hours updated successfully',
      data: {
        openingHours: attraction.openingHours,
        specialTimings: attraction.specialTimings,
        closedOn: attraction.closedOn
      }
    });
  } catch (error) {
    next(error);
  }
};

// =============================================
// EVENTS MANAGEMENT
// =============================================

// @desc    Add event to attraction
// @route   POST /api/admin/attractions/:id/events
// @access  Private (Admin)
const addEvent = async (req, res, next) => {
  try {
    const eventData = req.body;

    const attraction = await Attraction.findById(req.params.id);

    if (!attraction) {
      return next(new AppError('Attraction not found', 404));
    }

    attraction.events.push(eventData);
    attraction.updatedBy = req.user.id;
    await attraction.save();

    res.status(201).json({
      success: true,
      message: 'Event added successfully',
      data: attraction.events
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Remove event from attraction
// @route   DELETE /api/admin/attractions/:id/events/:eventIndex
// @access  Private (Admin)
const removeEvent = async (req, res, next) => {
  try {
    const { eventIndex } = req.params;

    const attraction = await Attraction.findById(req.params.id);

    if (!attraction) {
      return next(new AppError('Attraction not found', 404));
    }

    if (eventIndex >= attraction.events.length) {
      return next(new AppError('Event not found', 404));
    }

    attraction.events.splice(eventIndex, 1);
    attraction.updatedBy = req.user.id;
    await attraction.save();

    res.status(200).json({
      success: true,
      message: 'Event removed successfully'
    });
  } catch (error) {
    next(error);
  }
};

// =============================================
// STATISTICS & ANALYTICS
// =============================================

// @desc    Get attractions statistics
// @route   GET /api/admin/attractions/stats
// @access  Private (Admin)
const getAttractionStats = async (req, res, next) => {
  try {
    const stats = await Attraction.aggregate([
      {
        $facet: {
          total: [{ $count: 'count' }],
          
          byStatus: [
            { $group: { _id: '$status', count: { $sum: 1 } } }
          ],
          
          byCategory: [
            { $group: { _id: '$category', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 10 }
          ],
          
          byCity: [
            { $group: { _id: '$location.city', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 10 }
          ],
          
          byDistrict: [
            { $group: { _id: '$location.district', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
          ],
          
          featured: [
            { $match: { isFeatured: true } },
            { $count: 'count' }
          ],
          
          unesco: [
            { $match: { isUNESCOSite: true } },
            { $count: 'count' }
          ],
          
          verified: [
            { $match: { isVerified: true } },
            { $count: 'count' }
          ],
          
          active: [
            { $match: { isActive: true } },
            { $count: 'count' }
          ],
          
          totalViews: [
            { $group: { _id: null, total: { $sum: '$analytics.viewCount' } } }
          ],
          
          avgRating: [
            { $match: { 'ratings.overall': { $gt: 0 } } },
            { $group: { _id: null, avg: { $avg: '$ratings.overall' } } }
          ],
          
          topRated: [
            { $match: { isActive: true, 'ratings.overall': { $gt: 0 } } },
            { $sort: { 'ratings.overall': -1 } },
            { $limit: 5 },
            { $project: { name: 1, 'location.city': 1, 'ratings.overall': 1, thumbnail: 1 } }
          ],
          
          mostViewed: [
            { $match: { isActive: true } },
            { $sort: { 'analytics.viewCount': -1 } },
            { $limit: 5 },
            { $project: { name: 1, 'location.city': 1, 'analytics.viewCount': 1, thumbnail: 1 } }
          ],
          
          recentlyAdded: [
            { $sort: { createdAt: -1 } },
            { $limit: 5 },
            { $project: { name: 1, 'location.city': 1, category: 1, createdAt: 1, thumbnail: 1 } }
          ]
        }
      }
    ]);

    const result = stats[0];

    res.status(200).json({
      success: true,
      data: {
        overview: {
          total: result.total[0]?.count || 0,
          active: result.active[0]?.count || 0,
          featured: result.featured[0]?.count || 0,
          unesco: result.unesco[0]?.count || 0,
          verified: result.verified[0]?.count || 0,
          totalViews: result.totalViews[0]?.total || 0,
          avgRating: result.avgRating[0]?.avg?.toFixed(1) || 0
        },
        byStatus: result.byStatus,
        byCategory: result.byCategory,
        byCity: result.byCity,
        byDistrict: result.byDistrict,
        topRated: result.topRated,
        mostViewed: result.mostViewed,
        recentlyAdded: result.recentlyAdded
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get city-wise attractions summary
// @route   GET /api/admin/attractions/cities
// @access  Private (Admin)
const getCitySummary = async (req, res, next) => {
  try {
    const cities = await Attraction.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: '$location.city',
          district: { $first: '$location.district' },
          count: { $sum: 1 },
          avgRating: { $avg: '$ratings.overall' },
          totalViews: { $sum: '$analytics.viewCount' },
          categories: { $addToSet: '$category' },
          featured: {
            $sum: { $cond: ['$isFeatured', 1, 0] }
          },
          unesco: {
            $sum: { $cond: ['$isUNESCOSite', 1, 0] }
          }
        }
      },
      { $sort: { count: -1 } }
    ]);

    res.status(200).json({
      success: true,
      data: cities.map(city => ({
        city: city._id,
        district: city.district,
        totalAttractions: city.count,
        avgRating: city.avgRating?.toFixed(1) || 0,
        totalViews: city.totalViews,
        categories: city.categories,
        featuredCount: city.featured,
        unescoCount: city.unesco
      })),
      totalCities: cities.length
    });
  } catch (error) {
    next(error);
  }
};

// =============================================
// BULK OPERATIONS
// =============================================

// @desc    Bulk update attractions
// @route   PUT /api/admin/attractions/bulk-update
// @access  Private (Admin)
const bulkUpdate = async (req, res, next) => {
  try {
    const { ids, updates } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return next(new AppError('Please provide attraction IDs', 400));
    }

    const allowedUpdates = ['isActive', 'isFeatured', 'status', 'isPopular', 'isMustVisit'];
    const updateData = {};
    
    Object.keys(updates).forEach(key => {
      if (allowedUpdates.includes(key)) {
        updateData[key] = updates[key];
      }
    });

    updateData.updatedBy = req.user.id;

    const result = await Attraction.updateMany(
      { _id: { $in: ids } },
      updateData
    );

    res.status(200).json({
      success: true,
      message: `${result.modifiedCount} attractions updated successfully`
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Bulk delete attractions
// @route   DELETE /api/admin/attractions/bulk-delete
// @access  Private (Admin)
const bulkDelete = async (req, res, next) => {
  try {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return next(new AppError('Please provide attraction IDs', 400));
    }

    const result = await Attraction.deleteMany({ _id: { $in: ids } });

    res.status(200).json({
      success: true,
      message: `${result.deletedCount} attractions deleted successfully`
    });
  } catch (error) {
    next(error);
  }
};

// =============================================
// PUBLIC ENDPOINTS
// =============================================

// @desc    Get all public attractions
// @route   GET /api/attractions
// @access  Public
const getPublicAttractions = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const skip = (page - 1) * limit;

    const query = { isActive: true, status: 'open' };

    // Filters
    if (req.query.city) {
      query['location.city'] = new RegExp(req.query.city, 'i');
    }
    if (req.query.district) {
      query['location.district'] = req.query.district;
    }
    if (req.query.category) {
      query.category = req.query.category;
    }
    if (req.query.featured === 'true') {
      query.isFeatured = true;
    }
    if (req.query.unesco === 'true') {
      query.isUNESCOSite = true;
    }
    if (req.query.freeEntry === 'true') {
      query.isFreeEntry = true;
    }

    // Search
    if (req.query.search) {
      query.$text = { $search: req.query.search };
    }

    // Sort
    let sortOption = { 'analytics.popularityScore': -1 };
    if (req.query.sortBy === 'rating') {
      sortOption = { 'ratings.overall': -1 };
    } else if (req.query.sortBy === 'name') {
      sortOption = { name: 1 };
    }

    const attractions = await Attraction.find(query)
      .select('name slug shortDescription thumbnail location category ratings.overall recommendedDuration isFreeEntry isUNESCOSite tags')
      .skip(skip)
      .limit(limit)
      .sort(sortOption);

    const total = await Attraction.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        attractions,
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

// @desc    Get single attraction by slug
// @route   GET /api/attractions/:slug
// @access  Public
const getAttractionBySlug = async (req, res, next) => {
  try {
    const attraction = await Attraction.findOne({
      slug: req.params.slug,
      isActive: true
    })
    .populate('nearbyAttractions.attraction', 'name slug thumbnail location.city ratings.overall')
    .select('-adminNotes -createdBy -updatedBy -verifiedBy');

    if (!attraction) {
      return next(new AppError('Attraction not found', 404));
    }

    // Increment view count
    attraction.analytics.viewCount += 1;
    await attraction.save();

    res.status(200).json({
      success: true,
      data: attraction
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
    const limit = parseInt(req.query.limit, 10) || 20;
    const skip = (page - 1) * limit;

    const query = {
      'location.city': new RegExp(city, 'i'),
      isActive: true,
      status: 'open'
    };

    if (req.query.category) {
      query.category = req.query.category;
    }

    const attractions = await Attraction.find(query)
      .select('name slug shortDescription thumbnail location category ratings.overall recommendedDuration isFreeEntry tags')
      .skip(skip)
      .limit(limit)
      .sort({ 'analytics.popularityScore': -1 });

    const total = await Attraction.countDocuments(query);

    // Get city stats
    const cityStats = await Attraction.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          avgRating: { $avg: '$ratings.overall' },
          categories: { $addToSet: '$category' },
          unescoCount: { $sum: { $cond: ['$isUNESCOSite', 1, 0] } }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      data: {
        city: city,
        stats: {
          total,
          avgRating: cityStats[0]?.avgRating?.toFixed(1) || 0,
          categories: cityStats[0]?.categories || [],
          unescoSites: cityStats[0]?.unescoCount || 0
        },
        attractions,
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
    const limit = parseInt(req.query.limit, 10) || 10;

    const attractions = await Attraction.find({
      isActive: true,
      status: 'open',
      isFeatured: true
    })
    .select('name slug shortDescription thumbnail location category ratings.overall')
    .limit(limit)
    .sort({ 'analytics.popularityScore': -1 });

    res.status(200).json({
      success: true,
      data: attractions
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get available cities
// @route   GET /api/attractions/cities
// @access  Public
const getAvailableCities = async (req, res, next) => {
  try {
    const cities = await Attraction.aggregate([
      { $match: { isActive: true, status: 'open' } },
      {
        $group: {
          _id: '$location.city',
          district: { $first: '$location.district' },
          count: { $sum: 1 },
          thumbnail: { $first: '$thumbnail.url' }
        }
      },
      { $sort: { count: -1 } }
    ]);

    res.status(200).json({
      success: true,
      data: cities.map(c => ({
        name: c._id,
        district: c.district,
        attractionsCount: c.count,
        thumbnail: c.thumbnail
      }))
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get categories
// @route   GET /api/attractions/categories
// @access  Public
const getCategories = async (req, res, next) => {
  try {
    const categories = await Attraction.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    res.status(200).json({
      success: true,
      data: categories
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
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
};