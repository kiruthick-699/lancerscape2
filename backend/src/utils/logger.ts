import winston from 'winston';
import 'winston-daily-rotate-file';
import { config } from '../config';

// Custom log format for production
const productionFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.metadata({ fillExcept: ['message', 'level', 'timestamp'] })
);

// Development format for better readability
const developmentFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let metaStr = '';
    if (Object.keys(meta).length > 0) {
      metaStr = ` ${JSON.stringify(meta)}`;
    }
    return `${timestamp} [${level}]: ${message}${metaStr}`;
  })
);

// Create logger instance
const logger = winston.createLogger({
  level: config.monitoring.logLevel,
  format: config.nodeEnv === 'production' ? productionFormat : developmentFormat,
  defaultMeta: { 
    service: 'lancerscape2-backend',
    version: '1.0.0',
    environment: config.nodeEnv
  },
  transports: [
    // Error logs with rotation
    new winston.transports.DailyRotateFile({
      filename: 'logs/error-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      maxSize: '20m',
      maxFiles: '14d', // Keep 14 days of error logs
      zippedArchive: true,
      format: productionFormat
    }),
    
    // Combined logs with rotation
    new winston.transports.DailyRotateFile({
      filename: 'logs/combined-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '30d', // Keep 30 days of combined logs
      zippedArchive: true,
      format: productionFormat
    }),
    
    // Performance logs
    new winston.transports.DailyRotateFile({
      filename: 'logs/performance-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      level: 'info',
      maxSize: '20m',
      maxFiles: '7d', // Keep 7 days of performance logs
      zippedArchive: true,
      format: productionFormat
    })
  ],
  
  // Handle uncaught exceptions
  exceptionHandlers: [
    new winston.transports.DailyRotateFile({
      filename: 'logs/exceptions-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '7d',
      zippedArchive: true,
      format: productionFormat
    })
  ],
  
  // Handle unhandled promise rejections
  rejectionHandlers: [
    new winston.transports.DailyRotateFile({
      filename: 'logs/rejections-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '7d',
      zippedArchive: true,
      format: productionFormat
    })
  ]
});

// Add console transport for development
if (config.nodeEnv !== 'production') {
  logger.add(new winston.transports.Console({
    format: developmentFormat
  }));
}

// Performance logging utility
export const performanceLogger = {
  start: (operation: string, metadata?: any) => {
    const startTime = process.hrtime.bigint();
    return {
      operation,
      startTime,
      metadata,
      end: () => {
        const endTime = process.hrtime.bigint();
        const duration = Number(endTime - startTime) / 1000000; // Convert to milliseconds
        logger.info('Performance', {
          operation,
          duration: `${duration.toFixed(2)}ms`,
          metadata
        });
        return duration;
      }
    };
  },
  
  log: (operation: string, duration: number, metadata?: any) => {
    logger.info('Performance', {
      operation,
      duration: `${duration.toFixed(2)}ms`,
      metadata
    });
  }
};

// Security logging utility
export const securityLogger = {
  loginAttempt: (email: string, success: boolean, ip: string, userAgent: string) => {
    logger.info('Security', {
      event: 'login_attempt',
      email: email.replace(/./g, '*'), // Mask email for privacy
      success,
      ip,
      userAgent,
      timestamp: new Date().toISOString()
    });
  },
  
  passwordChange: (userId: string, ip: string) => {
    logger.info('Security', {
      event: 'password_change',
      userId,
      ip,
      timestamp: new Date().toISOString()
    });
  },
  
  suspiciousActivity: (event: string, details: any) => {
    logger.warn('Security', {
      event: 'suspicious_activity',
      type: event,
      details,
      timestamp: new Date().toISOString()
    });
  }
};

// Database logging utility
export const dbLogger = {
  query: (sql: string, params: any[], duration: number) => {
    if (duration > 1000) { // Log slow queries (>1s)
      logger.warn('Database', {
        event: 'slow_query',
        sql: sql.substring(0, 200) + (sql.length > 200 ? '...' : ''),
        params: params.length,
        duration: `${duration.toFixed(2)}ms`
      });
    }
  },
  
  connection: (event: string, details?: any) => {
    logger.info('Database', {
      event: `connection_${event}`,
      details,
      timestamp: new Date().toISOString()
    });
  }
};

// API logging utility
export const apiLogger = {
  request: (req: any, res: any, duration: number) => {
    const logData = {
      event: 'api_request',
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      duration: `${duration.toFixed(2)}ms`,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      userId: req.user?.id || 'anonymous',
      timestamp: new Date().toISOString()
    };
    
    // Log slow requests
    if (duration > 5000) { // >5s
      logger.warn('API', logData);
    } else {
      logger.info('API', logData);
    }
  },
  
  error: (req: any, error: any, duration?: number) => {
    logger.error('API', {
      event: 'api_error',
      method: req.method,
      url: req.originalUrl,
      error: error.message,
      stack: error.stack,
      duration: duration ? `${duration.toFixed(2)}ms` : undefined,
      ip: req.ip,
      userId: req.user?.id || 'anonymous',
      timestamp: new Date().toISOString()
    });
  }
};

export { logger }; 