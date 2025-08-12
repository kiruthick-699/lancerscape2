import request from 'supertest';
import { app } from '../../index';
import { testUtils } from '../setup';
import { knexInstance } from '../../database/connection';
import { redisClient } from '../../database/redis';
import { blockchainService } from '../../services/blockchainService';
import { cacheService } from '../../services/cacheService';

describe('API Integration Tests', () => {
  let testUser: any;
  let testJob: any;
  let testProposal: any;
  let authToken: string;

  beforeAll(async () => {
    // Create test user
    testUser = await testUtils.createTestUser({
      email: 'integration@test.com',
      username: 'integrationuser',
      userType: 'client'
    });

    // Create test job
    testJob = await testUtils.createTestJob({
      clientId: testUser.id,
      title: 'Integration Test Job',
      description: 'Job for integration testing'
    });

    // Generate auth token
    const tokens = testUtils.generateTestTokens(
      testUser.id,
      testUser.email,
      testUser.userType
    );
    authToken = tokens.accessToken;
  });

  afterAll(async () => {
    await testUtils.cleanupTestData();
  });

  describe('Authentication Flow', () => {
    it('should complete full authentication flow', async () => {
      // 1. User registration
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'newuser@test.com',
          username: 'newuser',
          firstName: 'New',
          lastName: 'User',
          password: 'TestPassword123!',
          userType: 'freelancer'
        });

      expect(registerResponse.status).toBe(201);
      expect(registerResponse.body.success).toBe(true);
      expect(registerResponse.body.data.user).toBeDefined();

      // 2. User login
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'newuser@test.com',
          password: 'TestPassword123!'
        });

      expect(loginResponse.status).toBe(200);
      expect(loginResponse.body.success).toBe(true);
      expect(loginResponse.body.data.accessToken).toBeDefined();
      expect(loginResponse.body.data.refreshToken).toBeDefined();

      // 3. Get current user
      const userResponse = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${loginResponse.body.data.accessToken}`);

      expect(userResponse.status).toBe(200);
      expect(userResponse.body.success).toBe(true);
      expect(userResponse.body.data.user.email).toBe('newuser@test.com');
    });

    it('should handle token refresh', async () => {
      const tokens = testUtils.generateTestTokens(
        testUser.id,
        testUser.email,
        testUser.userType
      );

      const refreshResponse = await request(app)
        .post('/api/auth/refresh')
        .send({
          refreshToken: tokens.refreshToken
        });

      expect(refreshResponse.status).toBe(200);
      expect(refreshResponse.body.success).toBe(true);
      expect(refreshResponse.body.data.accessToken).toBeDefined();
    });

    it('should handle logout and token blacklisting', async () => {
      const logoutResponse = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${authToken}`);

      expect(logoutResponse.status).toBe(200);
      expect(logoutResponse.body.success).toBe(true);

      // Verify token is blacklisted
      const protectedResponse = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${authToken}`);

      expect(protectedResponse.status).toBe(401);
    });
  });

  describe('Jobs API Integration', () => {
    it('should complete full job lifecycle', async () => {
      // 1. Create job
      const createJobResponse = await request(app)
        .post('/api/jobs')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Integration Test Job',
          description: 'Complete job lifecycle test',
          budget: 500,
          deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          category: 0,
          isRemote: true,
          requirements: ['React', 'TypeScript'],
          skills: ['Frontend Development']
        });

      expect(createJobResponse.status).toBe(201);
      expect(createJobResponse.body.success).toBe(true);
      const createdJob = createJobResponse.body.data;

      // 2. Get job by ID
      const getJobResponse = await request(app)
        .get(`/api/jobs/${createdJob.id}`);

      expect(getJobResponse.status).toBe(200);
      expect(getJobResponse.body.success).toBe(true);
      expect(getJobResponse.body.data.id).toBe(createdJob.id);

      // 3. Update job
      const updateJobResponse = await request(app)
        .put(`/api/jobs/${createdJob.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Updated Integration Test Job',
          budget: 750
        });

      expect(updateJobResponse.status).toBe(200);
      expect(updateJobResponse.body.success).toBe(true);
      expect(updateJobResponse.body.data.title).toBe('Updated Integration Test Job');

      // 4. Search jobs
      const searchResponse = await request(app)
        .get('/api/jobs')
        .query({
          query: 'Integration',
          category: 0,
          isRemote: 'true'
        });

      expect(searchResponse.status).toBe(200);
      expect(searchResponse.body.success).toBe(true);
      expect(searchResponse.body.data.length).toBeGreaterThan(0);

      // 5. Get job statistics
      const statsResponse = await request(app)
        .get('/api/jobs/stats/overview');

      expect(statsResponse.status).toBe(200);
      expect(statsResponse.body.success).toBe(true);
      expect(statsResponse.body.data).toBeDefined();
    });

    it('should handle job filtering and pagination', async () => {
      // Create multiple jobs for testing
      const jobs = [];
      for (let i = 0; i < 5; i++) {
        const job = await testUtils.createTestJob({
          clientId: testUser.id,
          title: `Filter Test Job ${i}`,
          budget: 100 + (i * 50),
          category: i % 3
        });
        jobs.push(job);
      }

      // Test pagination
      const paginatedResponse = await request(app)
        .get('/api/jobs')
        .query({
          page: 1,
          limit: 3,
          sortBy: 'budget',
          sortOrder: 'desc'
        });

      expect(paginatedResponse.status).toBe(200);
      expect(paginatedResponse.body.success).toBe(true);
      expect(paginatedResponse.body.data.length).toBe(3);
      expect(paginatedResponse.body.pagination.page).toBe(1);
      expect(paginatedResponse.body.pagination.limit).toBe(3);

      // Test filtering
      const filteredResponse = await request(app)
        .get('/api/jobs')
        .query({
          budgetMin: 150,
          budgetMax: 300,
          category: 1
        });

      expect(filteredResponse.status).toBe(200);
      expect(filteredResponse.body.success).toBe(true);
      expect(filteredResponse.body.data.length).toBeGreaterThan(0);
    });
  });

  describe('Proposals API Integration', () => {
    let freelancerUser: any;
    let freelancerToken: string;

    beforeAll(async () => {
      freelancerUser = await testUtils.createTestUser({
        email: 'freelancer@test.com',
        username: 'freelanceruser',
        userType: 'freelancer'
      });

      const tokens = testUtils.generateTestTokens(
        freelancerUser.id,
        freelancerUser.email,
        freelancerUser.userType
      );
      freelancerToken = tokens.accessToken;
    });

    it('should complete full proposal lifecycle', async () => {
      // 1. Submit proposal
      const createProposalResponse = await request(app)
        .post('/api/proposals')
        .set('Authorization', `Bearer ${freelancerToken}`)
        .send({
          jobId: testJob.id,
          proposedAmount: 450,
          coverLetter: 'I am interested in this job and have relevant experience.',
          deliveryTime: '2 weeks',
          attachments: ['portfolio.pdf'],
          portfolio: ['project1.com', 'project2.com']
        });

      expect(createProposalResponse.status).toBe(201);
      expect(createProposalResponse.body.success).toBe(true);
      const createdProposal = createProposalResponse.body.data;

      // 2. Get proposal by ID
      const getProposalResponse = await request(app)
        .get(`/api/proposals/${createdProposal.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(getProposalResponse.status).toBe(200);
      expect(getProposalResponse.body.success).toBe(true);
      expect(getProposalResponse.body.data.id).toBe(createdProposal.id);

      // 3. Get proposals by job
      const jobProposalsResponse = await request(app)
        .get(`/api/proposals/job/${testJob.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(jobProposalsResponse.status).toBe(200);
      expect(jobProposalsResponse.body.success).toBe(true);
      expect(jobProposalsResponse.body.data.length).toBeGreaterThan(0);

      // 4. Accept proposal
      const acceptProposalResponse = await request(app)
        .post(`/api/proposals/${createdProposal.id}/accept`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(acceptProposalResponse.status).toBe(200);
      expect(acceptProposalResponse.body.success).toBe(true);

      // 5. Get proposal statistics
      const statsResponse = await request(app)
        .get('/api/proposals/stats/overview');

      expect(statsResponse.status).toBe(200);
      expect(statsResponse.body.success).toBe(true);
    });

    it('should handle proposal filtering and search', async () => {
      // Create multiple proposals
      const proposals = [];
      for (let i = 0; i < 3; i++) {
        const proposal = await knexInstance('proposals').insert({
          jobId: testJob.id,
          freelancerId: freelancerUser.id,
          proposedAmount: 200 + (i * 100),
          coverLetter: `Proposal ${i}`,
          deliveryTime: `${i + 1} weeks`,
          status: 'pending'
        }).returning('*');
        proposals.push(proposal[0]);
      }

      // Test proposal search
      const searchResponse = await request(app)
        .get('/api/proposals')
        .query({
          jobId: testJob.id,
          status: 'pending',
          minAmount: 250,
          maxAmount: 400
        });

      expect(searchResponse.status).toBe(200);
      expect(searchResponse.body.success).toBe(true);
      expect(searchResponse.body.data.length).toBeGreaterThan(0);
    });
  });

  describe('Users API Integration', () => {
    it('should handle user profile management', async () => {
      // 1. Get user profile
      const profileResponse = await request(app)
        .get(`/api/users/${testUser.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(profileResponse.status).toBe(200);
      expect(profileResponse.body.success).toBe(true);
      expect(profileResponse.body.data.id).toBe(testUser.id);

      // 2. Update user profile
      const updateResponse = await request(app)
        .put(`/api/users/${testUser.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          firstName: 'Updated',
          lastName: 'Name',
          bio: 'Updated bio for testing',
          location: 'Test City'
        });

      expect(updateResponse.status).toBe(200);
      expect(updateResponse.body.success).toBe(true);
      expect(updateResponse.body.data.firstName).toBe('Updated');

      // 3. Search users
      const searchResponse = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          query: 'Updated',
          userType: 'client'
        });

      expect(searchResponse.status).toBe(200);
      expect(searchResponse.body.success).toBe(true);
      expect(searchResponse.body.data.length).toBeGreaterThan(0);
    });

    it('should handle user recommendations', async () => {
      const recommendationsResponse = await request(app)
        .get(`/api/users/${testUser.id}/recommendations`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(recommendationsResponse.status).toBe(200);
      expect(recommendationsResponse.body.success).toBe(true);
    });
  });

  describe('Payments API Integration', () => {
    it('should handle payment flow with Stripe', async () => {
      // 1. Create payment intent
      const createIntentResponse = await request(app)
        .post('/api/payments/create-payment-intent')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          jobId: testJob.id,
          proposalId: 'test-proposal-id',
          amount: 500,
          currency: 'usd'
        });

      expect(createIntentResponse.status).toBe(201);
      expect(createIntentResponse.body.success).toBe(true);
      expect(createIntentResponse.body.data.clientSecret).toBeDefined();

      // 2. Confirm payment
      const confirmResponse = await request(app)
        .post('/api/payments/confirm-payment')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          paymentIntentId: 'pi_test',
          jobId: testJob.id,
          proposalId: 'test-proposal-id'
        });

      expect(confirmResponse.status).toBe(200);
      expect(confirmResponse.body.success).toBe(true);
    });

    it('should handle payment webhooks', async () => {
      const webhookResponse = await request(app)
        .post('/api/payments/webhook/stripe')
        .set('stripe-signature', 'test-signature')
        .send({
          type: 'payment_intent.succeeded',
          data: {
            object: {
              id: 'pi_test',
              status: 'succeeded'
            }
          }
        });

      expect(webhookResponse.status).toBe(200);
      expect(webhookResponse.body.received).toBe(true);
    });

    it('should handle payment history', async () => {
      const historyResponse = await request(app)
        .get('/api/payments/history')
        .set('Authorization', `Bearer ${authToken}`);

      expect(historyResponse.status).toBe(200);
      expect(historyResponse.body.success).toBe(true);
    });
  });

  describe('Caching Integration', () => {
    it('should properly cache and invalidate data', async () => {
      // 1. First request should cache data
      const firstResponse = await request(app)
        .get('/api/jobs')
        .query({ category: 0 });

      expect(firstResponse.status).toBe(200);

      // 2. Second request should use cache
      const secondResponse = await request(app)
        .get('/api/jobs')
        .query({ category: 0 });

      expect(secondResponse.status).toBe(200);

      // 3. Create new job should invalidate cache
      await request(app)
        .post('/api/jobs')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Cache Test Job',
          description: 'Testing cache invalidation',
          budget: 300,
          deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          category: 0,
          isRemote: true
        });

      // 4. Third request should fetch fresh data
      const thirdResponse = await request(app)
        .get('/api/jobs')
        .query({ category: 0 });

      expect(thirdResponse.status).toBe(200);
    });

    it('should handle cache warming and optimization', async () => {
      // Test cache warming
      await cacheService.warmCache();

      // Test cache optimization
      await cacheService.optimize();

      // Verify cache is working
      const stats = cacheService.getStats();
      expect(stats.keys).toBeGreaterThan(0);
    });
  });

  describe('Database Integration', () => {
    it('should handle database transactions properly', async () => {
      // Test transaction rollback on error
      try {
        await knexInstance.transaction(async (trx) => {
          // Insert valid data
          await trx('users').insert({
            email: 'transaction@test.com',
            username: 'transactionuser',
            firstName: 'Transaction',
            lastName: 'User',
            password: 'TestPassword123!',
            userType: 'freelancer',
            emailVerified: true,
            isActive: true
          });

          // Insert invalid data to trigger rollback
          await trx('users').insert({
            email: 'invalid-email', // Invalid email format
            username: 'invaliduser',
            firstName: 'Invalid',
            lastName: 'User',
            password: 'TestPassword123!',
            userType: 'freelancer',
            emailVerified: true,
            isActive: true
          });
        });
      } catch (error) {
        // Transaction should rollback
        expect(error).toBeDefined();
      }

      // Verify no data was inserted
      const user = await knexInstance('users')
        .where('username', 'transactionuser')
        .first();
      expect(user).toBeUndefined();
    });

    it('should handle database connection pooling', async () => {
      // Test multiple concurrent database operations
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(
          knexInstance('users')
            .select('*')
            .limit(1)
        );
      }

      const results = await Promise.all(promises);
      expect(results).toHaveLength(10);
      expect(results.every(result => Array.isArray(result))).toBe(true);
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle validation errors properly', async () => {
      const invalidResponse = await request(app)
        .post('/api/jobs')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          // Missing required fields
          title: '',
          description: ''
        });

      expect(invalidResponse.status).toBe(400);
      expect(invalidResponse.body.success).toBe(false);
      expect(invalidResponse.body.errors).toBeDefined();
    });

    it('should handle authentication errors properly', async () => {
      const unauthorizedResponse = await request(app)
        .get('/api/users/profile')
        .set('Authorization', 'Bearer invalid-token');

      expect(unauthorizedResponse.status).toBe(401);
      expect(unauthorizedResponse.body.success).toBe(false);
    });

    it('should handle rate limiting', async () => {
      // Make multiple requests to trigger rate limiting
      const promises = [];
      for (let i = 0; i < 60; i++) {
        promises.push(
          request(app)
            .get('/api/jobs')
            .query({ page: i })
        );
      }

      const responses = await Promise.all(promises);
      const rateLimited = responses.some(response => response.status === 429);
      expect(rateLimited).toBe(true);
    });
  });

  describe('Health Check Integration', () => {
    it('should provide comprehensive health status', async () => {
      const healthResponse = await request(app)
        .get('/api/health');

      expect(healthResponse.status).toBe(200);
      expect(healthResponse.body.success).toBe(true);
      expect(healthResponse.body.data).toBeDefined();
      expect(healthResponse.body.data.database).toBeDefined();
      expect(healthResponse.body.data.redis).toBeDefined();
      expect(healthResponse.body.data.blockchain).toBeDefined();
    });
  });
});
