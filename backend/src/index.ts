import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';
// @ts-ignore - Missing type definitions
import xss from 'xss-clean';
// @ts-ignore - Missing type definitions
import hpp from 'hpp';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';

import { config } from './config';
import { logger } from './utils/logger';
import { errorHandler } from './middleware/errorHandler';
import { notFoundHandler } from './middleware/notFoundHandler';
import { requestLogger } from './middleware/requestLogger';
import { initializeDatabase, testConnection, closeDatabase, getPoolStatus } from './database/connection';
import { redisClient, redisHealthCheck, closeRedis } from './database/redis';

import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import jobRoutes from './routes/jobs';
import proposalRoutes from './routes/proposals';
import paymentRoutes from './routes/payments';
import messageRoutes from './routes/messages';
import notificationRoutes from './routes/notifications';
import blockchainRoutes from './routes/blockchain';
import adminRoutes from './routes/admin';

dotenv.config();

const app = express();
const server = createServer(app);

const io = new Server(server, {
  cors: {
    origin: config.corsOrigins,
    methods: ['GET', 'POST'],
    credentials: true
  },
  transports: ['websocket', 'polling'],
  allowEIO3: true,
  pingTimeout: 60000,
  pingInterval: 25000,
  maxHttpBufferSize: 1e6,
  allowRequest: (req, callback) => {
    const clientId = req.headers['x-client-id'] || (req as any).ip || req.connection?.remoteAddress || 'unknown';
    callback(null, true);
  }
});

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

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (config.corsOrigins.includes(origin)) return callback(null, true);
    // Allow subdomains of the configured frontend URL
    try {
      const allowed = new URL(config.frontendUrl).hostname;
      const requestHost = new URL(origin).hostname;
      if (allowed === requestHost || requestHost.endsWith(`.${allowed}`)) {
        return callback(null, true);
      }
    } catch {}
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Client-ID'],
  exposedHeaders: ['X-Request-ID'],
  maxAge: 86400
}));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: config.security.rateLimitMax,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    return req.path === '/health';
  },
  keyGenerator: (req) => {
    return req.headers['x-client-id'] as string || (req as any).ip || req.connection?.remoteAddress || 'unknown';
  }
});

const speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000,
  delayAfter: Math.floor(config.security.rateLimitMax * 0.5),
  delayMs: 500
});

app.use('/api/', limiter);
app.use('/api/', speedLimiter);

app.use(express.json({ 
  limit: '10mb',
  verify: (req, res, buf) => {
    (req as any).rawBody = buf;
  }
}));

app.use(express.urlencoded({ 
  extended: true, 
  limit: '10mb',
  parameterLimit: 1000
}));

app.use(xss());
app.use(hpp());

app.use(compression({
  level: 6,
  threshold: 1024,
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  }
}));

app.use((req, res, next) => {
  const requestId = req.headers['x-request-id'] || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  req.headers['x-request-id'] = requestId;
  res.setHeader('X-Request-ID', requestId);
  next();
});

app.use(morgan('combined', { 
  stream: { 
    write: (message) => logger.info(message.trim()) 
  } 
}));

app.use(requestLogger);

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
  
  return res.json(metrics);
});

app.get('/', (req, res) => {
  res.json({
    message: 'Lancerscape2 API is running',
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

if (config.nodeEnv === 'development') {
  try {
    const swaggerUi = require('swagger-ui-express');
    const swaggerSpec = require('./config/swagger');
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  } catch (error) {
    logger.warn('Swagger documentation not available:', (error as Error).message);
  }
}

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/proposals', proposalRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/blockchain', blockchainRoutes);
app.use('/api/admin', adminRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

const gracefulShutdown = async (signal: string) => {
  logger.info(`Received ${signal}, starting graceful shutdown...`);
  
  server.close(async () => {
    logger.info('HTTP server closed');
    
    try {
      await closeDatabase();
      logger.info('Database connections closed');
      
      await closeRedis();
      logger.info('Redis connections closed');
      
      io.close(() => {
        logger.info('Socket.IO server closed');
        process.exit(0);
      });
    } catch (error) {
      logger.error('Error during graceful shutdown:', error);
      process.exit(1);
    }
  });
  
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 30000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('unhandledRejection');
});

async function initializeServices() {
  try {
    logger.info('Starting Lancerscape2 Backend...');
    
    logger.info('Initializing database...');
    await initializeDatabase();
    logger.info('Database initialized successfully');
    
    logger.info('Testing Redis connection...');
    const redisPing = await redisClient.ping();
    if (redisPing === 'PONG') {
      logger.info('Redis connection successful');
    } else {
      logger.warn('Redis connection failed, continuing without Redis');
    }
    
    logger.info('Frontend URL:', config.frontendUrl);
    logger.info('CORS Origins:', config.corsOrigins);
    logger.info('Environment:', config.nodeEnv);
    
  } catch (error) {
    logger.error('Service initialization failed:', error);
    throw error;
  }
}

async function startServer() {
  try {
    await initializeServices();
    
    server.listen(config.port, () => {
      logger.info(`Server running on port ${config.port}`);
      logger.info(`Environment: ${config.nodeEnv}`);
      logger.info(`Health check: http://localhost:${config.port}/health`);
      logger.info(`Metrics: http://localhost:${config.port}/metrics`);
      
      if (config.nodeEnv === 'development') {
        logger.info(`API Docs: http://localhost:${config.port}/api-docs`);
      }
    });
    
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer(); 