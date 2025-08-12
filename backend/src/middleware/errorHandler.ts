import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

export const errorHandler = (
  err: AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let error = { ...err };
  error.message = err.message;

  // Log error with sanitized information
  logger.error({
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: (req as any).user?.id || 'anonymous',
    timestamp: new Date().toISOString(),
  });

  // PostgreSQL error handling
  if (err.name === 'QueryFailedError') {
    const pgError = err as any;
    
    // Handle unique constraint violations
    if (pgError.code === '23505') {
      const message = 'Duplicate field value entered';
      error = { message, statusCode: 400 } as AppError;
    }
    // Handle foreign key violations
    else if (pgError.code === '23503') {
      const message = 'Referenced resource not found';
      error = { message, statusCode: 400 } as AppError;
    }
    // Handle check constraint violations
    else if (pgError.code === '23514') {
      const message = 'Invalid data provided';
      error = { message, statusCode: 400 } as AppError;
    }
    // Handle not null violations
    else if (pgError.code === '23502') {
      const message = 'Required field missing';
      error = { message, statusCode: 400 } as AppError;
    }
    // Handle other PostgreSQL errors
    else {
      const message = 'Database operation failed';
      error = { message, statusCode: 500 } as AppError;
    }
  }

  // Knex/Objection.js validation errors
  if (err.name === 'ValidationError') {
    const message = 'Validation failed';
    error = { message, statusCode: 400 } as AppError;
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    const message = 'Invalid token';
    error = { message, statusCode: 401 } as AppError;
  }

  if (err.name === 'TokenExpiredError') {
    const message = 'Token expired';
    error = { message, statusCode: 401 } as AppError;
  }

  // Rate limiting errors
  if (err.message && err.message.includes('Too many requests')) {
    error.statusCode = 429;
  }

  // Network/connection errors
  if (err.message && (
    err.message.includes('ECONNREFUSED') ||
    err.message.includes('ENOTFOUND') ||
    err.message.includes('ETIMEDOUT')
  )) {
    const message = 'Service temporarily unavailable';
    error = { message, statusCode: 503 } as AppError;
  }

  // Default error response
  const errorResponse = {
    success: false,
    error: error.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { 
      stack: err.stack,
      details: {
        name: err.name,
        code: (err as any).code,
        statusCode: error.statusCode
      }
    }),
    timestamp: new Date().toISOString(),
    requestId: req.headers['x-request-id'] || 'unknown'
  };

  // Set appropriate status code
  const statusCode = error.statusCode || 500;
  
  // Don't send error details in production
  if (process.env.NODE_ENV === 'production' && statusCode >= 500) {
    errorResponse.error = 'Internal Server Error';
    delete errorResponse.stack;
    delete errorResponse.details;
  }

  res.status(statusCode).json(errorResponse);
}; 