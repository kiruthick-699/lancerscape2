import { config } from 'dotenv';
import { knexInstance } from '../database/connection';
import { redisClient } from '../database/redis';

// Load test environment variables
config({ path: '.env.test' });

// Global test setup
beforeAll(async () => {
  // Set test environment
  process.env.NODE_ENV = 'test';
  
  // Initialize test database
  try {
    await knexInstance.migrate.latest();
    console.log('✅ Test database migrations completed');
  } catch (error) {
    console.error('❌ Test database migration failed:', error);
    throw error;
  }
  
  // Clear Redis
  try {
    await redisClient.flushdb();
    console.log('✅ Test Redis cleared');
  } catch (error) {
    console.error('❌ Test Redis clear failed:', error);
    // Continue without Redis for tests
  }
});

// Global test teardown
afterAll(async () => {
  try {
    // Close database connections
    await knexInstance.destroy();
    console.log('✅ Test database connections closed');
  } catch (error) {
    console.error('❌ Test database close failed:', error);
  }
  
  try {
    // Close Redis connections
    await redisClient.quit();
    console.log('✅ Test Redis connections closed');
  } catch (error) {
    console.error('❌ Test Redis close failed:', error);
  }
});

// Global beforeEach hook
beforeEach(async () => {
  // Clear database tables before each test
  const tables = ['users', 'jobs', 'proposals', 'payments', 'messages', 'notifications'];
  
  for (const table of tables) {
    try {
      await knexInstance(table).truncate();
    } catch (error) {
      // Table might not exist, continue
    }
  }
  
  // Clear Redis
  try {
    await redisClient.flushdb();
  } catch (error) {
    // Redis might not be available
  }
});

// Global afterEach hook
afterEach(async () => {
  // Clean up any remaining data
  jest.clearAllMocks();
});

// Test utilities
export const testUtils = {
  // Create test user
  async createTestUser(userData: any = {}) {
    const defaultUser = {
      email: 'test@example.com',
      username: 'testuser',
      firstName: 'Test',
      lastName: 'User',
      password: 'TestPassword123!',
      userType: 'freelancer',
      emailVerified: true,
      isActive: true,
      ...userData
    };
    
    const [user] = await knexInstance('users').insert(defaultUser).returning('*');
    return user;
  },
  
  // Create test job
  async createTestJob(jobData: any = {}) {
    const defaultJob = {
      title: 'Test Job',
      description: 'Test job description',
      budget: 100,
      deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      category: 0,
      isRemote: true,
      status: 'posted',
      clientId: 'test-client-id',
      ...jobData
    };
    
    const [job] = await knexInstance('jobs').insert(defaultJob).returning('*');
    return job;
  },
  
  // Clean up test data
  async cleanupTestData() {
    const tables = ['users', 'jobs', 'proposals', 'payments', 'messages', 'notifications'];
    
    for (const table of tables) {
      try {
        await knexInstance(table).truncate();
      } catch (error) {
        // Table might not exist
      }
    }
  },
  
  // Generate test tokens
  generateTestTokens(userId: string, email: string, userType: string) {
    const jwt = require('jsonwebtoken');
    const secret = process.env.JWT_SECRET || 'test-secret';
    
    const payload = {
      userId,
      email,
      userType,
      sessionId: 'test-session-id'
    };
    
    const accessToken = jwt.sign(payload, secret, { expiresIn: '15m' });
    const refreshToken = jwt.sign(payload, secret, { expiresIn: '7d' });
    
    return { accessToken, refreshToken };
  },
  
  // Mock request object
  createMockRequest(data: any = {}) {
    return {
      body: {},
      params: {},
      query: {},
      headers: {},
      ip: '127.0.0.1',
      method: 'GET',
      url: '/test',
      originalUrl: '/test',
      get: jest.fn((header: string) => {
        const headers: { [key: string]: string } = {
          'user-agent': 'Jest Test Agent',
          'x-client-id': 'test-client-id',
          ...data.headers
        };
        return headers[header.toLowerCase()];
      }),
      ...data
    };
  },
  
  // Mock response object
  createMockResponse() {
    const res: any = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    res.send = jest.fn().mockReturnValue(res);
    res.setHeader = jest.fn().mockReturnValue(res);
    return res;
  },
  
  // Mock next function
  createMockNext() {
    return jest.fn();
  }
};

// Mock external services
jest.mock('../services/emailService', () => ({
  sendEmail: jest.fn().mockResolvedValue(true),
  sendVerificationEmail: jest.fn().mockResolvedValue(true),
  sendPasswordResetEmail: jest.fn().mockResolvedValue(true)
}));

jest.mock('../services/smsService', () => ({
  sendSMS: jest.fn().mockResolvedValue(true),
  sendVerificationSMS: jest.fn().mockResolvedValue(true)
}));

jest.mock('../services/blockchainService', () => ({
  verifySignature: jest.fn().mockResolvedValue(true),
  createEscrow: jest.fn().mockResolvedValue({ escrowId: 'test-escrow-id' }),
  releasePayment: jest.fn().mockResolvedValue(true),
  raiseDispute: jest.fn().mockResolvedValue(true)
}));

// Mock file upload
jest.mock('multer', () => {
  return jest.fn().mockReturnValue({
    single: jest.fn().mockReturnValue((req: any, res: any, next: any) => {
      req.file = {
        fieldname: 'file',
        originalname: 'test.jpg',
        encoding: '7bit',
        mimetype: 'image/jpeg',
        size: 1024,
        destination: '/tmp',
        filename: 'test.jpg',
        path: '/tmp/test.jpg'
      };
      next();
    }),
    array: jest.fn().mockReturnValue((req: any, res: any, next: any) => {
      req.files = [{
        fieldname: 'files',
        originalname: 'test.jpg',
        encoding: '7bit',
        mimetype: 'image/jpeg',
        size: 1024,
        destination: '/tmp',
        filename: 'test.jpg',
        path: '/tmp/test.jpg'
      }];
      next();
    })
  });
});

// Mock AWS SDK
jest.mock('aws-sdk', () => ({
  S3: jest.fn().mockImplementation(() => ({
    upload: jest.fn().mockReturnValue({
      promise: jest.fn().mockResolvedValue({ Location: 'https://test-bucket.s3.amazonaws.com/test.jpg' })
    }),
    deleteObject: jest.fn().mockReturnValue({
      promise: jest.fn().mockResolvedValue({})
    })
  }))
}));

// Mock Stripe
jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
    paymentIntents: {
      create: jest.fn().mockResolvedValue({ id: 'pi_test', client_secret: 'pi_test_secret' }),
      retrieve: jest.fn().mockResolvedValue({ id: 'pi_test', status: 'succeeded' })
    },
    webhooks: {
      constructEvent: jest.fn().mockReturnValue({ type: 'payment_intent.succeeded', data: {} })
    }
  }));
});

// Mock PayPal
jest.mock('paypal-rest-sdk', () => ({
  payment: {
    create: jest.fn().mockResolvedValue({ id: 'PAY-123', state: 'approved' }),
    execute: jest.fn().mockResolvedValue({ id: 'PAY-123', state: 'approved' })
  }
}));

// Mock Twilio
jest.mock('twilio', () => {
  return jest.fn().mockImplementation(() => ({
    messages: {
      create: jest.fn().mockResolvedValue({ sid: 'SM123' })
    }
  }));
});

// Mock Nodemailer
jest.mock('nodemailer', () => ({
  createTransport: jest.fn().mockReturnValue({
    sendMail: jest.fn().mockResolvedValue({ messageId: 'test-message-id' }),
    verify: jest.fn().mockResolvedValue(true)
  })
}));

// Mock Sharp
jest.mock('sharp', () => {
  return jest.fn().mockImplementation(() => ({
    resize: jest.fn().mockReturnThis(),
    jpeg: jest.fn().mockReturnThis(),
    png: jest.fn().mockReturnThis(),
    webp: jest.fn().mockReturnThis(),
    toBuffer: jest.fn().mockResolvedValue(Buffer.from('test-image')),
    metadata: jest.fn().mockResolvedValue({ width: 100, height: 100 })
  }));
});

// Mock Bull Queue
jest.mock('bull', () => {
  return jest.fn().mockImplementation(() => ({
    add: jest.fn().mockResolvedValue({ id: 'test-job-id' }),
    process: jest.fn().mockReturnThis(),
    on: jest.fn().mockReturnThis(),
    close: jest.fn().mockResolvedValue(true)
  }));
});

// Mock Node-Cron
jest.mock('node-cron', () => ({
  schedule: jest.fn().mockReturnValue({
    start: jest.fn(),
    stop: jest.fn()
  })
}));

// Mock Socket.IO
jest.mock('socket.io', () => {
  return jest.fn().mockImplementation(() => ({
    on: jest.fn().mockReturnThis(),
    emit: jest.fn().mockReturnThis(),
    to: jest.fn().mockReturnThis(),
    close: jest.fn().mockResolvedValue(true)
  }));
});

// Global error handler for tests
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

// Export test utilities
export default testUtils;
