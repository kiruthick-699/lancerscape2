import { Router, Request, Response } from 'express';
import { authService } from '../services/authService';
import { rateLimit } from 'express-rate-limit';
import { logger } from '../utils/logger';
import { validate, schemas } from '../utils/validation';
import { authenticateToken, requireRole, userRateLimit } from '../middleware/authMiddleware';
import { securityLogger } from '../utils/logger';

const router = Router();

// Enhanced rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: 'Too many authentication attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for health checks and metrics
    return req.path === '/health' || req.path === '/metrics';
  },
  keyGenerator: (req) => {
    // Use client ID if available, otherwise use IP
    return req.headers['x-client-id'] as string || req.ip;
  }
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // limit each IP to 3 registrations per hour
  message: 'Too many registration attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.headers['x-client-id'] as string || req.ip;
  }
});

// Register new user
router.post('/register', registerLimiter, async (req: Request, res: Response) => {
  try {
    // Validate input using Joi schema
    const validatedData = validate(schemas.user.register, req.body);

    // Check for suspicious registration patterns
    const clientId = req.headers['x-client-id'] as string;
    const userAgent = req.get('User-Agent');
    const ip = req.ip;

    // Log registration attempt
    logger.info('Registration attempt', {
      email: validatedData.email,
      username: validatedData.username,
      userType: validatedData.userType,
      ip,
      userAgent,
      clientId,
      timestamp: new Date().toISOString()
    });

    const result = await authService.register(validatedData);

    // Log successful registration
    securityLogger.suspiciousActivity('user_registered', {
      ip,
      userAgent,
      clientId,
      userId: result.user.id,
      email: result.user.email,
      userType: result.user.userType
    });

    return res.status(201).json({
      success: true,
      message: 'Registration successful. Please check your email to verify your account.',
      data: {
        user: {
          id: result.user.id,
          email: result.user.email,
          username: result.user.username,
          firstName: result.user.firstName,
          lastName: result.user.lastName,
          userType: result.user.userType,
          isVerified: result.user.isVerified,
          emailVerified: result.user.emailVerified
        },
        tokens: result.tokens
      }
    });
  } catch (error) {
    logger.error('Registration error:', error);
    
    // Don't expose internal error details in production
    const message = process.env.NODE_ENV === 'production' 
      ? 'Registration failed. Please check your input and try again.'
      : error instanceof Error ? error.message : 'Registration failed';
    
    return res.status(400).json({
      success: false,
      message
    });
  }
});

// Login user
router.post('/login', authLimiter, async (req: Request, res: Response) => {
  try {
    // Validate input using Joi schema
    const validatedData = validate(schemas.user.login, req.body);

    const clientId = req.headers['x-client-id'] as string;
    const userAgent = req.get('User-Agent');
    const ip = req.ip;

    // Log login attempt
    logger.info('Login attempt', {
      email: validatedData.email,
      ip,
      userAgent,
      clientId,
      timestamp: new Date().toISOString()
    });

    const result = await authService.login(validatedData.email, validatedData.password);

    // Log successful login
    securityLogger.loginAttempt(validatedData.email, true, ip, userAgent || 'unknown');

    return res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: result.user.id,
          email: result.user.email,
          username: result.user.username,
          firstName: result.user.firstName,
          lastName: result.user.lastName,
          userType: result.user.userType,
          isVerified: result.user.isVerified,
          emailVerified: result.user.emailVerified,
          twoFactorEnabled: result.user.settings?.twoFactorEnabled || false
        },
        tokens: result.tokens
      }
    });
  } catch (error) {
    logger.error('Login error:', error);
    
    // Log failed login attempt
    const email = req.body.email;
    const ip = req.ip;
    const userAgent = req.get('User-Agent');
    if (email) {
      securityLogger.loginAttempt(email, false, ip, userAgent || 'unknown');
    }
    
    // Don't expose internal error details in production
    const message = process.env.NODE_ENV === 'production' 
      ? 'Invalid email or password'
      : error instanceof Error ? error.message : 'Login failed';
    
    return res.status(400).json({
      success: false,
      message
    });
  }
});

// Verify two-factor authentication
router.post('/verify-2fa', authLimiter, async (req: Request, res: Response) => {
  try {
    const { code } = req.body;
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Access token required'
      });
    }

    const accessToken = authHeader.split(' ')[1];
    const payload = await authService.verifyAccessToken(accessToken);

    if (!code) {
      return res.status(400).json({
        success: false,
        message: '2FA code is required'
      });
    }

    const tokens = await authService.verifyTwoFactor(payload.userId, code);

    return res.json({
      success: true,
      message: '2FA verification successful',
      data: {
        tokens
      }
    });
  } catch (error) {
    logger.error('2FA verification error:', error);
    return res.status(400).json({
      success: false,
      message: error instanceof Error ? error.message : '2FA verification failed'
    });
  }
});

// Refresh token
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: 'Refresh token is required'
      });
    }

    const tokens = await authService.refreshToken(refreshToken);

    return res.json({
      success: true,
      message: 'Token refreshed successfully',
      data: {
        tokens
      }
    });
  } catch (error) {
    logger.error('Token refresh error:', error);
    return res.status(401).json({
      success: false,
      message: error instanceof Error ? error.message : 'Token refresh failed'
    });
  }
});

// Logout user
router.post('/logout', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { accessToken, refreshToken } = req.body;

    if (!accessToken || !refreshToken) {
      return res.status(400).json({
        success: false,
        message: 'Access token and refresh token are required'
      });
    }

    await authService.logout(accessToken, refreshToken);

    return res.json({
      success: true,
      message: 'Logout successful'
    });
  } catch (error) {
    logger.error('Logout error:', error);
    return res.status(400).json({
      success: false,
      message: error instanceof Error ? error.message : 'Logout failed'
    });
  }
});

// Verify email
router.post('/verify-email', async (req: Request, res: Response) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Verification token is required'
      });
    }

    await authService.verifyEmail(token);

    return res.json({
      success: true,
      message: 'Email verified successfully'
    });
  } catch (error) {
    logger.error('Email verification error:', error);
    return res.status(400).json({
      success: false,
      message: error instanceof Error ? error.message : 'Email verification failed'
    });
  }
});

// Resend verification email
router.post('/resend-verification', authLimiter, async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    await authService.resendVerificationEmail(email);

    return res.json({
      success: true,
      message: 'Verification email sent successfully'
    });
  } catch (error) {
    logger.error('Resend verification error:', error);
    return res.status(400).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to resend verification email'
    });
  }
});

// Forgot password
router.post('/forgot-password', authLimiter, async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    await authService.forgotPassword(email);

    // Don't reveal if user exists
    return res.json({
      success: true,
      message: 'If an account with that email exists, a password reset email has been sent'
    });
  } catch (error) {
    logger.error('Forgot password error:', error);
    // Don't reveal if user exists
    return res.json({
      success: true,
      message: 'If an account with that email exists, a password reset email has been sent'
    });
  }
});

// Reset password
router.post('/reset-password', authLimiter, async (req: Request, res: Response) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Token and new password are required'
      });
    }

    await authService.resetPassword(token, newPassword);

    return res.json({
      success: true,
      message: 'Password reset successfully'
    });
  } catch (error) {
    logger.error('Password reset error:', error);
    return res.status(400).json({
      success: false,
      message: error instanceof Error ? error.message : 'Password reset failed'
    });
  }
});

// Get current user (protected route)
router.get('/me', authenticateToken, async (req: Request, res: Response) => {
  try {
    // User is already authenticated by middleware
    const user = await authService.getUserById((req as any).user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    return res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          firstName: user.firstName,
          lastName: user.lastName,
          userType: user.userType,
          isVerified: user.isVerified,
          emailVerified: user.emailVerified,
          twoFactorEnabled: user.settings?.twoFactorEnabled || false
        }
      }
    });
  } catch (error) {
    logger.error('Get user error:', error);
    return res.status(401).json({
      success: false,
      message: error instanceof Error ? error.message : 'Authentication failed'
    });
  }
});

// Update user profile (protected route)
router.put('/profile', authenticateToken, userRateLimit(10, 5 * 60 * 1000), async (req: Request, res: Response) => {
  try {
    const updateData = req.body;
    const updatedUser = await authService.updateUserProfile((req as any).user.id, updateData);

    return res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user: updatedUser
      }
    });
  } catch (error) {
    logger.error('Profile update error:', error);
    return res.status(400).json({
      success: false,
      message: error instanceof Error ? error.message : 'Profile update failed'
    });
  }
});

// Change password (protected route)
router.put('/change-password', authenticateToken, userRateLimit(5, 15 * 60 * 1000), async (req: Request, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are required'
      });
    }

    await authService.changePassword((req as any).user.id, currentPassword, newPassword);

    // Log password change
    securityLogger.passwordChange((req as any).user.id, req.ip);

    return res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    logger.error('Password change error:', error);
    return res.status(400).json({
      success: false,
      message: error instanceof Error ? error.message : 'Password change failed'
    });
  }
});

// Enable/disable two-factor authentication (protected route)
router.put('/2fa', authenticateToken, userRateLimit(3, 15 * 60 * 1000), async (req: Request, res: Response) => {
  try {
    const { enabled } = req.body;

    if (typeof enabled !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'Enabled flag is required'
      });
    }

    const result = await authService.toggleTwoFactor((req as any).user.id, enabled);

    return res.json({
      success: true,
      message: `Two-factor authentication ${enabled ? 'enabled' : 'disabled'} successfully`,
      data: result
    });
  } catch (error) {
    logger.error('2FA toggle error:', error);
    return res.status(400).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to toggle 2FA'
    });
  }
});

// Admin-only route for user management
router.get('/admin/users', authenticateToken, requireRole(['admin']), async (req: Request, res: Response) => {
  try {
    // This would typically fetch users with pagination
    // For now, return a placeholder
    return res.json({
      success: true,
      message: 'Admin access granted',
      data: {
        users: []
      }
    });
  } catch (error) {
    logger.error('Admin users error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch users'
    });
  }
});

export default router; 