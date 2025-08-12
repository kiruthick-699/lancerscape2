import { Router, Request, Response } from 'express';
import { rateLimit } from 'express-rate-limit';
import { logger } from '../utils/logger';
import { authenticateToken, requireRole, requireOwnership } from '../middleware/authMiddleware';
import { validate, paymentSchemas } from '../utils/validation';
import { Job } from '../models/Job';
import { Proposal } from '../models/Proposal';
import { cacheService } from '../services/cacheService';
import { config } from '../config';
import Stripe from 'stripe';

const router = Router();

// Initialize Stripe
const stripe = new Stripe(config.payment.stripe.secretKey, {
  apiVersion: '2023-10-16'
});

// Rate limiting for payment endpoints
const paymentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: config.rateLimit.payments.max || 20,
  message: 'Too many payment requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path === '/health', // Skip health checks
  keyGenerator: (req) => req.headers['x-client-id'] || req.ip
});

// Create payment intent for Stripe
router.post('/create-payment-intent', paymentLimiter, authenticateToken, requireRole(['client', 'admin']), async (req: Request, res: Response) => {
  try {
    // Validate request body
    const validation = validate(req.body, paymentSchemas.createIntent);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validation.errors
      });
    }

    const { jobId, proposalId, amount, currency = 'usd' } = req.body;

    // Validate UUID format
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(jobId) ||
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(proposalId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid job or proposal ID format'
      });
    }

    // Validate amount
    if (amount < 1 || amount > 1000000) {
      return res.status(400).json({
        success: false,
        message: 'Amount must be between $1 and $1,000,000'
      });
    }

    // Check if job and proposal exist and are valid
    const job = await Job.query().findById(jobId);
    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }

    const proposal = await Proposal.query().findById(proposalId);
    if (!proposal) {
      return res.status(404).json({
        success: false,
        message: 'Proposal not found'
      });
    }

    // Check if user is the job client
    if (req.user!.role !== 'admin' && job.clientId !== req.user!.id) {
      return res.status(403).json({
        success: false,
        message: 'Only the job client can create payments'
      });
    }

    // Check if job and proposal are in correct state
    if (job.status !== 'in_progress' || proposal.status !== 'accepted') {
      return res.status(400).json({
        success: false,
        message: 'Job and proposal must be in progress and accepted respectively'
      });
    }

    // Check if proposal belongs to the job
    if (proposal.jobId !== jobId) {
      return res.status(400).json({
        success: false,
        message: 'Proposal does not belong to the specified job'
      });
    }

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: currency.toLowerCase(),
      metadata: {
        jobId,
        proposalId,
        clientId: req.user!.id,
        freelancerId: proposal.freelancerId,
        jobTitle: job.title
      },
      automatic_payment_methods: {
        enabled: true,
      },
      application_fee_amount: Math.round(amount * config.payment.platformFee * 100), // Platform fee
    });

    // Cache payment intent for 1 hour
    await cacheService.set(`payment:intent:${paymentIntent.id}`, {
      jobId,
      proposalId,
      amount,
      currency,
      clientId: req.user!.id,
      freelancerId: proposal.freelancerId
    }, { ttl: 3600 });

    logger.info('Payment intent created successfully', { 
      paymentIntentId: paymentIntent.id,
      jobId,
      proposalId,
      amount,
      clientId: req.user!.id
    });

    return res.status(201).json({
      success: true,
      message: 'Payment intent created successfully',
      data: {
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        amount: paymentIntent.amount / 100,
        currency: paymentIntent.currency,
        status: paymentIntent.status
      }
    });
  } catch (error) {
    logger.error('Error creating payment intent:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create payment intent'
    });
  }
});

// Confirm payment completion
router.post('/confirm-payment', paymentLimiter, authenticateToken, requireRole(['client', 'admin']), async (req: Request, res: Response) => {
  try {
    // Validate request body
    const validation = validate(req.body, paymentSchemas.confirmPayment);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validation.errors
      });
    }

    const { paymentIntentId, jobId, proposalId } = req.body;

    // Validate UUID format
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(jobId) ||
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(proposalId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid job or proposal ID format'
      });
    }

    // Retrieve payment intent from Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    
    if (!paymentIntent) {
      return res.status(404).json({
        success: false,
        message: 'Payment intent not found'
      });
    }

    // Check if payment was successful
    if (paymentIntent.status !== 'succeeded') {
      return res.status(400).json({
        success: false,
        message: `Payment not completed. Current status: ${paymentIntent.status}`
      });
    }

    // Verify payment intent metadata
    if (paymentIntent.metadata.jobId !== jobId || 
        paymentIntent.metadata.proposalId !== proposalId ||
        paymentIntent.metadata.clientId !== req.user!.id) {
      return res.status(400).json({
        success: false,
        message: 'Payment intent metadata mismatch'
      });
    }

    // Get cached payment intent data
    const cachedData = await cacheService.get(`payment:intent:${paymentIntentId}`);
    if (!cachedData) {
      return res.status(400).json({
        success: false,
        message: 'Payment intent data not found in cache'
      });
    }

    // Check if job and proposal are still valid
    const job = await Job.query().findById(jobId);
    if (!job || job.status !== 'in_progress') {
      return res.status(400).json({
        success: false,
        message: 'Job is not in progress'
      });
    }

    const proposal = await Proposal.query().findById(proposalId);
    if (!proposal || proposal.status !== 'accepted') {
      return res.status(400).json({
        success: false,
        message: 'Proposal is not accepted'
      });
    }

    // Update job status to completed
    await job.completeJob();

    // Create payment record (you would have a Payment model)
    // await Payment.query().insert({
    //   jobId,
    //   proposalId,
    //   clientId: req.user!.id,
    //   freelancerId: proposal.freelancerId,
    //   amount: paymentIntent.amount / 100,
    //   currency: paymentIntent.currency,
    //   stripePaymentIntentId: paymentIntentId,
    //   status: 'completed',
    //   completedAt: new Date()
    // });

    // Clear cached payment intent
    await cacheService.delete(`payment:intent:${paymentIntentId}`);

    // Invalidate related caches
    await cacheService.invalidateJobData(jobId);
    await cacheService.delete(`job:${jobId}`);
    await cacheService.delete(`proposal:${proposalId}`);

    logger.info('Payment confirmed successfully', { 
      paymentIntentId,
      jobId,
      proposalId,
      clientId: req.user!.id,
      amount: paymentIntent.amount / 100
    });

    return res.json({
      success: true,
      message: 'Payment confirmed successfully',
      data: {
        paymentIntentId,
        jobId,
        proposalId,
        amount: paymentIntent.amount / 100,
        currency: paymentIntent.currency,
        status: 'completed'
      }
    });
  } catch (error) {
    logger.error('Error confirming payment:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to confirm payment'
    });
  }
});

// Get payment status
router.get('/status/:paymentIntentId', paymentLimiter, authenticateToken, async (req: Request, res: Response) => {
  try {
    const { paymentIntentId } = req.params;

    // Retrieve payment intent from Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    
    if (!paymentIntent) {
      return res.status(404).json({
        success: false,
        message: 'Payment intent not found'
      });
    }

    // Check if user can access this payment
    if (req.user!.role !== 'admin' && 
        paymentIntent.metadata.clientId !== req.user!.id &&
        paymentIntent.metadata.freelancerId !== req.user!.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    return res.json({
      success: true,
      data: {
        paymentIntentId,
        status: paymentIntent.status,
        amount: paymentIntent.amount / 100,
        currency: paymentIntent.currency,
        created: paymentIntent.created,
        metadata: paymentIntent.metadata
      }
    });
  } catch (error) {
    logger.error('Error getting payment status:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get payment status'
    });
  }
});

// Cancel payment intent
router.post('/cancel/:paymentIntentId', paymentLimiter, authenticateToken, requireRole(['client', 'admin']), async (req: Request, res: Response) => {
  try {
    const { paymentIntentId } = req.params;

    // Retrieve payment intent from Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    
    if (!paymentIntent) {
      return res.status(404).json({
        success: false,
        message: 'Payment intent not found'
      });
    }

    // Check if user can cancel this payment
    if (req.user!.role !== 'admin' && paymentIntent.metadata.clientId !== req.user!.id) {
      return res.status(403).json({
        success: false,
        message: 'Only the client can cancel their payment'
      });
    }

    // Check if payment can be cancelled
    if (paymentIntent.status === 'succeeded' || paymentIntent.status === 'canceled') {
      return res.status(400).json({
        success: false,
        message: `Payment cannot be cancelled. Current status: ${paymentIntent.status}`
      });
    }

    // Cancel payment intent
    const canceledPaymentIntent = await stripe.paymentIntents.cancel(paymentIntentId);

    // Clear cached payment intent
    await cacheService.delete(`payment:intent:${paymentIntentId}`);

    logger.info('Payment intent cancelled successfully', { 
      paymentIntentId,
      clientId: req.user!.id
    });

    return res.json({
      success: true,
      message: 'Payment intent cancelled successfully',
      data: {
        paymentIntentId,
        status: canceledPaymentIntent.status
      }
    });
  } catch (error) {
    logger.error('Error cancelling payment intent:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to cancel payment intent'
    });
  }
});

// Get payment history for user
router.get('/history', paymentLimiter, authenticateToken, async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    
    // Validate pagination
    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string) || 20));

    // Generate cache key
    const cacheKey = `payments:history:${req.user!.id}:${status || 'all'}:${pageNum}:${limitNum}`;
    
    let payments = await cacheService.get(cacheKey);
    
    if (!payments) {
      // Query payment history from database (you would have a Payment model)
      // payments = await Payment.query()
      //   .where('clientId', req.user!.id)
      //   .orWhere('freelancerId', req.user!.id)
      //   .orderBy('createdAt', 'desc')
      //   .offset((pageNum - 1) * limitNum)
      //   .limit(limitNum);
      
      // For now, return empty array
      payments = [];
      
      // Cache for 5 minutes
      await cacheService.set(cacheKey, payments, { ttl: 300 });
    }

    return res.json({
      success: true,
      data: payments,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: payments.length
      }
    });
  } catch (error) {
    logger.error('Error fetching payment history:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch payment history'
    });
  }
});

// Webhook for Stripe events
router.post('/webhook/stripe', async (req: Request, res: Response) => {
  try {
    const sig = req.headers['stripe-signature'];
    
    if (!sig) {
      return res.status(400).json({
        success: false,
        message: 'Missing stripe signature'
      });
    }

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        config.payment.stripe.webhookSecret
      );
    } catch (err) {
      logger.error('Webhook signature verification failed:', err);
      return res.status(400).json({
        success: false,
        message: 'Invalid signature'
      });
    }

    // Handle the event
    switch (event.type) {
      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        logger.info('Payment succeeded via webhook', { 
          paymentIntentId: paymentIntent.id,
          amount: paymentIntent.amount / 100
        });
        
        // Process successful payment
        // await processSuccessfulPayment(paymentIntent);
        break;
        
      case 'payment_intent.payment_failed':
        const failedPayment = event.data.object as Stripe.PaymentIntent;
        logger.warn('Payment failed via webhook', { 
          paymentIntentId: failedPayment.id,
          lastPaymentError: failedPayment.last_payment_error
        });
        
        // Process failed payment
        // await processFailedPayment(failedPayment);
        break;
        
      default:
        logger.info(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    logger.error('Webhook error:', error);
    res.status(500).json({
      success: false,
      message: 'Webhook processing failed'
    });
  }
});

// Health check endpoint
router.get('/health', (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Payments service is healthy',
    timestamp: new Date().toISOString()
  });
});

export default router; 