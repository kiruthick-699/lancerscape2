import request from 'supertest';
import { app } from '../../index';
import { testUtils } from '../setup';
import { knexInstance } from '../../database/connection';
import Stripe from 'stripe';
import paypal from 'paypal-rest-sdk';

// Mock payment gateways
jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
    paymentIntents: {
      create: jest.fn(),
      retrieve: jest.fn(),
      confirm: jest.fn(),
      cancel: jest.fn(),
      capture: jest.fn()
    },
    webhooks: {
      constructEvent: jest.fn()
    },
    customers: {
      create: jest.fn(),
      retrieve: jest.fn(),
      update: jest.fn()
    },
    paymentMethods: {
      create: jest.fn(),
      retrieve: jest.fn(),
      attach: jest.fn()
    }
  }));
});

jest.mock('paypal-rest-sdk', () => ({
  payment: {
    create: jest.fn(),
    execute: jest.fn(),
    get: jest.fn()
  },
  webhook: {
    verify: jest.fn()
  }
}));

describe('Payment Gateway Integration Tests', () => {
  let testUser: any;
  let testJob: any;
  let testProposal: any;
  let authToken: string;
  let mockStripe: any;
  let mockPayPal: any;

  beforeAll(async () => {
    // Create test user
    testUser = await testUtils.createTestUser({
      email: 'payment@test.com',
      username: 'paymentuser',
      userType: 'client'
    });

    // Create test job
    testJob = await testUtils.createTestJob({
      clientId: testUser.id,
      title: 'Payment Test Job',
      description: 'Job for payment gateway testing'
    });

    // Create test proposal
    testProposal = await knexInstance('proposals').insert({
      jobId: testJob.id,
      freelancerId: 'test-freelancer-id',
      proposedAmount: 500,
      coverLetter: 'Payment test proposal',
      deliveryTime: '2 weeks',
      status: 'pending'
    }).returning('*');

    // Generate auth token
    const tokens = testUtils.generateTestTokens(
      testUser.id,
      testUser.email,
      testUser.userType
    );
    authToken = tokens.accessToken;

    // Initialize mocks
    mockStripe = new Stripe('sk_test_mock');
    mockPayPal = paypal;
  });

  afterAll(async () => {
    await testUtils.cleanupTestData();
  });

  describe('Stripe Integration', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should create payment intent successfully', async () => {
      // Mock Stripe payment intent creation
      const mockPaymentIntent = {
        id: 'pi_test_123',
        client_secret: 'pi_test_secret_123',
        amount: 50000, // $500.00 in cents
        currency: 'usd',
        status: 'requires_payment_method',
        metadata: {
          jobId: testJob.id,
          proposalId: testProposal.id
        }
      };

      mockStripe.paymentIntents.create.mockResolvedValue(mockPaymentIntent);

      // Test payment intent creation
      const response = await request(app)
        .post('/api/payments/create-payment-intent')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          jobId: testJob.id,
          proposalId: testProposal.id,
          amount: 500,
          currency: 'usd',
          paymentMethod: 'card'
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.paymentIntentId).toBe('pi_test_123');
      expect(response.body.data.clientSecret).toBe('pi_test_secret_123');

      // Verify Stripe was called
      expect(mockStripe.paymentIntents.create).toHaveBeenCalledWith({
        amount: 50000,
        currency: 'usd',
        metadata: {
          jobId: testJob.id,
          proposalId: testProposal.id,
          userId: testUser.id
        },
        automatic_payment_methods: {
          enabled: true
        }
      });
    });

    it('should handle payment intent creation failure', async () => {
      // Mock Stripe error
      mockStripe.paymentIntents.create.mockRejectedValue(new Error('Invalid amount'));

      // Test payment intent creation failure
      const response = await request(app)
        .post('/api/payments/create-payment-intent')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          jobId: testJob.id,
          proposalId: testProposal.id,
          amount: -100, // Invalid amount
          currency: 'usd'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid amount');
    });

    it('should confirm payment successfully', async () => {
      // Mock Stripe payment confirmation
      const mockConfirmedIntent = {
        id: 'pi_test_123',
        status: 'succeeded',
        amount: 50000,
        currency: 'usd',
        metadata: {
          jobId: testJob.id,
          proposalId: testProposal.id
        }
      };

      mockStripe.paymentIntents.confirm.mockResolvedValue(mockConfirmedIntent);

      // Test payment confirmation
      const response = await request(app)
        .post('/api/payments/confirm-payment')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          paymentIntentId: 'pi_test_123',
          jobId: testJob.id,
          proposalId: testProposal.id
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('succeeded');

      // Verify Stripe was called
      expect(mockStripe.paymentIntents.confirm).toHaveBeenCalledWith('pi_test_123');
    });

    it('should handle payment confirmation failure', async () => {
      // Mock Stripe confirmation failure
      mockStripe.paymentIntents.confirm.mockRejectedValue(new Error('Payment failed'));

      // Test payment confirmation failure
      const response = await request(app)
        .post('/api/payments/confirm-payment')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          paymentIntentId: 'pi_test_123',
          jobId: testJob.id,
          proposalId: testProposal.id
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Payment failed');
    });

    it('should process Stripe webhooks', async () => {
      // Mock Stripe webhook event construction
      const mockWebhookEvent = {
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_test_123',
            status: 'succeeded',
            amount: 50000,
            currency: 'usd',
            metadata: {
              jobId: testJob.id,
              proposalId: testProposal.id
            }
          }
        }
      };

      mockStripe.webhooks.constructEvent.mockReturnValue(mockWebhookEvent);

      // Test webhook processing
      const response = await request(app)
        .post('/api/payments/webhook/stripe')
        .set('stripe-signature', 'test-signature')
        .send({
          type: 'payment_intent.succeeded',
          data: {
            object: {
              id: 'pi_test_123',
              status: 'succeeded'
            }
          }
        });

      expect(response.status).toBe(200);
      expect(response.body.received).toBe(true);

      // Verify Stripe webhook was processed
      expect(mockStripe.webhooks.constructEvent).toHaveBeenCalled();
    });

    it('should handle customer creation and management', async () => {
      // Mock Stripe customer creation
      const mockCustomer = {
        id: 'cus_test_123',
        email: testUser.email,
        name: `${testUser.firstName} ${testUser.lastName}`,
        metadata: {
          userId: testUser.id
        }
      };

      mockStripe.customers.create.mockResolvedValue(mockCustomer);

      // Test customer creation
      const response = await request(app)
        .post('/api/payments/create-customer')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          email: testUser.email,
          name: `${testUser.firstName} ${testUser.lastName}`,
          paymentMethodId: 'pm_test_123'
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.customerId).toBe('cus_test_123');

      // Verify Stripe was called
      expect(mockStripe.customers.create).toHaveBeenCalledWith({
        email: testUser.email,
        name: `${testUser.firstName} ${testUser.lastName}`,
        metadata: {
          userId: testUser.id
        }
      });
    });
  });

  describe('PayPal Integration', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should create PayPal payment successfully', async () => {
      // Mock PayPal payment creation
      const mockPayPalPayment = {
        id: 'PAY-123456789',
        state: 'created',
        intent: 'sale',
        payer: {
          payment_method: 'paypal'
        },
        transactions: [{
          amount: {
            total: '500.00',
            currency: 'USD'
          },
          description: `Payment for job: ${testJob.title}`
        }]
      };

      mockPayPal.payment.create.mockResolvedValue(mockPayPalPayment);

      // Test PayPal payment creation
      const response = await request(app)
        .post('/api/payments/create-paypal-payment')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          jobId: testJob.id,
          proposalId: testProposal.id,
          amount: 500,
          currency: 'USD',
          returnUrl: 'https://example.com/success',
          cancelUrl: 'https://example.com/cancel'
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.paymentId).toBe('PAY-123456789');
      expect(response.body.data.approvalUrl).toBeDefined();

      // Verify PayPal was called
      expect(mockPayPal.payment.create).toHaveBeenCalledWith({
        intent: 'sale',
        payer: {
          payment_method: 'paypal'
        },
        redirect_urls: {
          return_url: 'https://example.com/success',
          cancel_url: 'https://example.com/cancel'
        },
        transactions: [{
          amount: {
            total: '500.00',
            currency: 'USD'
          },
          description: `Payment for job: ${testJob.title}`,
          custom: JSON.stringify({
            jobId: testJob.id,
            proposalId: testProposal.id,
            userId: testUser.id
          })
        }]
      });
    });

    it('should execute PayPal payment successfully', async () => {
      // Mock PayPal payment execution
      const mockExecutedPayment = {
        id: 'PAY-123456789',
        state: 'approved',
        intent: 'sale',
        transactions: [{
          amount: {
            total: '500.00',
            currency: 'USD'
          },
          related_resources: [{
            sale: {
              id: 'sale_123',
              state: 'completed'
            }
          }]
        }]
      };

      mockPayPal.payment.execute.mockResolvedValue(mockExecutedPayment);

      // Test PayPal payment execution
      const response = await request(app)
        .post('/api/payments/execute-paypal-payment')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          paymentId: 'PAY-123456789',
          payerId: 'payer_123',
          jobId: testJob.id,
          proposalId: testProposal.id
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('approved');

      // Verify PayPal was called
      expect(mockPayPal.payment.execute).toHaveBeenCalledWith('PAY-123456789', {
        payer_id: 'payer_123'
      });
    });

    it('should handle PayPal payment failure', async () => {
      // Mock PayPal payment failure
      mockPayPal.payment.create.mockRejectedValue(new Error('PayPal payment failed'));

      // Test PayPal payment failure
      const response = await request(app)
        .post('/api/payments/create-paypal-payment')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          jobId: testJob.id,
          proposalId: testProposal.id,
          amount: 500,
          currency: 'USD'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('PayPal payment failed');
    });

    it('should verify PayPal webhooks', async () => {
      // Mock PayPal webhook verification
      mockPayPal.webhook.verify.mockReturnValue(true);

      // Test PayPal webhook processing
      const response = await request(app)
        .post('/api/payments/webhook/paypal')
        .send({
          event_type: 'PAYMENT.CAPTURE.COMPLETED',
          resource: {
            id: 'capture_123',
            status: 'COMPLETED',
            amount: {
              value: '500.00',
              currency_code: 'USD'
            },
            custom_id: JSON.stringify({
              jobId: testJob.id,
              proposalId: testProposal.id,
              userId: testUser.id
            })
          }
        });

      expect(response.status).toBe(200);
      expect(response.body.received).toBe(true);

      // Verify PayPal webhook was verified
      expect(mockPayPal.webhook.verify).toHaveBeenCalled();
    });
  });

  describe('Payment Flow Integration', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should complete full payment flow with Stripe', async () => {
      // 1. Create payment intent
      const mockPaymentIntent = {
        id: 'pi_test_123',
        client_secret: 'pi_test_secret_123',
        amount: 50000,
        currency: 'usd',
        status: 'requires_payment_method'
      };

      mockStripe.paymentIntents.create.mockResolvedValue(mockPaymentIntent);

      const createResponse = await request(app)
        .post('/api/payments/create-payment-intent')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          jobId: testJob.id,
          proposalId: testProposal.id,
          amount: 500,
          currency: 'usd'
        });

      expect(createResponse.status).toBe(201);
      const paymentIntentId = createResponse.body.data.paymentIntentId;

      // 2. Confirm payment
      const mockConfirmedIntent = {
        id: paymentIntentId,
        status: 'succeeded',
        amount: 50000,
        currency: 'usd'
      };

      mockStripe.paymentIntents.confirm.mockResolvedValue(mockConfirmedIntent);

      const confirmResponse = await request(app)
        .post('/api/payments/confirm-payment')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          paymentIntentId,
          jobId: testJob.id,
          proposalId: testProposal.id
        });

      expect(confirmResponse.status).toBe(200);
      expect(confirmResponse.body.data.status).toBe('succeeded');

      // 3. Verify payment record in database
      const paymentRecord = await knexInstance('payments')
        .where('jobId', testJob.id)
        .where('proposalId', testProposal.id)
        .first();

      expect(paymentRecord).toBeDefined();
      expect(paymentRecord.amount).toBe(500);
      expect(paymentRecord.status).toBe('completed');
      expect(paymentRecord.paymentMethod).toBe('stripe');
    });

    it('should complete full payment flow with PayPal', async () => {
      // 1. Create PayPal payment
      const mockPayPalPayment = {
        id: 'PAY-123456789',
        state: 'created',
        links: [{
          href: 'https://www.sandbox.paypal.com/cgi-bin/webscr?cmd=_express-checkout&token=EC-123',
          rel: 'approval_url',
          method: 'REDIRECT'
        }]
      };

      mockPayPal.payment.create.mockResolvedValue(mockPayPalPayment);

      const createResponse = await request(app)
        .post('/api/payments/create-paypal-payment')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          jobId: testJob.id,
          proposalId: testProposal.id,
          amount: 500,
          currency: 'USD'
        });

      expect(createResponse.status).toBe(201);
      const paymentId = createResponse.body.data.paymentId;

      // 2. Execute PayPal payment
      const mockExecutedPayment = {
        id: paymentId,
        state: 'approved',
        transactions: [{
          amount: {
            total: '500.00',
            currency: 'USD'
          }
        }]
      };

      mockPayPal.payment.execute.mockResolvedValue(mockExecutedPayment);

      const executeResponse = await request(app)
        .post('/api/payments/execute-paypal-payment')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          paymentId,
          payerId: 'payer_123',
          jobId: testJob.id,
          proposalId: testProposal.id
        });

      expect(executeResponse.status).toBe(200);
      expect(executeResponse.body.data.status).toBe('approved');

      // 3. Verify payment record in database
      const paymentRecord = await knexInstance('payments')
        .where('jobId', testJob.id)
        .where('proposalId', testProposal.id)
        .first();

      expect(paymentRecord).toBeDefined();
      expect(paymentRecord.amount).toBe(500);
      expect(paymentRecord.status).toBe('completed');
      expect(paymentRecord.paymentMethod).toBe('paypal');
    });

    it('should handle payment method switching', async () => {
      // 1. Create payment intent with card
      const mockCardIntent = {
        id: 'pi_test_card',
        client_secret: 'pi_test_card_secret',
        amount: 50000,
        currency: 'usd',
        status: 'requires_payment_method'
      };

      mockStripe.paymentIntents.create.mockResolvedValue(mockCardIntent);

      const cardResponse = await request(app)
        .post('/api/payments/create-payment-intent')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          jobId: testJob.id,
          proposalId: testProposal.id,
          amount: 500,
          currency: 'usd',
          paymentMethod: 'card'
        });

      expect(cardResponse.status).toBe(201);

      // 2. Switch to PayPal
      const mockPayPalPayment = {
        id: 'PAY-SWITCH-123',
        state: 'created',
        links: [{
          href: 'https://www.sandbox.paypal.com/cgi-bin/webscr?cmd=_express-checkout&token=EC-SWITCH',
          rel: 'approval_url',
          method: 'REDIRECT'
        }]
      };

      mockPayPal.payment.create.mockResolvedValue(mockPayPalPayment);

      const paypalResponse = await request(app)
        .post('/api/payments/create-paypal-payment')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          jobId: testJob.id,
          proposalId: testProposal.id,
          amount: 500,
          currency: 'USD'
        });

      expect(paypalResponse.status).toBe(201);
      expect(paypalResponse.body.data.paymentMethod).toBe('paypal');
    });
  });

  describe('Payment Security and Validation', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should validate payment amounts', async () => {
      const invalidAmounts = [-100, 0, 1000001]; // Invalid amounts

      for (const amount of invalidAmounts) {
        const response = await request(app)
          .post('/api/payments/create-payment-intent')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            jobId: testJob.id,
            proposalId: testProposal.id,
            amount,
            currency: 'usd'
          });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
      }
    });

    it('should validate payment currencies', async () => {
      const invalidCurrencies = ['invalid', 'XXX', ''];

      for (const currency of invalidCurrencies) {
        const response = await request(app)
          .post('/api/payments/create-payment-intent')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            jobId: testJob.id,
            proposalId: testProposal.id,
            amount: 500,
            currency
          });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
      }
    });

    it('should prevent duplicate payments', async () => {
      // Create first payment
      const mockPaymentIntent = {
        id: 'pi_test_duplicate',
        client_secret: 'pi_test_duplicate_secret',
        amount: 50000,
        currency: 'usd',
        status: 'requires_payment_method'
      };

      mockStripe.paymentIntents.create.mockResolvedValue(mockPaymentIntent);

      const firstResponse = await request(app)
        .post('/api/payments/create-payment-intent')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          jobId: testJob.id,
          proposalId: testProposal.id,
          amount: 500,
          currency: 'usd'
        });

      expect(firstResponse.status).toBe(201);

      // Attempt duplicate payment
      const duplicateResponse = await request(app)
        .post('/api/payments/create-payment-intent')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          jobId: testJob.id,
          proposalId: testProposal.id,
          amount: 500,
          currency: 'usd'
        });

      expect(duplicateResponse.status).toBe(400);
      expect(duplicateResponse.body.success).toBe(false);
      expect(duplicateResponse.body.message).toContain('Payment already exists');
    });

    it('should validate webhook signatures', async () => {
      // Test invalid webhook signature
      const response = await request(app)
        .post('/api/payments/webhook/stripe')
        .set('stripe-signature', 'invalid-signature')
        .send({
          type: 'payment_intent.succeeded',
          data: {}
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid webhook signature');
    });
  });

  describe('Payment Error Handling', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should handle network failures gracefully', async () => {
      // Mock network failure
      mockStripe.paymentIntents.create.mockRejectedValue(new Error('Network timeout'));

      const response = await request(app)
        .post('/api/payments/create-payment-intent')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          jobId: testJob.id,
          proposalId: testProposal.id,
          amount: 500,
          currency: 'usd'
        });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Payment service temporarily unavailable');
    });

    it('should handle insufficient funds', async () => {
      // Mock insufficient funds error
      const stripeError = new Error('Your card has insufficient funds.');
      stripeError.name = 'CardError';
      stripeError.code = 'card_declined';

      mockStripe.paymentIntents.create.mockRejectedValue(stripeError);

      const response = await request(app)
        .post('/api/payments/create-payment-intent')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          jobId: testJob.id,
          proposalId: testProposal.id,
          amount: 500,
          currency: 'usd'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Insufficient funds');
    });

    it('should handle expired payment methods', async () => {
      // Mock expired card error
      const stripeError = new Error('Your card has expired.');
      stripeError.name = 'CardError';
      stripeError.code = 'expired_card';

      mockStripe.paymentIntents.create.mockRejectedValue(stripeError);

      const response = await request(app)
        .post('/api/payments/create-payment-intent')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          jobId: testJob.id,
          proposalId: testProposal.id,
          amount: 500,
          currency: 'usd'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Card has expired');
    });
  });

  describe('Payment Analytics and Reporting', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should track payment metrics', async () => {
      // Create multiple payments for analytics
      const payments = [];
      for (let i = 0; i < 5; i++) {
        const payment = await knexInstance('payments').insert({
          jobId: testJob.id,
          proposalId: testProposal.id,
          userId: testUser.id,
          amount: 100 + (i * 50),
          currency: 'usd',
          status: 'completed',
          paymentMethod: i % 2 === 0 ? 'stripe' : 'paypal',
          createdAt: new Date()
        }).returning('*');
        payments.push(payment[0]);
      }

      // Get payment analytics
      const analyticsResponse = await request(app)
        .get('/api/payments/analytics')
        .set('Authorization', `Bearer ${authToken}`);

      expect(analyticsResponse.status).toBe(200);
      expect(analyticsResponse.body.success).toBe(true);
      expect(analyticsResponse.body.data.totalPayments).toBe(5);
      expect(analyticsResponse.body.data.totalAmount).toBe(500);
      expect(analyticsResponse.body.data.paymentMethods).toHaveProperty('stripe');
      expect(analyticsResponse.body.data.paymentMethods).toHaveProperty('paypal');
    });

    it('should generate payment reports', async () => {
      // Generate payment report
      const reportResponse = await request(app)
        .get('/api/payments/report')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          startDate: '2024-01-01',
          endDate: '2024-12-31',
          format: 'json'
        });

      expect(reportResponse.status).toBe(200);
      expect(reportResponse.body.success).toBe(true);
      expect(reportResponse.body.data.report).toBeDefined();
      expect(reportResponse.body.data.summary).toBeDefined();
    });
  });
});
