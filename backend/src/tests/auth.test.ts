import request from 'supertest';
import { app } from '../index';
import { authService } from '../services/authService';
import { User } from '../models/User';
import { redisClient } from '../database/redis';
import { config } from '../config';

// Mock external services
jest.mock('../services/emailService');
jest.mock('../services/smsService');

describe('Authentication API', () => {
  let testUser: any;
  let authTokens: any;

  beforeAll(async () => {
    // Clear test data
    await redisClient.flushdb();
    
    // Create test user
    testUser = await User.query().insert({
      email: 'test@example.com',
      username: 'testuser',
      firstName: 'Test',
      lastName: 'User',
      password: 'TestPassword123!',
      userType: 'freelancer',
      emailVerified: true,
      isActive: true
    });
  });

  afterAll(async () => {
    // Cleanup
    if (testUser) {
      await User.query().deleteById(testUser.id);
    }
    await redisClient.flushdb();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        email: 'newuser@example.com',
        username: 'newuser',
        firstName: 'New',
        lastName: 'User',
        password: 'NewPassword123!',
        userType: 'client'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe(userData.email);
      expect(response.body.data.tokens).toBeDefined();

      // Cleanup
      await User.query().deleteById(response.body.data.user.id);
    });

    it('should reject registration with invalid email', async () => {
      const userData = {
        email: 'invalid-email',
        username: 'testuser2',
        firstName: 'Test',
        lastName: 'User',
        password: 'TestPassword123!',
        userType: 'freelancer'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should reject registration with weak password', async () => {
      const userData = {
        email: 'weakpass@example.com',
        username: 'weakpass',
        firstName: 'Weak',
        lastName: 'Password',
        password: '123',
        userType: 'client'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should reject duplicate email registration', async () => {
      const userData = {
        email: 'test@example.com', // Already exists
        username: 'duplicate',
        firstName: 'Duplicate',
        lastName: 'User',
        password: 'TestPassword123!',
        userType: 'client'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should enforce rate limiting', async () => {
      const userData = {
        email: 'ratelimit@example.com',
        username: 'ratelimit',
        firstName: 'Rate',
        lastName: 'Limit',
        password: 'TestPassword123!',
        userType: 'freelancer'
      };

      // Make multiple requests to trigger rate limiting
      for (let i = 0; i < 4; i++) {
        await request(app)
          .post('/api/auth/register')
          .send({ ...userData, email: `user${i}@example.com`, username: `user${i}` });
      }

      const response = await request(app)
        .post('/api/auth/register')
        .send({ ...userData, email: 'user4@example.com', username: 'user4' })
        .expect(429);

      expect(response.body.message).toContain('Too many registration attempts');
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login with valid credentials', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'TestPassword123!'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe(loginData.email);
      expect(response.body.data.tokens).toBeDefined();

      authTokens = response.body.data.tokens;
    });

    it('should reject login with invalid email', async () => {
      const loginData = {
        email: 'nonexistent@example.com',
        password: 'TestPassword123!'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should reject login with invalid password', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'WrongPassword123!'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should enforce rate limiting on failed attempts', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'WrongPassword123!'
      };

      // Make multiple failed attempts
      for (let i = 0; i < 6; i++) {
        await request(app)
          .post('/api/auth/login')
          .send(loginData);
      }

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(429);

      expect(response.body.message).toContain('Too many authentication attempts');
    });
  });

  describe('POST /api/auth/refresh', () => {
    it('should refresh tokens successfully', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: authTokens.refreshToken })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.tokens).toBeDefined();
      expect(response.body.data.tokens.accessToken).not.toBe(authTokens.accessToken);
    });

    it('should reject invalid refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: 'invalid-token' })
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return user profile with valid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe('test@example.com');
    });

    it('should reject request without token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Access token required');
    });

    it('should reject request with invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/auth/profile', () => {
    it('should update profile with valid token', async () => {
      const updateData = {
        firstName: 'Updated',
        lastName: 'Name',
        bio: 'Updated bio'
      };

      const response = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.firstName).toBe(updateData.firstName);
    });

    it('should enforce rate limiting on profile updates', async () => {
      const updateData = { bio: 'Rate limit test' };

      // Make multiple updates to trigger rate limiting
      for (let i = 0; i < 11; i++) {
        await request(app)
          .put('/api/auth/profile')
          .set('Authorization', `Bearer ${authTokens.accessToken}`)
          .send({ ...updateData, bio: `Update ${i}` });
      }

      const response = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send(updateData)
        .expect(429);

      expect(response.body.message).toContain('Rate limit exceeded');
    });
  });

  describe('PUT /api/auth/change-password', () => {
    it('should change password with valid current password', async () => {
      const passwordData = {
        currentPassword: 'TestPassword123!',
        newPassword: 'NewPassword123!'
      };

      const response = await request(app)
        .put('/api/auth/change-password')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send(passwordData)
        .expect(200);

      expect(response.body.success).toBe(true);

      // Test login with new password
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'NewPassword123!'
        })
        .expect(200);

      expect(loginResponse.body.success).toBe(true);

      // Reset password for other tests
      await authService.changePassword(testUser.id, 'NewPassword123!', 'TestPassword123!');
    });

    it('should reject password change with wrong current password', async () => {
      const passwordData = {
        currentPassword: 'WrongPassword123!',
        newPassword: 'NewPassword123!'
      };

      const response = await request(app)
        .put('/api/auth/change-password')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send(passwordData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should logout successfully with valid tokens', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send({
          accessToken: authTokens.accessToken,
          refreshToken: authTokens.refreshToken
        })
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify tokens are blacklisted
      const response2 = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect(401);

      expect(response2.body.message).toBe('Token is invalid');
    });
  });

  describe('POST /api/auth/forgot-password', () => {
    it('should send reset email for existing user', async () => {
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'test@example.com' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('If an account with that email exists');
    });

    it('should not reveal if user exists', async () => {
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'nonexistent@example.com' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('If an account with that email exists');
    });
  });

  describe('Security Tests', () => {
    it('should not expose internal error details in production', async () => {
      // This test would require setting NODE_ENV=production
      // For now, we test the validation logic
      const response = await request(app)
        .post('/api/auth/login')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBeDefined();
    });

    it('should validate input data properly', async () => {
      const invalidData = {
        email: 'invalid-email',
        password: '123'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should handle SQL injection attempts', async () => {
      const maliciousData = {
        email: "'; DROP TABLE users; --",
        password: 'password'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(maliciousData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });
});
