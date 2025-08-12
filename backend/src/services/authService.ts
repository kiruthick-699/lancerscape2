import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { User } from '../models/User';
import { config } from '../config';
import { logger } from '../utils/logger';
import { redisClient } from '../database/redis';
import { sendEmail } from './emailService';
import { sendSMS } from './smsService';

export interface TokenPayload {
  userId: string;
  email: string;
  userType: string;
  sessionId: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export class AuthService {
  private readonly bcryptRounds = 12;
  private readonly maxLoginAttempts = 5;
  private readonly lockoutDuration = 15 * 60 * 1000; // 15 minutes

  // Verify JWT token
  private verifyToken(token: string): TokenPayload {
    try {
      return jwt.verify(token, config.jwt.secret, {
        issuer: 'lancerscape2',
        audience: 'lancerscape2-users'
      }) as TokenPayload;
    } catch (error) {
      throw new Error('Invalid token');
    }
  }

  // Generate JWT token
  private generateToken(payload: TokenPayload, expiresIn: string): string {
    return jwt.sign(payload, config.jwt.secret, {
      issuer: 'lancerscape2',
      audience: 'lancerscape2-users',
      expiresIn
    } as any);
  }

  // Check login attempts
  private async checkLoginAttempts(email: string): Promise<void> {
    const attemptsKey = `login_attempts:${email}`;
    const attempts = await redisClient.get(attemptsKey);
    
    if (attempts && parseInt(attempts) >= this.maxLoginAttempts) {
      const lockoutTime = await redisClient.get(`lockout:${email}`);
      if (lockoutTime && Date.now() < parseInt(lockoutTime)) {
        const remainingTime = Math.ceil((parseInt(lockoutTime) - Date.now()) / 1000 / 60);
        throw new Error(`Account temporarily locked. Try again in ${remainingTime} minutes.`);
      } else {
        // Reset attempts after lockout period
        await redisClient.del(attemptsKey);
        await redisClient.del(`lockout:${email}`);
      }
    }
  }

  // Record login attempt
  private async recordLoginAttempt(email: string, success: boolean): Promise<void> {
    const attemptsKey = `login_attempts:${email}`;
    
    if (success) {
      // Reset attempts on successful login
      await redisClient.del(attemptsKey);
      await redisClient.del(`lockout:${email}`);
    } else {
      // Increment failed attempts
      const attempts = await redisClient.get(attemptsKey);
      const currentAttempts = attempts ? parseInt(attempts) + 1 : 1;
      
      await redisClient.setex(attemptsKey, this.lockoutDuration, currentAttempts.toString());
      
      if (currentAttempts >= this.maxLoginAttempts) {
        // Lock account
        const lockoutTime = Date.now() + this.lockoutDuration;
        await redisClient.setex(`lockout:${email}`, this.lockoutDuration, lockoutTime.toString());
      }
    }
  }

  // Register new user
  async register(userData: {
    email: string;
    username: string;
    firstName: string;
    lastName: string;
    password: string;
    userType: 'client' | 'freelancer';
    phone?: string;
    walletAddress?: string;
    metadata?: {
      registrationSource: string;
      marketingConsent: boolean;
      termsAccepted: boolean;
      privacyAccepted: boolean;
    };
  }): Promise<{ user: User; tokens: AuthTokens }> {
    try {
      // Validate input data
      // const validation = securityService.validateJobInputs({ // This line was removed as per the new_code
      //   title: userData.firstName, // Reuse validation for name
      //   description: userData.lastName,
      //   budget: '1', // Dummy value
      //   deadline: new Date().toISOString(),
      //   category: 0
      // });

      // if (!validation.isValid) {
      //   throw new Error('Invalid input data');
      // }

      // Check if user already exists
      const existingUser = await User.query()
        .where('email', userData.email)
        .orWhere('username', userData.username)
        .first();

      if (existingUser) {
        throw new Error('User with this email or username already exists');
      }

      // Validate password strength
      // const passwordValidation = securityService.validatePassword(userData.password); // This line was removed as per the new_code
      // if (!passwordValidation.isValid) {
      //   throw new Error(passwordValidation.errors.join(', '));
      // }

      // Create user
      const user = await User.query().insert({
        ...userData,
        metadata: {
          registrationSource: userData.metadata?.registrationSource || 'web',
          marketingConsent: userData.metadata?.marketingConsent || false,
          termsAccepted: userData.metadata?.termsAccepted || false,
          privacyAccepted: userData.metadata?.privacyAccepted || false
        }
      });

      // Generate verification token
      const verificationToken = uuidv4();
      await redisClient.setex(
        `verification:${verificationToken}`,
        24 * 60 * 60, // 24 hours
        JSON.stringify({
          userId: user.id,
          email: user.email,
          type: 'email'
        })
      );

      // Send verification email
      await this.sendVerificationEmail(user, verificationToken);

      // Generate tokens (without email verification)
      const tokens = await this.generateTokens(user);

      // Send welcome email
      await this.sendWelcomeEmail(user);

      logger.info(`User registered: ${user.email}`);
      return { user, tokens };
    } catch (error) {
      logger.error('Registration failed:', error);
      throw error;
    }
  }

  // Login user
  async login(email: string, password: string): Promise<{ user: User; tokens: AuthTokens }> {
    try {
      // Check login attempts
      await this.checkLoginAttempts(email);

      // Find user
      const user = await User.query()
        .where('email', email)
        .orWhere('username', email)
        .first();

      if (!user) {
        await this.recordLoginAttempt(email, false);
        throw new Error('Invalid credentials');
      }

      // Check if user is active
      if (!user.isActive) {
        await this.recordLoginAttempt(email, false);
        throw new Error('Account is deactivated');
      }

      // Check if email is verified
      if (!user.emailVerified) {
        throw new Error('Please verify your email address before logging in');
      }

      // Verify password
      const isValidPassword = await user.verifyPassword(password);
      if (!isValidPassword) {
        await this.recordLoginAttempt(email, false);
        throw new Error('Invalid credentials');
      }

      // Record successful login
      await this.recordLoginAttempt(email, true);

      // Update last active
      await user.updateLastActive();

      // Generate tokens
      const tokens = await this.generateTokens(user);

      // Log login
      await this.logLogin(user);

      logger.info(`User logged in: ${user.email}`);
      return { user, tokens };
    } catch (error) {
      logger.error('Login failed:', error);
      throw error;
    }
  }

  // Verify two-factor authentication
  async verifyTwoFactor(userId: string, code: string): Promise<AuthTokens> {
    try {
      const user = await User.query().findById(userId);
      if (!user || !user.settings.twoFactorEnabled) {
        throw new Error('Two-factor authentication not enabled');
      }

      // Verify 2FA code (implement with your preferred 2FA library)
      const isValidCode = await this.verify2FACode(user.settings.twoFactorSecret!, code);
      if (!isValidCode) {
        throw new Error('Invalid 2FA code');
      }

      // Generate new tokens
      const tokens = await this.generateTokens(user);

      logger.info(`2FA verified for user: ${user.email}`);
      return tokens;
    } catch (error) {
      logger.error('2FA verification failed:', error);
      throw error;
    }
  }

  // Verify 2FA code (placeholder - implement with actual 2FA library)
  private async verify2FACode(secret: string, code: string): Promise<boolean> {
    // This is a placeholder - implement with actual 2FA library like speakeasy
    // For now, we'll use a simple validation
    return code.length === 6 && /^\d+$/.test(code);
  }

  // Refresh token
  async refreshToken(refreshToken: string): Promise<AuthTokens> {
    try {
      // Verify refresh token
      const payload = this.verifyToken(refreshToken);
      
      // Check if refresh token is blacklisted
      const isBlacklisted = await redisClient.get(`blacklist:${refreshToken}`);
      if (isBlacklisted) {
        throw new Error('Token is blacklisted');
      }

      // Get user
      const user = await User.query().findById(payload.userId);
      if (!user || !user.isActive) {
        throw new Error('User not found or inactive');
      }

      // Generate new tokens
      const tokens = await this.generateTokens(user);

      // Blacklist old refresh token
      await redisClient.setex(`blacklist:${refreshToken}`, 7 * 24 * 60 * 60, '1'); // 7 days

      return tokens;
    } catch (error) {
      logger.error('Token refresh failed:', error);
      throw error;
    }
  }

  // Logout user
  async logout(accessToken: string, refreshToken: string): Promise<void> {
    try {
      // Blacklist tokens
      const payload = this.verifyToken(accessToken);
      
      // Blacklist access token
      await redisClient.setex(`blacklist:${accessToken}`, 24 * 60 * 60, '1'); // 24 hours
      
      // Blacklist refresh token
      await redisClient.setex(`blacklist:${refreshToken}`, 7 * 24 * 60 * 60, '1'); // 7 days
      
      // Remove session
      await redisClient.del(`session:${payload.sessionId}`);

      logger.info(`User logged out: ${payload.email}`);
    } catch (error) {
      logger.error('Logout failed:', error);
      throw error;
    }
  }

  // Verify email
  async verifyEmail(token: string): Promise<void> {
    try {
      const verificationData = await redisClient.get(`verification:${token}`);
      if (!verificationData) {
        throw new Error('Invalid or expired verification token');
      }

      const { userId, email, type } = JSON.parse(verificationData);

      if (type !== 'email') {
        throw new Error('Invalid verification type');
      }

      const user = await User.query().findById(userId);
      if (!user || user.email !== email) {
        throw new Error('User not found');
      }

      // Update user verification status
      await user.$query().patch({
        emailVerified: true,
        isVerified: true
      });

      // Remove verification token
      await redisClient.del(`verification:${token}`);

      logger.info(`Email verified for user: ${user.email}`);
    } catch (error) {
      logger.error('Email verification failed:', error);
      throw error;
    }
  }

  // Resend verification email
  async resendVerificationEmail(email: string): Promise<void> {
    try {
      const user = await User.query().where('email', email).first();
      if (!user) {
        throw new Error('User not found');
      }

      if (user.emailVerified) {
        throw new Error('Email already verified');
      }

      // Generate new verification token
      const verificationToken = uuidv4();
      await redisClient.setex(
        `verification:${verificationToken}`,
        24 * 60 * 60, // 24 hours
        JSON.stringify({
          userId: user.id,
          email: user.email,
          type: 'email'
        })
      );

      // Send verification email
      await this.sendVerificationEmail(user, verificationToken);

      logger.info(`Verification email resent to: ${user.email}`);
    } catch (error) {
      logger.error('Resend verification failed:', error);
      throw error;
    }
  }

  // Forgot password
  async forgotPassword(email: string): Promise<void> {
    try {
      const user = await User.query().where('email', email).first();
      if (!user) {
        // Don't reveal if user exists
        return;
      }

      // Generate reset token
      const resetToken = uuidv4();
      await redisClient.setex(
        `reset:${resetToken}`,
        60 * 60, // 1 hour
        JSON.stringify({
          userId: user.id,
          email: user.email,
          type: 'password_reset'
        })
      );

      // Send reset email
      await this.sendPasswordResetEmail(user, resetToken);

      logger.info(`Password reset email sent to: ${user.email}`);
    } catch (error) {
      logger.error('Forgot password failed:', error);
      throw error;
    }
  }

  // Reset password
  async resetPassword(token: string, newPassword: string): Promise<void> {
    try {
      const resetData = await redisClient.get(`reset:${token}`);
      if (!resetData) {
        throw new Error('Invalid or expired reset token');
      }

      const { userId, email, type } = JSON.parse(resetData);

      if (type !== 'password_reset') {
        throw new Error('Invalid reset type');
      }

      const user = await User.query().findById(userId);
      if (!user || user.email !== email) {
        throw new Error('User not found');
      }

      // Validate new password
      // const passwordValidation = securityService.validatePassword(newPassword); // This line was removed as per the new_code
      // if (!passwordValidation.isValid) {
      //   throw new Error(passwordValidation.errors.join(', '));
      // }

      // Update password
      const hashedPassword = await bcrypt.hash(newPassword, this.bcryptRounds);
      await user.$query().patch({
        password: hashedPassword
      });

      // Remove reset token
      await redisClient.del(`reset:${token}`);

      // Blacklist all user sessions
      await this.blacklistUserSessions(userId);

      logger.info(`Password reset for user: ${user.email}`);
    } catch (error) {
      logger.error('Password reset failed:', error);
      throw error;
    }
  }

  // Generate tokens
  private async generateTokens(user: User): Promise<AuthTokens> {
    const sessionId = uuidv4();
    const payload: TokenPayload = {
      userId: user.id,
      email: user.email,
      userType: user.userType,
      sessionId
    };

    const accessToken = this.generateToken(payload, config.jwt.expiresIn);
    const refreshToken = this.generateToken(payload, config.jwt.refreshExpiresIn);

    // Store session in Redis
    await redisClient.setex(
      `session:${sessionId}`,
      7 * 24 * 60 * 60, // 7 days
      JSON.stringify({
        userId: user.id,
        email: user.email,
        userType: user.userType,
        createdAt: new Date().toISOString()
      })
    );

    return {
      accessToken,
      refreshToken,
      expiresIn: 24 * 60 * 60 // 24 hours in seconds
    };
  }

  // Verify access token
  async verifyAccessToken(token: string): Promise<TokenPayload> {
    try {
      const payload = this.verifyToken(token);
      
      // Check if token is blacklisted
      const isBlacklisted = await redisClient.get(`blacklist:${token}`);
      if (isBlacklisted) {
        throw new Error('Token is blacklisted');
      }
      
      // Check if session exists in Redis
      const session = await redisClient.get(`session:${payload.sessionId}`);
      if (!session) {
        throw new Error('Session expired');
      }

      return payload;
    } catch (error) {
      logger.error('Token verification failed:', error);
      throw error;
    }
  }

  // Blacklist user sessions
  private async blacklistUserSessions(userId: string): Promise<void> {
    // This would require tracking all user sessions
    // For now, we'll implement a simple approach
    logger.info(`Blacklisting sessions for user: ${userId}`);
  }

  // Send verification email
  private async sendVerificationEmail(user: User, token: string): Promise<void> {
    try {
      const verificationUrl = `${config.frontendUrl}/verify-email?token=${token}`;
      
      const emailContent = `
        <h2>Welcome to Lancerscape2!</h2>
        <p>Hi ${user.firstName},</p>
        <p>Thank you for registering with Lancerscape2. Please verify your email address by clicking the link below:</p>
        <a href="${verificationUrl}" style="background-color: #007AFF; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
          Verify Email Address
        </a>
        <p>This link will expire in 24 hours.</p>
        <p>If you didn't create an account, you can safely ignore this email.</p>
        <p>Best regards,<br>The Lancerscape2 Team</p>
      `;

      await sendEmail(user.email, 'Verify Your Email Address', emailContent);
    } catch (error) {
      logger.warn('Failed to send verification email (continuing):', error);
    }
  }

  // Send welcome email
  private async sendWelcomeEmail(user: User): Promise<void> {
    try {
      const emailContent = `
        <h2>Welcome to Lancerscape2!</h2>
        <p>Hi ${user.firstName},</p>
        <p>Welcome to Lancerscape2! We're excited to have you on board.</p>
        <p>Here's what you can do next:</p>
        <ul>
          <li>Complete your profile</li>
          <li>Browse available jobs</li>
          <li>Connect your wallet</li>
          <li>Start earning or hiring</li>
        </ul>
        <p>If you have any questions, feel free to reach out to our support team.</p>
        <p>Best regards,<br>The Lancerscape2 Team</p>
      `;

      await sendEmail(user.email, 'Welcome to Lancerscape2!', emailContent);
    } catch (error) {
      logger.warn('Failed to send welcome email (continuing):', error);
    }
  }

  // Send password reset email
  private async sendPasswordResetEmail(user: User, token: string): Promise<void> {
    try {
      const resetUrl = `${config.frontendUrl}/reset-password?token=${token}`;
      
      const emailContent = `
        <h2>Password Reset Request</h2>
        <p>Hi ${user.firstName},</p>
        <p>We received a request to reset your password. Click the link below to create a new password:</p>
        <a href="${resetUrl}" style="background-color: #007AFF; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
          Reset Password
        </a>
        <p>This link will expire in 1 hour.</p>
        <p>If you didn't request a password reset, you can safely ignore this email.</p>
        <p>Best regards,<br>The Lancerscape2 Team</p>
      `;

      await sendEmail(user.email, 'Reset Your Password', emailContent);
    } catch (error) {
      logger.warn('Failed to send password reset email (continuing):', error);
    }
  }

  // Log login
  private async logLogin(user: User): Promise<void> {
    // Log login activity
    await redisClient.lpush(
      `login_history:${user.id}`,
      JSON.stringify({
        timestamp: new Date().toISOString(),
        ip: 'unknown', // Would be passed from request
        userAgent: 'unknown' // Would be passed from request
      })
    );

    // Keep only last 10 logins
    await redisClient.ltrim(`login_history:${user.id}`, 0, 9);
  }

  // Get user by ID
  async getUserById(userId: string): Promise<User | null> {
    try {
      const user = await User.query().findById(userId);
      return user || null;
    } catch (error) {
      logger.error('Get user by ID failed:', error);
      return null;
    }
  }

  // Update user profile
  async updateUserProfile(userId: string, updateData: Partial<User>): Promise<User> {
    try {
      const user = await User.query().findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const updatedUser = await user.$query().patchAndFetch(updateData);
      logger.info(`Profile updated for user: ${user.email}`);
      return updatedUser;
    } catch (error) {
      logger.error('Profile update failed:', error);
      throw error;
    }
  }

  // Change password
  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    try {
      const user = await User.query().findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Verify current password
      const isValidPassword = await user.verifyPassword(currentPassword);
      if (!isValidPassword) {
        throw new Error('Current password is incorrect');
      }

      // Validate new password
      if (newPassword.length < 8) {
        throw new Error('Password must be at least 8 characters long');
      }

      // Update password
      const hashedPassword = await bcrypt.hash(newPassword, this.bcryptRounds);
      await user.$query().patch({
        password: hashedPassword
      });

      // Blacklist all user sessions
      await this.blacklistUserSessions(userId);

      logger.info(`Password changed for user: ${user.email}`);
    } catch (error) {
      logger.error('Password change failed:', error);
      throw error;
    }
  }

  // Toggle two-factor authentication
  async toggleTwoFactor(userId: string, enabled: boolean): Promise<{ secret?: string; qrCode?: string }> {
    try {
      const user = await User.query().findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      if (enabled) {
        // Generate 2FA secret (in production, use a proper 2FA library)
        const secret = uuidv4().replace(/-/g, '').substring(0, 32);
        
        const updatedSettings = {
          ...user.settings,
          twoFactorEnabled: true,
          twoFactorSecret: secret
        };

        await user.$query().patch({
          settings: updatedSettings
        });

        // Generate QR code URL (placeholder)
        const qrCode = `otpauth://totp/Lancerscape2:${user.email}?secret=${secret}&issuer=Lancerscape2`;

        logger.info(`2FA enabled for user: ${user.email}`);
        return { secret, qrCode };
      } else {
        const updatedSettings = {
          ...user.settings,
          twoFactorEnabled: false,
          twoFactorSecret: undefined
        };

        await user.$query().patch({
          settings: updatedSettings
        });

        logger.info(`2FA disabled for user: ${user.email}`);
        return {};
      }
    } catch (error) {
      logger.error('2FA toggle failed:', error);
      throw error;
    }
  }
}

export const authService = new AuthService(); 