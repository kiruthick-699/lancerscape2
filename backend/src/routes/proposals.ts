import { Router, Request, Response } from 'express';
import { rateLimit } from 'express-rate-limit';
import { logger } from '../utils/logger';
import { authenticateToken, requireRole, requireOwnership } from '../middleware/authMiddleware';
import { validate, proposalSchemas } from '../utils/validation';
import { Proposal } from '../models/Proposal';
import { Job } from '../models/Job';
import { cacheService } from '../services/cacheService';
import { config } from '../config';

const router = Router();

// Rate limiting for proposal endpoints
const proposalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: config.rateLimit.proposals.max || 30,
  message: 'Too many proposal requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path === '/health', // Skip health checks
  keyGenerator: (req) => req.headers['x-client-id'] || req.ip
});

// Get proposals with filtering and caching
router.get('/', proposalLimiter, authenticateToken, async (req: Request, res: Response) => {
  try {
    const {
      jobId,
      freelancerId,
      status,
      minAmount,
      maxAmount,
      skills,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Validate pagination parameters
    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string) || 20));
    
    // Validate sort parameters
    const validSortFields = ['createdAt', 'proposedAmount', 'deliveryTime'];
    const sortField = validSortFields.includes(sortBy as string) ? sortBy as string : 'createdAt';
    const validSortOrders = ['asc', 'desc'];
    const sortOrderValid = validSortOrders.includes(sortOrder as string) ? sortOrder as string : 'desc';

    // Generate cache key based on filters
    const cacheKey = `proposals:search:${JSON.stringify({
      jobId, freelancerId, status, minAmount, maxAmount, skills, page: pageNum, limit: limitNum, sortBy: sortField, sortOrder: sortOrderValid
    })}`;

    // Try to get from cache first
    let proposals = await cacheService.get(cacheKey);
    
    if (!proposals) {
      // Build filters object
      const filters = {
        jobId: jobId as string,
        freelancerId: freelancerId as string,
        status: status as string,
        minAmount: minAmount ? parseFloat(minAmount as string) : undefined,
        maxAmount: maxAmount ? parseFloat(maxAmount as string) : undefined,
        skills: skills ? (Array.isArray(skills) ? skills : [skills]) as string[] : undefined,
        page: pageNum,
        limit: limitNum,
        sortBy: sortField,
        sortOrder: sortOrderValid as 'asc' | 'desc'
      };

      // Query database
      proposals = await Proposal.searchProposals(filters);

      // Cache results for 5 minutes
      await cacheService.set(cacheKey, proposals, { ttl: 300 });
    }

    // Get total count for pagination
    const totalCacheKey = `proposals:count:${JSON.stringify({
      jobId, freelancerId, status, minAmount, maxAmount, skills
    })}`;
    
    let total = await cacheService.get<number>(totalCacheKey);
    
    if (total === null) {
      // Count total without pagination
      const countFilters = { ...req.query };
      delete countFilters.page;
      delete countFilters.limit;
      delete countFilters.sortBy;
      delete countFilters.sortOrder;
      
      const countQuery = await Proposal.searchProposals(countFilters);
      total = await countQuery.resultSize();
      
      // Cache count for 10 minutes
      await cacheService.set(totalCacheKey, total, { ttl: 600 });
    }

    res.json({
      success: true,
      data: proposals,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    logger.error('Error fetching proposals:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch proposals'
    });
  }
});

// Get proposal by ID with caching
router.get('/:id', proposalLimiter, authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Validate UUID format
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid proposal ID format'
      });
    }

    // Try to get from cache first
    const cacheKey = `proposal:${id}`;
    let proposal = await cacheService.get(cacheKey);
    
    if (!proposal) {
      // Query database with relationships
      proposal = await Proposal.query()
        .findById(id)
        .withGraphFetched('[job, freelancer]')
        .where('status', '!=', 'deleted');
      
      if (!proposal) {
        return res.status(404).json({
          success: false,
          message: 'Proposal not found'
        });
      }

      // Cache proposal for 10 minutes
      await cacheService.set(cacheKey, proposal, { ttl: 600 });
    }

    // Check if user can view this proposal
    if (req.user!.role !== 'admin' && 
        req.user!.id !== proposal.job.clientId && 
        req.user!.id !== proposal.freelancerId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    res.json({
      success: true,
      data: proposal.clientView
    });
  } catch (error) {
    logger.error('Error fetching proposal:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch proposal'
    });
  }
});

// Create new proposal with validation and authentication
router.post('/', proposalLimiter, authenticateToken, requireRole(['freelancer', 'admin']), async (req: Request, res: Response) => {
  try {
    // Validate request body
    const validation = validate(req.body, proposalSchemas.create);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validation.errors
      });
    }

    const {
      jobId,
      proposedAmount,
      coverLetter,
      deliveryTime,
      attachments,
      portfolio,
      metadata
    } = req.body;

    // Validate UUID format
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(jobId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid job ID format'
      });
    }

    // Check if job exists and is open
    const job = await Job.query().findById(jobId);
    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }

    if (job.status !== 'posted') {
      return res.status(400).json({
        success: false,
        message: 'Job is not accepting proposals'
      });
    }

    // Check if user is not the job client
    if (job.clientId === req.user!.id) {
      return res.status(400).json({
        success: false,
        message: 'You cannot submit a proposal to your own job'
      });
    }

    // Check if user already has a proposal for this job
    const existingProposal = await Proposal.query()
      .where({ jobId, freelancerId: req.user!.id, status: 'pending' })
      .first();
    
    if (existingProposal) {
      return res.status(400).json({
        success: false,
        message: 'You already have a pending proposal for this job'
      });
    }

    // Validate proposed amount
    if (proposedAmount < 1 || proposedAmount > job.budget * 2) {
      return res.status(400).json({
        success: false,
        message: `Proposed amount must be between $1 and $${job.budget * 2}`
      });
    }

    // Create proposal
    const newProposal = await Proposal.query().insert({
      jobId,
      freelancerId: req.user!.id,
      proposedAmount: parseFloat(proposedAmount),
      coverLetter,
      deliveryTime,
      attachments: attachments || [],
      portfolio: portfolio || [],
      metadata: {
        milestones: metadata?.milestones || [],
        skills: metadata?.skills || [],
        experience: metadata?.experience || '',
        availability: metadata?.availability || 'Immediate',
        customFields: metadata?.customFields || {}
      }
    });

    // Increment job proposal count
    await job.incrementProposals();

    // Invalidate related caches
    await cacheService.invalidateJobData(jobId);
    await cacheService.clearPattern('proposals:search:*');
    await cacheService.clearPattern('proposals:count:*');
    await cacheService.delete(`job:${jobId}`);

    logger.info('Proposal created successfully', { 
      proposalId: newProposal.id, 
      jobId,
      freelancerId: req.user!.id,
      proposedAmount: newProposal.proposedAmount
    });

    return res.status(201).json({
      success: true,
      message: 'Proposal submitted successfully',
      data: newProposal.publicData
    });
  } catch (error) {
    logger.error('Error creating proposal:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to submit proposal'
    });
  }
});

// Accept proposal (client only)
router.post('/:id/accept', proposalLimiter, authenticateToken, requireRole(['client', 'admin']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Validate UUID format
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid proposal ID format'
      });
    }

    // Get proposal with job details
    const proposal = await Proposal.query()
      .findById(id)
      .withGraphFetched('job')
      .where('status', '!=', 'deleted');
    
    if (!proposal) {
      return res.status(404).json({
        success: false,
        message: 'Proposal not found'
      });
    }

    // Check if user is the job client
    if (req.user!.role !== 'admin' && proposal.job.clientId !== req.user!.id) {
      return res.status(403).json({
        success: false,
        message: 'Only the job client can accept proposals'
      });
    }

    // Check if proposal can be accepted
    if (!proposal.canBeAccepted()) {
      return res.status(400).json({
        success: false,
        message: 'Proposal cannot be accepted in its current state'
      });
    }

    // Accept proposal
    await proposal.accept();

    // Invalidate related caches
    await cacheService.invalidateJobData(proposal.jobId);
    await cacheService.clearPattern('proposals:search:*');
    await cacheService.clearPattern('proposals:count:*');
    await cacheService.delete(`job:${proposal.jobId}`);
    await cacheService.delete(`proposal:${id}`);

    logger.info('Proposal accepted successfully', { 
      proposalId: id, 
      jobId: proposal.jobId,
      clientId: req.user!.id 
    });

    return res.json({
      success: true,
      message: 'Proposal accepted successfully',
      data: proposal.publicData
    });
  } catch (error) {
    logger.error('Error accepting proposal:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to accept proposal'
    });
  }
});

// Reject proposal (client only)
router.post('/:id/reject', proposalLimiter, authenticateToken, requireRole(['client', 'admin']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    
    // Validate UUID format
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid proposal ID format'
      });
    }

    // Validate rejection reason
    if (!reason || reason.trim().length < 10) {
      return res.status(400).json({
        success: false,
        message: 'Rejection reason is required and must be at least 10 characters'
      });
    }

    // Get proposal with job details
    const proposal = await Proposal.query()
      .findById(id)
      .withGraphFetched('job')
      .where('status', '!=', 'deleted');
    
    if (!proposal) {
      return res.status(404).json({
        success: false,
        message: 'Proposal not found'
      });
    }

    // Check if user is the job client
    if (req.user!.role !== 'admin' && proposal.job.clientId !== req.user!.id) {
      return res.status(403).json({
        success: false,
        message: 'Only the job client can reject proposals'
      });
    }

    // Check if proposal can be rejected
    if (!proposal.canBeRejected()) {
      return res.status(400).json({
        success: false,
        message: 'Proposal cannot be rejected in its current state'
      });
    }

    // Reject proposal
    await proposal.reject(reason.trim());

    // Invalidate related caches
    await cacheService.delete(`proposal:${id}`);
    await cacheService.clearPattern('proposals:search:*');
    await cacheService.clearPattern('proposals:count:*');

    logger.info('Proposal rejected successfully', { 
      proposalId: id, 
      jobId: proposal.jobId,
      clientId: req.user!.id,
      reason: reason.trim()
    });

    return res.json({
      success: true,
      message: 'Proposal rejected successfully',
      data: proposal.publicData
    });
  } catch (error) {
    logger.error('Error rejecting proposal:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to reject proposal'
    });
  }
});

// Withdraw proposal (freelancer only)
router.post('/:id/withdraw', proposalLimiter, authenticateToken, requireOwnership('proposals'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Validate UUID format
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid proposal ID format'
      });
    }

    // Get proposal
    const proposal = await Proposal.query()
      .findById(id)
      .where('status', '!=', 'deleted');
    
    if (!proposal) {
      return res.status(404).json({
        success: false,
        message: 'Proposal not found'
      });
    }

    // Check if proposal can be withdrawn
    if (!proposal.canBeWithdrawn()) {
      return res.status(400).json({
        success: false,
        message: 'Proposal cannot be withdrawn in its current state'
      });
    }

    // Withdraw proposal
    await proposal.withdraw();

    // Invalidate related caches
    await cacheService.delete(`proposal:${id}`);
    await cacheService.clearPattern('proposals:search:*');
    await cacheService.clearPattern('proposals:count:*');

    logger.info('Proposal withdrawn successfully', { 
      proposalId: id, 
      freelancerId: req.user!.id 
    });

    return res.json({
      success: true,
      message: 'Proposal withdrawn successfully',
      data: proposal.publicData
    });
  } catch (error) {
    logger.error('Error withdrawing proposal:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to withdraw proposal'
    });
  }
});

// Get proposals by job
router.get('/job/:jobId', proposalLimiter, authenticateToken, async (req: Request, res: Response) => {
  try {
    const { jobId } = req.params;
    const { status, page = 1, limit = 20 } = req.query;
    
    // Validate UUID format
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(jobId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid job ID format'
      });
    }

    // Validate pagination
    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string) || 20));

    // Check if job exists
    const job = await Job.query().findById(jobId);
    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }

    // Check if user can access these proposals
    if (req.user!.role !== 'admin' && req.user!.id !== job.clientId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Generate cache key
    const cacheKey = `proposals:job:${jobId}:${status || 'all'}:${pageNum}:${limitNum}`;
    
    let proposals = await cacheService.get(cacheKey);
    
    if (!proposals) {
      proposals = await Proposal.getProposalsByJob(jobId, status as string);
      
      // Cache for 5 minutes
      await cacheService.set(cacheKey, proposals, { ttl: 300 });
    }

    res.json({
      success: true,
      data: proposals,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: proposals.length
      }
    });
  } catch (error) {
    logger.error('Error fetching job proposals:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch job proposals'
    });
  }
});

// Get proposals by freelancer
router.get('/freelancer/:freelancerId', proposalLimiter, authenticateToken, async (req: Request, res: Response) => {
  try {
    const { freelancerId } = req.params;
    const { status, page = 1, limit = 20 } = req.query;
    
    // Validate pagination
    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string) || 20));

    // Check if user can access these proposals
    if (req.user!.role !== 'admin' && req.user!.id !== freelancerId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Generate cache key
    const cacheKey = `proposals:freelancer:${freelancerId}:${status || 'all'}:${pageNum}:${limitNum}`;
    
    let proposals = await cacheService.get(cacheKey);
    
    if (!proposals) {
      proposals = await Proposal.getProposalsByFreelancer(freelancerId, status as string);
      
      // Cache for 5 minutes
      await cacheService.set(cacheKey, proposals, { ttl: 300 });
    }

    res.json({
      success: true,
      data: proposals,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: proposals.length
      }
    });
  } catch (error) {
    logger.error('Error fetching freelancer proposals:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch freelancer proposals'
    });
  }
});

// Get proposal statistics
router.get('/stats/overview', proposalLimiter, async (req: Request, res: Response) => {
  try {
    // Try to get from cache first
    const cacheKey = 'proposals:stats:overview';
    let stats = await cacheService.get(cacheKey);
    
    if (!stats) {
      stats = await Proposal.getProposalStats();
      
      // Cache for 10 minutes
      await cacheService.set(cacheKey, stats, { ttl: 600 });
    }

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error('Error fetching proposal stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch proposal statistics'
    });
  }
});

// Health check endpoint
router.get('/health', (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Proposals service is healthy',
    timestamp: new Date().toISOString()
  });
});

export default router; 