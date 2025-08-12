import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { logger } from '../utils/logger';
import { redisClient } from '../database/redis';
import { securityLogger } from '../utils/logger';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    userType: string;
    sessionId: string;
    permissions?: string[];
  };
}

// Input validation helper
const validateInput = (input: any, type: string): boolean => {
  if (!input) return false;
  
  switch (type) {
    case 'email':
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(input);
    case 'uuid':
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      return uuidRegex.test(input);
    case 'alphanumeric':
      const alphanumericRegex = /^[a-zA-Z0-9]+$/;
      return alphanumericRegex.test(input);
    default:
      return true;
  }
};

// Rate limiting with Redis
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Token verification middleware with enhanced security
export const authenticateToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    // Validate authorization header format
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      securityLogger.suspiciousActivity('invalid_auth_header', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        url: req.originalUrl,
        method: req.method,
        header: authHeader
      });
      res.status(401).json({
        success: false,
        message: 'Invalid authorization header format'
      });
      return;
    }

    const token = authHeader.split(' ')[1];
    
    // Validate token format
    if (!token || token.length < 10) {
      securityLogger.suspiciousActivity('invalid_token_format', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        url: req.originalUrl,
        method: req.method
      });
      res.status(401).json({
        success: false,
        message: 'Invalid token format'
      });
      return;
    }

    // Check if token is blacklisted
    const isBlacklisted = await redisClient.get(`blacklist:${token}`);
    if (isBlacklisted) {
      securityLogger.suspiciousActivity('blacklisted_token', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        url: req.originalUrl,
        method: req.method
      });
      res.status(401).json({
        success: false,
        message: 'Token is invalid'
      });
      return;
    }

    // Verify JWT token with enhanced options
    let payload: any;
    try {
      payload = jwt.verify(token, config.jwt.secret, {
        issuer: 'lancerscape2',
        audience: 'lancerscape2-users',
        algorithms: ['HS256'], // Explicitly specify algorithm
        clockTolerance: 30 // Allow 30 seconds clock skew
      });
    } catch (error) {
      securityLogger.suspiciousActivity('invalid_token', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        url: req.originalUrl,
        method: req.method,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
      return;
    }

    // Validate payload structure
    if (!payload || typeof payload !== 'object' || 
        !payload.userId || !payload.email || !payload.userType || !payload.sessionId) {
      securityLogger.suspiciousActivity('invalid_payload_structure', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        url: req.originalUrl,
        method: req.method
      });
      res.status(401).json({
        success: false,
        message: 'Invalid token payload'
      });
      return;
    }

    // Validate payload data types
    if (typeof payload.userId !== 'string' || 
        typeof payload.email !== 'string' || 
        typeof payload.userType !== 'string' || 
        typeof payload.sessionId !== 'string') {
      securityLogger.suspiciousActivity('invalid_payload_types', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        url: req.originalUrl,
        method: req.method
      });
      res.status(401).json({
        success: false,
        message: 'Invalid token payload types'
      });
      return;
    }

    // Check if session exists in Redis
    const session = await redisClient.get(`session:${payload.sessionId}`);
    if (!session) {
      securityLogger.suspiciousActivity('expired_session', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        url: req.originalUrl,
        method: req.method,
        userId: payload.userId
      });
      res.status(401).json({
        success: false,
        message: 'Session expired'
      });
      return;
    }

    // Validate session data
    let sessionData;
    try {
      sessionData = JSON.parse(session);
    } catch (error) {
      securityLogger.suspiciousActivity('invalid_session_data', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        url: req.originalUrl,
        method: req.method,
        userId: payload.userId
      });
      res.status(401).json({
        success: false,
        message: 'Invalid session data'
      });
      return;
    }

    if (sessionData.userId !== payload.userId || 
        sessionData.email !== payload.email || 
        sessionData.userType !== payload.userType) {
      securityLogger.suspiciousActivity('session_mismatch', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        url: req.originalUrl,
        method: req.method,
        userId: payload.userId,
        sessionUserId: sessionData.userId
      });
      res.status(401).json({
        success: false,
        message: 'Session invalid'
      });
      return;
    }

    // Check session expiration
    if (sessionData.expiresAt && Date.now() > sessionData.expiresAt) {
      securityLogger.suspiciousActivity('expired_session', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        url: req.originalUrl,
        method: req.method,
        userId: payload.userId
      });
      res.status(401).json({
        success: false,
        message: 'Session expired'
      });
      return;
    }

    // Attach user to request
    req.user = {
      id: payload.userId,
      email: payload.email,
      userType: payload.userType,
      sessionId: payload.sessionId,
      permissions: getPermissions(payload.userType)
    };

    // Log successful authentication
    logger.info('Authentication successful', {
      userId: payload.userId,
      email: payload.email,
      userType: payload.userType,
      ip: req.ip,
      url: req.originalUrl,
      method: req.method
    });

    next();
  } catch (error) {
    logger.error('Authentication middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'Authentication error'
    });
  }
};

// Role-based access control middleware with enhanced validation
export const requireRole = (roles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
      return;
    }

    // Validate roles array
    if (!Array.isArray(roles) || roles.length === 0) {
      logger.error('Invalid roles configuration:', roles);
      res.status(500).json({
        success: false,
        message: 'Server configuration error'
      });
      return;
    }

    // Validate role format
    const validRoles = ['admin', 'client', 'freelancer'];
    const invalidRoles = roles.filter(role => !validRoles.includes(role));
    if (invalidRoles.length > 0) {
      logger.error('Invalid roles specified:', invalidRoles);
      res.status(500).json({
        success: false,
        message: 'Server configuration error'
      });
      return;
    }

    if (!roles.includes(req.user.userType)) {
      securityLogger.suspiciousActivity('unauthorized_access', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        url: req.originalUrl,
        method: req.method,
        userId: req.user.id,
        userType: req.user.userType,
        requiredRoles: roles
      });
      res.status(403).json({
        success: false,
        message: 'Insufficient permissions'
      });
      return;
    }

    next();
  };
};

// Permission-based access control middleware with enhanced validation
export const requirePermission = (permissions: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
      return;
    }

    // Validate permissions array
    if (!Array.isArray(permissions) || permissions.length === 0) {
      logger.error('Invalid permissions configuration:', permissions);
      res.status(500).json({
        success: false,
        message: 'Server configuration error'
      });
      return;
    }

    const userPermissions = req.user.permissions || [];
    const hasPermission = permissions.some(permission => 
      userPermissions.includes(permission)
    );

    if (!hasPermission) {
      securityLogger.suspiciousActivity('insufficient_permissions', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        url: req.originalUrl,
        method: req.method,
        userId: req.user.id,
        userType: req.user.userType,
        userPermissions,
        requiredPermissions: permissions
      });
      res.status(403).json({
        success: false,
        message: 'Insufficient permissions'
      });
      return;
    }

    next();
  };
};

// Optional authentication middleware with enhanced security
export const optionalAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      next();
      return;
    }

    const token = authHeader.split(' ')[1];
    
    // Basic token validation
    if (!token || token.length < 10) {
      next();
      return;
    }

    try {
      const isBlacklisted = await redisClient.get(`blacklist:${token}`);
      if (isBlacklisted) {
        next();
        return;
      }

      const payload = jwt.verify(token, config.jwt.secret, {
        issuer: 'lancerscape2',
        audience: 'lancerscape2-users',
        algorithms: ['HS256']
      }) as any;

      // Validate payload structure
      if (!payload || !payload.userId || !payload.email || !payload.userType || !payload.sessionId) {
        next();
        return;
      }

      const session = await redisClient.get(`session:${payload.sessionId}`);
      if (session) {
        try {
          const sessionData = JSON.parse(session);
          if (sessionData.userId === payload.userId && 
              sessionData.email === payload.email && 
              sessionData.userType === payload.userType) {
            req.user = {
              id: payload.userId,
              email: payload.email,
              userType: payload.userType,
              sessionId: payload.sessionId,
              permissions: getPermissions(payload.userType)
            };
          }
        } catch (error) {
          logger.debug('Session parsing failed:', error);
        }
      }
    } catch (error) {
      logger.debug('Optional auth failed, continuing without user:', error);
    }

    next();
  } catch (error) {
    logger.error('Optional auth middleware error:', error);
    next();
  }
};

// Enhanced rate limiting for authenticated users with Redis
export const userRateLimit = (maxRequests: number, windowMs: number = 15 * 60 * 1000) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      next();
      return;
    }

    // Validate parameters
    if (maxRequests <= 0 || windowMs <= 0) {
      logger.error('Invalid rate limit parameters:', { maxRequests, windowMs });
      res.status(500).json({
        success: false,
        message: 'Server configuration error'
      });
      return;
    }

    const key = `user_rate_limit:${req.user.id}`;
    
    try {
      const current = await redisClient.get(key);
      const currentCount = current ? parseInt(current) : 0;

      if (currentCount >= maxRequests) {
        securityLogger.suspiciousActivity('rate_limit_exceeded', {
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          url: req.originalUrl,
          method: req.method,
          userId: req.user.id,
          currentCount,
          maxRequests
        });
        res.status(429).json({
          success: false,
          message: 'Rate limit exceeded',
          retryAfter: Math.ceil(windowMs / 1000)
        });
        return;
      }

      // Increment counter with expiration
      await redisClient.setex(key, Math.floor(windowMs / 1000), (currentCount + 1).toString());
      next();
    } catch (error) {
      logger.error('Rate limiting error:', error);
      // Continue without rate limiting if Redis fails
      next();
    }
  };
};

// Enhanced ownership validation middleware
export const requireOwnership = (resourceType: string, resourceIdParam: string = 'id') => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
      return;
    }

    const resourceId = req.params[resourceIdParam];
    if (!resourceId) {
      res.status(400).json({
        success: false,
        message: 'Resource ID required'
      });
      return;
    }

    // Validate resource ID format
    if (!validateInput(resourceId, 'alphanumeric')) {
      res.status(400).json({
        success: false,
        message: 'Invalid resource ID format'
      });
      return;
    }

    try {
      // This would typically check against the database
      // For now, we'll implement a basic check
      // In production, you'd want to check the actual resource ownership
      
      // Example for jobs:
      if (resourceType === 'job') {
        // Check if user owns the job or is admin
        if (req.user.userType === 'admin') {
          next();
          return;
        }
        
        // For now, allow access (implement proper ownership check)
        next();
        return;
      }

      // Example for user profile:
      if (resourceType === 'user') {
        if (req.user.id === resourceId || req.user.userType === 'admin') {
          next();
          return;
        }
      }

      // Default: deny access
      securityLogger.suspiciousActivity('ownership_violation', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        url: req.originalUrl,
        method: req.method,
        userId: req.user.id,
        userType: req.user.userType,
        resourceType,
        resourceId
      });

      res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    } catch (error) {
      logger.error('Ownership validation error:', error);
      res.status(500).json({
        success: false,
        message: 'Validation error'
      });
    }
  };
};

// Get permissions based on user type with validation
function getPermissions(userType: string): string[] {
  const permissions: { [key: string]: string[] } = {
    admin: [
      'users:read', 'users:write', 'users:delete',
      'jobs:read', 'jobs:write', 'jobs:delete',
      'payments:read', 'payments:write', 'payments:delete',
      'system:read', 'system:write', 'system:delete',
      'analytics:read', 'analytics:write'
    ],
    client: [
      'profile:read', 'profile:write',
      'jobs:create', 'jobs:read', 'jobs:write', 'jobs:delete',
      'proposals:read', 'proposals:write',
      'payments:create', 'payments:read',
      'messages:read', 'messages:write'
    ],
    freelancer: [
      'profile:read', 'profile:write',
      'jobs:read', 'jobs:apply',
      'proposals:create', 'proposals:read', 'proposals:write',
      'payments:read',
      'messages:read', 'messages:write',
      'portfolio:read', 'portfolio:write'
    ]
  };

  return permissions[userType] || [];
}

// Export middleware functions
export default {
  authenticateToken,
  requireRole,
  requirePermission,
  optionalAuth,
  userRateLimit,
  requireOwnership
};
