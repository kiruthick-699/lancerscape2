import { Router, Request, Response } from 'express';
import { rateLimit } from 'express-rate-limit';
import { logger } from '../utils/logger';
import { authenticateToken, requireRole, requireOwnership } from '../middleware/authMiddleware';
import { validate, userSchemas } from '../utils/validation';
import { User } from '../models/User';
import { cacheService } from '../services/cacheService';
import { config } from '../config';

const router = Router();

// Rate limiting for user endpoints
const userLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: config.rateLimit.users.max || 100,
  message: 'Too many user requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path === '/health', // Skip health checks
  keyGenerator: (req) => req.headers['x-client-id'] || req.ip
});

// Get users with filtering and caching (admin only)
router.get('/', userLimiter, authenticateToken, requireRole(['admin']), async (req: Request, res: Response) => {
  try {
    const {
      query,
      userType,
      isVerified,
      isActive,
      skills,
      location,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Validate pagination parameters
    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string) || 20));
    
    // Validate sort parameters
    const validSortFields = ['createdAt', 'username', 'reputationScore', 'totalEarnings', 'lastActive'];
    const sortField = validSortFields.includes(sortBy as string) ? sortBy as string : 'createdAt';
    const validSortOrders = ['asc', 'desc'];
    const sortOrderValid = validSortOrders.includes(sortOrder as string) ? sortOrder as string : 'desc';

    // Generate cache key based on filters
    const cacheKey = `users:search:${JSON.stringify({
      query, userType, isVerified, isActive, skills, location, page: pageNum, limit: limitNum, sortBy: sortField, sortOrder: sortOrderValid
    })}`;

    // Try to get from cache first
    let users = await cacheService.get(cacheKey);
    
    if (!users) {
      // Build query
      let queryBuilder = User.query()
        .where('status', '!=', 'deleted');

      // Text search
      if (query) {
        queryBuilder = queryBuilder.where(function() {
          this.where('username', 'ilike', `%${query}%`)
            .orWhere('firstName', 'ilike', `%${query}%`)
            .orWhere('lastName', 'ilike', `%${query}%`)
            .orWhere('email', 'ilike', `%${query}%`)
            .orWhere('skills', '@>', `{${query}}`);
        });
      }

      // User type filter
      if (userType) {
        queryBuilder = queryBuilder.where('userType', userType);
      }

      // Verification filter
      if (isVerified !== undefined) {
        queryBuilder = queryBuilder.where('isVerified', isVerified === 'true');
      }

      // Active filter
      if (isActive !== undefined) {
        queryBuilder = queryBuilder.where('isActive', isActive === 'true');
      }

      // Skills filter
      if (skills && Array.isArray(skills)) {
        queryBuilder = queryBuilder.where('skills', '@>', skills);
      }

      // Location filter
      if (location) {
        queryBuilder = queryBuilder.where('location', 'ilike', `%${location}%`);
      }

      // Sorting
      queryBuilder = queryBuilder.orderBy(sortField, sortOrderValid);

      // Pagination
      const offset = (pageNum - 1) * limitNum;
      users = await queryBuilder.offset(offset).limit(limitNum);

      // Cache results for 5 minutes
      await cacheService.set(cacheKey, users, { ttl: 300 });
    }

    // Get total count for pagination
    const totalCacheKey = `users:count:${JSON.stringify({
      query, userType, isVerified, isActive, skills, location
    })}`;
    
    let total = await cacheService.get<number>(totalCacheKey);
    
    if (total === null) {
      // Count total without pagination
      const countFilters = { ...req.query };
      delete countFilters.page;
      delete countFilters.limit;
      delete countFilters.sortBy;
      delete countFilters.sortOrder;
      
      let countQuery = User.query().where('status', '!=', 'deleted');
      
      // Apply same filters for count
      if (countFilters.query) {
        countQuery = countQuery.where(function() {
          this.where('username', 'ilike', `%${countFilters.query}%`)
            .orWhere('firstName', 'ilike', `%${countFilters.query}%`)
            .orWhere('lastName', 'ilike', `%${countFilters.query}%`)
            .orWhere('email', 'ilike', `%${countFilters.query}%`)
            .orWhere('skills', '@>', `{${countFilters.query}}`);
        });
      }
      
      if (countFilters.userType) countQuery = countQuery.where('userType', countFilters.userType);
      if (countFilters.isVerified !== undefined) countQuery = countQuery.where('isVerified', countFilters.isVerified === 'true');
      if (countFilters.isActive !== undefined) countQuery = countQuery.where('isActive', countFilters.isActive === 'true');
      if (countFilters.skills && Array.isArray(countFilters.skills)) countQuery = countQuery.where('skills', '@>', countFilters.skills);
      if (countFilters.location) countQuery = countQuery.where('location', 'ilike', `%${countFilters.location}%`);
      
      total = await countQuery.resultSize();
      
      // Cache count for 10 minutes
      await cacheService.set(totalCacheKey, total, { ttl: 600 });
    }

    res.json({
      success: true,
      data: users.map(user => user.publicProfile),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    logger.error('Error fetching users:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users'
    });
  }
});

// Get user by ID with caching
router.get('/:id', userLimiter, authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Validate UUID format
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID format'
      });
    }

    // Check if user can access this profile
    if (req.user!.role !== 'admin' && req.user!.id !== id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Try to get from cache first
    const cacheKey = `user:${id}`;
    let user = await cacheService.get(cacheKey);
    
    if (!user) {
      // Query database
      user = await User.query()
        .findById(id)
        .where('status', '!=', 'deleted');
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Cache user for 10 minutes
      await cacheService.set(cacheKey, user, { ttl: 600 });
    }

    // Return appropriate profile data based on user role
    let profileData;
    if (req.user!.role === 'admin' || req.user!.id === id) {
      // Full profile for admin or self
      profileData = {
        ...user.publicProfile,
        email: user.email,
        phone: user.phone,
        dateOfBirth: user.dateOfBirth,
        timezone: user.timezone,
        preferences: user.preferences,
        settings: user.settings,
        metadata: user.metadata,
        updatedAt: user.updatedAt
      };
    } else {
      // Public profile for others
      profileData = user.publicProfile;
    }

    res.json({
      success: true,
      data: profileData
    });
  } catch (error) {
    logger.error('Error fetching user:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user'
    });
  }
});

// Update user profile with ownership validation
router.put('/:id', userLimiter, authenticateToken, requireOwnership('users'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Validate UUID format
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID format'
      });
    }

    // Validate request body
    const validation = validate(req.body, userSchemas.update);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validation.errors
      });
    }

    // Get existing user
    const existingUser = await User.query().findById(id);
    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Update user
    const updateData = { ...req.body };
    delete updateData.id; // Prevent ID modification
    delete updateData.email; // Prevent email modification
    delete updateData.userType; // Prevent user type modification
    delete updateData.isVerified; // Prevent verification modification
    delete updateData.isActive; // Prevent active status modification

    const updatedUser = await User.query()
      .patchAndFetchById(id, {
        ...updateData,
        updatedAt: new Date()
      });

    // Invalidate related caches
    await cacheService.invalidateUserData(id);
    await cacheService.delete(`user:${id}`);
    await cacheService.clearPattern('users:search:*');
    await cacheService.clearPattern('users:count:*');

    logger.info('User profile updated successfully', { 
      userId: id,
      updatedBy: req.user!.id 
    });

    return res.json({
      success: true,
      message: 'Profile updated successfully',
      data: updatedUser.publicProfile
    });
  } catch (error) {
    logger.error('Error updating user profile:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update profile'
    });
  }
});

// Delete user (soft delete)
router.delete('/:id', userLimiter, authenticateToken, requireRole(['admin']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Validate UUID format
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID format'
      });
    }

    // Check if user exists
    const existingUser = await User.query().findById(id);
    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Prevent admin from deleting themselves
    if (req.user!.id === id) {
      return res.status(400).json({
        success: false,
        message: 'You cannot delete your own account'
      });
    }

    // Soft delete user
    await User.query()
      .patchAndFetchById(id, {
        isActive: false,
        deletedAt: new Date(),
        updatedAt: new Date()
      });

    // Invalidate related caches
    await cacheService.invalidateUserData(id);
    await cacheService.delete(`user:${id}`);
    await cacheService.clearPattern('users:search:*');
    await cacheService.clearPattern('users:count:*');

    logger.info('User deleted successfully', { 
      userId: id,
      deletedBy: req.user!.id 
    });

    return res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting user:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete user'
    });
  }
});

// Get user statistics
router.get('/stats/overview', userLimiter, authenticateToken, requireRole(['admin']), async (req: Request, res: Response) => {
  try {
    // Try to get from cache first
    const cacheKey = 'users:stats:overview';
    let stats = await cacheService.get(cacheKey);
    
    if (!stats) {
      // Calculate user statistics
      const totalUsers = await User.query().where('status', '!=', 'deleted').resultSize();
      const verifiedUsers = await User.query().where('isVerified', true).where('status', '!=', 'deleted').resultSize();
      const activeUsers = await User.query().where('isActive', true).where('status', '!=', 'deleted').resultSize();
      
      const userTypeStats = await User.query()
        .select('userType')
        .count('* as count')
        .where('status', '!=', 'deleted')
        .groupBy('userType');

      const recentUsers = await User.query()
        .where('status', '!=', 'deleted')
        .orderBy('createdAt', 'desc')
        .limit(10);

      stats = {
        totalUsers,
        verifiedUsers,
        activeUsers,
        verificationRate: totalUsers > 0 ? (verifiedUsers / totalUsers) * 100 : 0,
        activeRate: totalUsers > 0 ? (activeUsers / totalUsers) * 100 : 0,
        userTypeDistribution: userTypeStats,
        recentRegistrations: recentUsers.length,
        averageReputationScore: 0, // Would need to calculate this
        totalEarnings: 0 // Would need to calculate this
      };
      
      // Cache for 10 minutes
      await cacheService.set(cacheKey, stats, { ttl: 600 });
    }

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error('Error fetching user stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user statistics'
    });
  }
});

// Search users by skills
router.get('/search/skills', userLimiter, authenticateToken, async (req: Request, res: Response) => {
  try {
    const { skills, page = 1, limit = 20 } = req.query;
    
    if (!skills || !Array.isArray(skills) || skills.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Skills parameter is required and must be an array'
      });
    }

    // Validate pagination
    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string) || 20));

    // Generate cache key
    const cacheKey = `users:search:skills:${JSON.stringify(skills)}:${pageNum}:${limitNum}`;
    
    let users = await cacheService.get(cacheKey);
    
    if (!users) {
      // Search users by skills
      users = await User.query()
        .where('status', '!=', 'deleted')
        .where('isActive', true)
        .where('skills', '@>', skills)
        .orderBy('reputationScore', 'desc')
        .offset((pageNum - 1) * limitNum)
        .limit(limitNum);
      
      // Cache for 5 minutes
      await cacheService.set(cacheKey, users, { ttl: 300 });
    }

    res.json({
      success: true,
      data: users.map(user => user.publicProfile),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: users.length
      }
    });
  } catch (error) {
    logger.error('Error searching users by skills:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search users'
    });
  }
});

// Get user recommendations
router.get('/:id/recommendations', userLimiter, authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { limit = 10 } = req.query;
    
    // Validate UUID format
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID format'
      });
    }

    // Validate limit
    const limitNum = Math.min(50, Math.max(1, parseInt(limit as string) || 10));

    // Check if user can access recommendations
    if (req.user!.role !== 'admin' && req.user!.id !== id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Generate cache key
    const cacheKey = `users:recommendations:${id}:${limitNum}`;
    
    let recommendations = await cacheService.get(cacheKey);
    
    if (!recommendations) {
      // Get user to understand their profile
      const user = await User.query().findById(id);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Get recommendations based on skills and user type
      let queryBuilder = User.query()
        .where('id', '!=', id)
        .where('status', '!=', 'deleted')
        .where('isActive', true)
        .where('isVerified', true);

      // If user is a client, recommend freelancers
      if (user.userType === 'client') {
        queryBuilder = queryBuilder.where('userType', 'freelancer');
      } else if (user.userType === 'freelancer') {
        // If user is a freelancer, recommend other freelancers with similar skills
        queryBuilder = queryBuilder.where('userType', 'freelancer');
        if (user.skills && user.skills.length > 0) {
          queryBuilder = queryBuilder.where('skills', '@>', user.skills.slice(0, 3));
        }
      }

      // Order by reputation and skills match
      recommendations = await queryBuilder
        .orderBy('reputationScore', 'desc')
        .orderBy('averageRating', 'desc')
        .limit(limitNum);
      
      // Cache for 10 minutes
      await cacheService.set(cacheKey, recommendations, { ttl: 600 });
    }

    res.json({
      success: true,
      data: recommendations.map(user => user.publicProfile)
    });
  } catch (error) {
    logger.error('Error fetching user recommendations:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch recommendations'
    });
  }
});

// Health check endpoint
router.get('/health', (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Users service is healthy',
    timestamp: new Date().toISOString()
  });
});

export default router; 