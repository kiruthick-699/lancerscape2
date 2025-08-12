import { Router, Request, Response } from 'express';
import { rateLimit } from 'express-rate-limit';
import { logger } from '../utils/logger';
import { authenticateToken, requireRole, requireOwnership } from '../middleware/authMiddleware';
import { validate, jobSchemas } from '../utils/validation';
import { Job } from '../models/Job';
import { cacheService } from '../services/cacheService';
import { config } from '../config';

const router = Router();

// Rate limiting for job endpoints
const jobLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: config.rateLimit.jobs.max || 50,
  message: 'Too many job requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path === '/health', // Skip health checks
  keyGenerator: (req) => req.headers['x-client-id'] || req.ip
});

// Get all jobs with advanced filtering and caching
router.get('/', jobLimiter, async (req: Request, res: Response) => {
  try {
    const {
      query,
      category,
      budgetMin,
      budgetMax,
      location,
      isRemote,
      skills,
      status,
      complexity,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Validate pagination parameters
    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string) || 20));
    
    // Validate sort parameters
    const validSortFields = ['createdAt', 'budget', 'deadline', 'proposals', 'title'];
    const sortField = validSortFields.includes(sortBy as string) ? sortBy as string : 'createdAt';
    const validSortOrders = ['asc', 'desc'];
    const sortOrderValid = validSortOrders.includes(sortOrder as string) ? sortOrder as string : 'desc';

    // Generate cache key based on filters
    const cacheKey = `jobs:search:${JSON.stringify({
      query, category, budgetMin, budgetMax, location, isRemote, skills, status, complexity, page: pageNum, limit: limitNum, sortBy: sortField, sortOrder: sortOrderValid
    })}`;

    // Try to get from cache first
    let jobs = await cacheService.get(cacheKey);
    
    if (!jobs) {
      // Build filters object
      const filters = {
        query: query as string,
        category: category ? parseInt(category as string) : undefined,
        budgetMin: budgetMin ? parseFloat(budgetMin as string) : undefined,
        budgetMax: budgetMax ? parseFloat(budgetMax as string) : undefined,
        location: location as string,
        isRemote: isRemote === 'true' ? true : isRemote === 'false' ? false : undefined,
        skills: skills ? (Array.isArray(skills) ? skills : [skills]) as string[] : undefined,
        status: status as string,
        complexity: complexity as string,
        page: pageNum,
        limit: limitNum,
        sortBy: sortField,
        sortOrder: sortOrderValid as 'asc' | 'desc'
      };

      // Query database
      const queryBuilder = await Job.searchJobs(filters);
      jobs = await queryBuilder;

      // Cache results for 5 minutes
      await cacheService.set(cacheKey, jobs, { ttl: 300 });
    }

    // Get total count for pagination
    const totalCacheKey = `jobs:count:${JSON.stringify({
      query, category, budgetMin, budgetMax, location, isRemote, skills, status, complexity
    })}`;
    
    let total = await cacheService.get<number>(totalCacheKey);
    
    if (total === null) {
      // Count total without pagination
      const countFilters = { ...req.query };
      delete countFilters.page;
      delete countFilters.limit;
      delete countFilters.sortBy;
      delete countFilters.sortOrder;
      
      const countQuery = await Job.searchJobs(countFilters);
      total = await countQuery.resultSize();
      
      // Cache count for 10 minutes
      await cacheService.set(totalCacheKey, total, { ttl: 600 });
    }

    res.json({
      success: true,
      data: jobs,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    logger.error('Error fetching jobs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch jobs'
    });
  }
});

// Get job by ID with caching
router.get('/:id', jobLimiter, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Validate UUID format
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid job ID format'
      });
    }

    // Try to get from cache first
    const cacheKey = `job:${id}`;
    let job = await cacheService.get(cacheKey);
    
    if (!job) {
      // Query database with relationships
      job = await Job.query()
        .findById(id)
        .withGraphFetched('[client, proposals.freelancer]')
        .where('status', '!=', 'deleted');
      
      if (!job) {
        return res.status(404).json({
          success: false,
          message: 'Job not found'
        });
      }

      // Cache job for 10 minutes
      await cacheService.set(cacheKey, job, { ttl: 600 });
    }

    res.json({
      success: true,
      data: job.publicData
    });
  } catch (error) {
    logger.error('Error fetching job:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch job'
    });
  }
});

// Create new job with validation and authentication
router.post('/', jobLimiter, authenticateToken, requireRole(['client', 'admin']), async (req: Request, res: Response) => {
  try {
    // Validate request body
    const validation = validate(req.body, jobSchemas.create);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validation.errors
      });
    }

    const {
      title,
      description,
      budget,
      deadline,
      category,
      isRemote,
      location,
      requirements,
      skills,
      metadata
    } = req.body;

    // Validate deadline is in the future
    const deadlineDate = new Date(deadline);
    if (deadlineDate <= new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Deadline must be in the future'
      });
    }

    // Validate budget range
    if (budget < 1 || budget > 1000000) {
      return res.status(400).json({
        success: false,
        message: 'Budget must be between $1 and $1,000,000'
      });
    }

    // Create job
    const newJob = await Job.query().insert({
      title,
      description,
      budget: parseFloat(budget),
      deadline: deadlineDate,
      category: parseInt(category),
      isRemote: Boolean(isRemote),
      location: location || '',
      requirements: requirements || [],
      skills: skills || [],
      clientId: req.user!.id,
      metadata: {
        estimatedDuration: metadata?.estimatedDuration || '1-2 weeks',
        complexity: metadata?.complexity || 'intermediate',
        priority: metadata?.priority || 'medium',
        tags: metadata?.tags || [],
        customFields: metadata?.customFields || {}
      }
    });

    // Invalidate related caches
    await cacheService.invalidateJobData(newJob.id);
    await cacheService.clearPattern('jobs:search:*');
    await cacheService.clearPattern('jobs:count:*');

    logger.info('Job created successfully', { 
      jobId: newJob.id, 
      clientId: req.user!.id,
      title: newJob.title 
    });

    return res.status(201).json({
      success: true,
      message: 'Job created successfully',
      data: newJob.publicData
    });
  } catch (error) {
    logger.error('Error creating job:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create job'
    });
  }
});

// Update job with ownership validation
router.put('/:id', jobLimiter, authenticateToken, requireOwnership('jobs'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Validate UUID format
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid job ID format'
      });
    }

    // Validate request body
    const validation = validate(req.body, jobSchemas.update);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validation.errors
      });
    }

    // Get existing job
    const existingJob = await Job.query().findById(id);
    if (!existingJob) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }

    // Check if job can be edited
    if (!existingJob.canBeEdited()) {
      return res.status(400).json({
        success: false,
        message: 'Job cannot be edited in its current state'
      });
    }

    // Update job
    const updateData = { ...req.body };
    delete updateData.id; // Prevent ID modification
    delete updateData.clientId; // Prevent client modification
    delete updateData.status; // Prevent status modification
    delete updateData.proposals; // Prevent proposal count modification

    const updatedJob = await Job.query()
      .patchAndFetchById(id, {
        ...updateData,
        updatedAt: new Date()
      });

    // Invalidate related caches
    await cacheService.invalidateJobData(id);
    await cacheService.clearPattern('jobs:search:*');
    await cacheService.clearPattern('jobs:count:*');

    logger.info('Job updated successfully', { 
      jobId: id, 
      clientId: req.user!.id 
    });

    return res.json({
      success: true,
      message: 'Job updated successfully',
      data: updatedJob.publicData
    });
  } catch (error) {
    logger.error('Error updating job:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update job'
    });
  }
});

// Delete job with ownership validation
router.delete('/:id', jobLimiter, authenticateToken, requireOwnership('jobs'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Validate UUID format
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid job ID format'
      });
    }

    // Get existing job
    const existingJob = await Job.query().findById(id);
    if (!existingJob) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }

    // Check if job can be deleted
    if (!existingJob.canBeCancelled()) {
      return res.status(400).json({
        success: false,
        message: 'Job cannot be deleted in its current state'
      });
    }

    // Soft delete job
    await Job.query()
      .patchAndFetchById(id, {
        status: 'cancelled',
        deletedAt: new Date(),
        updatedAt: new Date()
      });

    // Invalidate related caches
    await cacheService.invalidateJobData(id);
    await cacheService.clearPattern('jobs:search:*');
    await cacheService.clearPattern('jobs:count:*');

    logger.info('Job deleted successfully', { 
      jobId: id, 
      clientId: req.user!.id 
    });

    return res.json({
      success: true,
      message: 'Job deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting job:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete job'
    });
  }
});

// Get jobs by client
router.get('/client/:clientId', jobLimiter, authenticateToken, async (req: Request, res: Response) => {
  try {
    const { clientId } = req.params;
    const { status, page = 1, limit = 20 } = req.query;
    
    // Validate pagination
    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string) || 20));

    // Check if user can access these jobs
    if (req.user!.role !== 'admin' && req.user!.id !== clientId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Generate cache key
    const cacheKey = `jobs:client:${clientId}:${status || 'all'}:${pageNum}:${limitNum}`;
    
    let jobs = await cacheService.get(cacheKey);
    
    if (!jobs) {
      jobs = await Job.getJobsByClient(clientId, status as string);
      
      // Cache for 5 minutes
      await cacheService.set(cacheKey, jobs, { ttl: 300 });
    }

    res.json({
      success: true,
      data: jobs,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: jobs.length
      }
    });
  } catch (error) {
    logger.error('Error fetching client jobs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch client jobs'
    });
  }
});

// Get job statistics
router.get('/stats/overview', jobLimiter, async (req: Request, res: Response) => {
  try {
    // Try to get from cache first
    const cacheKey = 'jobs:stats:overview';
    let stats = await cacheService.get(cacheKey);
    
    if (!stats) {
      stats = await Job.getJobStats();
      
      // Cache for 10 minutes
      await cacheService.set(cacheKey, stats, { ttl: 600 });
    }

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error('Error fetching job stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch job statistics'
    });
  }
});

// Health check endpoint
router.get('/health', (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Jobs service is healthy',
    timestamp: new Date().toISOString()
  });
});

export default router; 