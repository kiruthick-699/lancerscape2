import { Router, Request, Response } from 'express';
import { authService } from '../services/authService';
import { rateLimit } from 'express-rate-limit';
import { logger } from '../utils/logger';

const router = Router();

// Rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: 'Too many authentication attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // limit each IP to 3 registrations per hour
  message: 'Too many registration attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

// Register new user
router.post('/register', registerLimiter, async (req: Request, res: Response) => {
  try {
    const {
      email,
      username,
      firstName,
      lastName,
      password,
      phone,
      userType,
      walletAddress,
      metadata
    } = req.body;

    // Validate required fields
    if (!email || !username || !firstName || !lastName || !password || !userType) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    // Validate user type
    if (!['client', 'freelancer'].includes(userType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user type'
      });
    }

    const result = await authService.register({
      email,
      username,
      firstName,
      lastName,
      password,
      userType,
      phone,
      walletAddress,
      metadata
    });

    res.status(201).json({
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
    res.status(400).json({
      success: false,
      message: error instanceof Error ? error.message : 'Registration failed'
    });
  }
});

// Login user
router.post('/login', authLimiter, async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    const result = await authService.login(email, password);

    res.json({
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
          twoFactorEnabled: result.user.settings.twoFactorEnabled
        },
        tokens: result.tokens
      }
    });
  } catch (error) {
    logger.error('Login error:', error);
    res.status(401).json({
      success: false,
      message: error instanceof Error ? error.message : 'Login failed'
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

    res.json({
      success: true,
      message: '2FA verification successful',
      data: {
        tokens
      }
    });
  } catch (error) {
    logger.error('2FA verification error:', error);
    res.status(400).json({
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

    res.json({
      success: true,
      message: 'Token refreshed successfully',
      data: {
        tokens
      }
    });
  } catch (error) {
    logger.error('Token refresh error:', error);
    res.status(401).json({
      success: false,
      message: error instanceof Error ? error.message : 'Token refresh failed'
    });
  }
});

// Logout user
router.post('/logout', async (req: Request, res: Response) => {
  try {
    const { accessToken, refreshToken } = req.body;

    if (!accessToken || !refreshToken) {
      return res.status(400).json({
        success: false,
        message: 'Access token and refresh token are required'
      });
    }

    await authService.logout(accessToken, refreshToken);

    res.json({
      success: true,
      message: 'Logout successful'
    });
  } catch (error) {
    logger.error('Logout error:', error);
    res.status(400).json({
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

    res.json({
      success: true,
      message: 'Email verified successfully'
    });
  } catch (error) {
    logger.error('Email verification error:', error);
    res.status(400).json({
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

    res.json({
      success: true,
      message: 'Verification email sent successfully'
    });
  } catch (error) {
    logger.error('Resend verification error:', error);
    res.status(400).json({
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

    res.json({
      success: true,
      message: 'Password reset email sent successfully'
    });
  } catch (error) {
    logger.error('Forgot password error:', error);
    // Don't reveal if user exists
    res.json({
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

    res.json({
      success: true,
      message: 'Password reset successfully'
    });
  } catch (error) {
    logger.error('Password reset error:', error);
    res.status(400).json({
      success: false,
      message: error instanceof Error ? error.message : 'Password reset failed'
    });
  }
});

// Get current user
router.get('/me', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Access token required'
      });
    }

    const accessToken = authHeader.split(' ')[1];
    const payload = await authService.verifyAccessToken(accessToken);

    // Get user data
    const user = await authService.getUserById(payload.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
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
          phoneVerified: user.phoneVerified,
          walletAddress: user.walletAddress,
          reputationScore: user.reputationScore,
          totalEarnings: user.totalEarnings,
          completedJobs: user.completedJobs,
          averageRating: user.averageRating,
          reviewCount: user.reviewCount,
          skills: user.skills,
          categories: user.categories,
          hourlyRate: user.hourlyRate,
          availability: user.availability,
          lastActive: user.lastActive,
          preferences: user.preferences,
          settings: user.settings,
          createdAt: user.createdAt
        }
      }
    });
  } catch (error) {
    logger.error('Get user error:', error);
    res.status(401).json({
      success: false,
      message: error instanceof Error ? error.message : 'Authentication failed'
    });
  }
});

// Update user profile
router.put('/profile', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Access token required'
      });
    }

    const accessToken = authHeader.split(' ')[1];
    const payload = await authService.verifyAccessToken(accessToken);

    const updateData = req.body;
    const updatedUser = await authService.updateUserProfile(payload.userId, updateData);

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user: updatedUser
      }
    });
  } catch (error) {
    logger.error('Profile update error:', error);
    res.status(400).json({
      success: false,
      message: error instanceof Error ? error.message : 'Profile update failed'
    });
  }
});

// Change password
router.put('/change-password', authLimiter, async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Access token required'
      });
    }

    const accessToken = authHeader.split(' ')[1];
    const payload = await authService.verifyAccessToken(accessToken);

    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are required'
      });
    }

    await authService.changePassword(payload.userId, currentPassword, newPassword);

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    logger.error('Password change error:', error);
    res.status(400).json({
      success: false,
      message: error instanceof Error ? error.message : 'Password change failed'
    });
  }
});

// Enable/disable two-factor authentication
router.put('/2fa', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Access token required'
      });
    }

    const accessToken = authHeader.split(' ')[1];
    const payload = await authService.verifyAccessToken(accessToken);

    const { enabled } = req.body;

    if (typeof enabled !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'Enabled flag is required'
      });
    }

    const result = await authService.toggleTwoFactor(payload.userId, enabled);

    res.json({
      success: true,
      message: `Two-factor authentication ${enabled ? 'enabled' : 'disabled'} successfully`,
      data: result
    });
  } catch (error) {
    logger.error('2FA toggle error:', error);
    res.status(400).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to toggle 2FA'
    });
  }
});

export default router; 