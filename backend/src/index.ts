import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';
import xss from 'xss-clean';
import hpp from 'hpp';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';

// Import configurations
import { config } from './config';
import { logger } from './utils/logger';
import { errorHandler } from './middleware/errorHandler';
import { notFoundHandler } from './middleware/notFoundHandler';
import { requestLogger } from './middleware/requestLogger';
import { initializeDatabase, testConnection, closeDatabase, getPoolStatus } from './database/connection';
import { redisClient, redisHealthCheck, closeRedis } from './database/redis';

// Import routes
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import jobRoutes from './routes/jobs';
import proposalRoutes from './routes/proposals';
import paymentRoutes from './routes/payments';
import messageRoutes from './routes/messages';
import notificationRoutes from './routes/notifications';
import blockchainRoutes from './routes/blockchain';
import adminRoutes from './routes/admin';

// Load environment variables
dotenv.config();

const app = express();
const server = createServer(app);

// Initialize Socket.IO with production optimizations
const io = new Server(server, {
  cors: {
    origin: config.corsOrigins,
    methods: ['GET', 'POST'],
    credentials: true
  },
  // Production optimizations
  transports: ['websocket', 'polling'],
  allowEIO3: true,
  pingTimeout: 60000,
  pingInterval: 25000,
  maxHttpBufferSize: 1e6, // 1MB
  allowRequest: (req, callback) => {
    // Add rate limiting for WebSocket connections
    const clientId = req.headers['x-client-id'] || req.ip;
    callback(null, true);
  }
});

// Security middleware with enhanced configuration
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "wss:", "ws:"],
      fontSrc: ["'self'", "https:"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// CORS configuration with security
app.use(cors({
  origin: config.corsOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Client-ID'],
  exposedHeaders: ['X-Request-ID'],
  maxAge: 86400 // 24 hours
}));

// Enhanced rate limiting for production
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: config.security.rateLimitMax, // Configurable limit
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.path === '/health';
  },
  keyGenerator: (req) => {
    // Use client ID if available, otherwise use IP
    return req.headers['x-client-id'] as string || req.ip;
  }
});

const speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000, // 15 minutes
  delayAfter: Math.floor(config.security.rateLimitMax * 0.5), // Allow 50% of requests, then slow down
  delayMs: 500 // begin adding 500ms of delay per request above threshold
});

app.use('/api/', limiter);
app.use('/api/', speedLimiter);

// Body parsing middleware with size limits
app.use(express.json({ 
  limit: '10mb',
  verify: (req, res, buf) => {
    // Store raw body for webhook verification
    (req as any).rawBody = buf;
  }
}));
app.use(express.urlencoded({ 
  extended: true, 
  limit: '10mb',
  parameterLimit: 1000 // Limit number of parameters
}));

// Security middleware
app.use(xss());
app.use(hpp());

// Compression middleware with production settings
app.use(compression({
  level: 6, // Balanced compression
  threshold: 1024, // Only compress responses > 1KB
  filter: (req, res) => {
    // Don't compress responses with this request header
    if (req.headers['x-no-compression']) {
      return false;
    }
    // Use compression
    return compression.filter(req, res);
  }
}));

// Request ID middleware for tracking
app.use((req, res, next) => {
  const requestId = req.headers['x-request-id'] || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  req.headers['x-request-id'] = requestId;
  res.setHeader('X-Request-ID', requestId);
  next();
});

// Logging middleware with performance tracking
app.use(morgan('combined', { 
  stream: { 
    write: (message) => logger.info(message.trim()) 
  } 
}));
app.use(requestLogger);

// Enhanced health check endpoint
app.get('/health', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const dbHealth = await testConnection();
    const redisHealth = await redisHealthCheck();
    const dbPoolStatus = getPoolStatus();
    
    const responseTime = Date.now() - startTime;
    
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: config.nodeEnv,
      version: '1.0.0',
      responseTime: `${responseTime}ms`,
      services: {
        database: {
          status: dbHealth ? 'healthy' : 'unhealthy',
          pool: dbPoolStatus
        },
        redis: {
          status: redisHealth.status,
          responseTime: redisHealth.responseTime,
          memory: redisHealth.memory
        }
      },
      system: {
        memory: process.memoryUsage(),
        cpu: process.cpuUsage(),
        platform: process.platform,
        nodeVersion: process.version
      }
    });
  } catch (error) {
    const responseTime = Date.now() - startTime;
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      responseTime: `${responseTime}ms`,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Metrics endpoint for monitoring
app.get('/metrics', (req, res) => {
  if (config.nodeEnv === 'production' && req.headers.authorization !== `Bearer ${process.env.METRICS_TOKEN}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  const metrics = {
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    cpu: process.cpuUsage(),
    database: getPoolStatus(),
    environment: config.nodeEnv
  };
  
  res.json(metrics);
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: '🚀 Lancerscape2 API is running!',
    version: '1.0.0',
    environment: config.nodeEnv,
    endpoints: {
      health: '/health',
      metrics: '/metrics',
      docs: '/api-docs',
      auth: '/api/auth',
      users: '/api/users',
      jobs: '/api/jobs',
      proposals: '/api/proposals',
      payments: '/api/payments',
      messages: '/api/messages',
      notifications: '/api/notifications',
      blockchain: '/api/blockchain',
      admin: '/api/admin'
    }
  });
});

// API Documentation (development only)
if (config.nodeEnv === 'development') {
  try {
    const swaggerUi = require('swagger-ui-express');
    const swaggerSpec = require('./config/swagger');
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  } catch (error) {
    logger.warn('Swagger documentation not available:', (error as Error).message);
  }
}

// API Routes with performance monitoring
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/proposals', proposalRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/blockchain', blockchainRoutes);
app.use('/api/admin', adminRoutes);

// Error handling middleware
app.use(notFoundHandler);
app.use(errorHandler);

// Graceful shutdown handling
const gracefulShutdown = async (signal: string) => {
  logger.info(`Received ${signal}, starting graceful shutdown...`);
  
  // Stop accepting new connections
  server.close(async () => {
    logger.info('HTTP server closed');
    
    try {
      // Close database connections
      await closeDatabase();
      logger.info('Database connections closed');
      
      // Close Redis connections
      await closeRedis();
      logger.info('Redis connections closed');
      
      // Close Socket.IO
      io.close(() => {
        logger.info('Socket.IO server closed');
        process.exit(0);
      });
    } catch (error) {
      logger.error('Error during graceful shutdown:', error);
      process.exit(1);
    }
  });
  
  // Force exit after timeout
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 30000); // 30 second timeout
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  gracefulShutdown('uncaughtException');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('unhandledRejection');
});

// Initialize services
async function initializeServices() {
  try {
    logger.info('🚀 Starting Lancerscape2 Backend...');
    
    // Initialize database
    logger.info('📊 Initializing database...');
    await initializeDatabase();
    logger.info('✅ Database initialized successfully');
    
    // Test Redis connection
    logger.info('🔴 Testing Redis connection...');
    const redisPing = await redisClient.ping();
    if (redisPing === 'PONG') {
      logger.info('✅ Redis connection successful');
    } else {
      logger.warn('⚠️ Redis connection failed, continuing without Redis');
    }
    
    logger.info('🔗 Frontend URL:', config.frontendUrl);
    logger.info('🌐 CORS Origins:', config.corsOrigins);
    logger.info('🎯 Environment:', config.nodeEnv);
    logger.info('🔒 Security Level:', config.nodeEnv === 'production' ? 'HIGH' : 'DEVELOPMENT');
    
  } catch (error) {
    logger.error('❌ Service initialization failed:', error);
    throw error;
  }
}

// Start server
async function startServer() {
  try {
    await initializeServices();
    
    server.listen(config.port, () => {
      logger.info(`🚀 Server running on port ${config.port}`);
      logger.info(`🌍 Environment: ${config.nodeEnv}`);
      logger.info(`📊 Health check: http://localhost:${config.port}/health`);
      logger.info(`📈 Metrics: http://localhost:${config.port}/metrics`);
      
      if (config.nodeEnv === 'development') {
        logger.info(`📚 API Docs: http://localhost:${config.port}/api-docs`);
      }
    });
    
  } catch (error) {
    logger.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer(); 