import Redis from 'ioredis';
import { logger } from '../utils/logger';
import { config } from '../config';

// Redis configuration with production optimizations
const redisConfig = {
  host: config.redis.host,
  port: config.redis.port,
  password: config.redis.password,
  db: config.redis.db,
  // Production optimizations
  maxRetriesPerRequest: 3,
  retryDelayOnFailover: 100,
  enableReadyCheck: true,
  maxLoadingTimeout: 10000,
  lazyConnect: true,
  // Connection pooling
  family: 4, // IPv4
  keepAlive: 30000,
  // Timeouts
  connectTimeout: 10000,
  commandTimeout: 5000,
  // Retry strategy
  retryStrategy: (times: number) => {
    const delay = Math.min(times * 50, 2000);
    if (times > 10) {
      logger.error('Redis connection failed after 10 attempts');
      return null; // Stop retrying
    }
    return delay;
  },
  // Reconnection
  reconnectOnError: (err: Error) => {
    const targetError = 'READONLY';
    if (err.message.includes(targetError)) {
      return true;
    }
    return false;
  }
};

// Create Redis client
const redisClient = new Redis(redisConfig);

// Connection event handlers
redisClient.on('connect', () => {
  logger.info('Redis client connected');
});

redisClient.on('ready', () => {
  logger.info('Redis client ready');
});

redisClient.on('error', (err) => {
  logger.error('Redis Client Error:', err);
});

redisClient.on('close', () => {
  logger.warn('Redis client disconnected');
});

redisClient.on('reconnecting', (delay: number) => {
  logger.info(`Redis client reconnecting in ${delay}ms`);
});

redisClient.on('end', () => {
  logger.warn('Redis client connection ended');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, closing Redis connection');
  redisClient.quit();
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, closing Redis connection');
  redisClient.quit();
});

// Initialize Redis with retry logic
export const initializeRedis = async (retries = 3): Promise<void> => {
  for (let i = 0; i < retries; i++) {
    try {
      await redisClient.ping();
      logger.info('Redis connection established successfully');
      return;
    } catch (error) {
      logger.error(`Failed to connect to Redis (attempt ${i + 1}/${retries}):`, error);
      if (i === retries - 1) {
        throw new Error('Failed to connect to Redis after multiple attempts');
      }
      // Wait before retry (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
    }
  }
};

// Enhanced Redis operations with error handling
export const redisOperations = {
  // Safe get operation
  async get(key: string): Promise<string | null> {
    try {
      return await redisClient.get(key);
    } catch (error) {
      logger.error(`Redis GET error for key ${key}:`, error);
      return null;
    }
  },

  // Safe set operation
  async set(key: string, value: string, ttl?: number): Promise<boolean> {
    try {
      if (ttl) {
        await redisClient.setex(key, ttl, value);
      } else {
        await redisClient.set(key, value);
      }
      return true;
    } catch (error) {
      logger.error(`Redis SET error for key ${key}:`, error);
      return false;
    }
  },

  // Safe delete operation
  async del(key: string): Promise<boolean> {
    try {
      const result = await redisClient.del(key);
      return result > 0;
    } catch (error) {
      logger.error(`Redis DEL error for key ${key}:`, error);
      return false;
    }
  },

  // Safe exists operation
  async exists(key: string): Promise<boolean> {
    try {
      const result = await redisClient.exists(key);
      return result > 0;
    } catch (error) {
      logger.error(`Redis EXISTS error for key ${key}:`, error);
      return false;
    }
  },

  // Safe increment operation
  async incr(key: string): Promise<number | null> {
    try {
      return await redisClient.incr(key);
    } catch (error) {
      logger.error(`Redis INCR error for key ${key}:`, error);
      return null;
    }
  },

  // Safe expire operation
  async expire(key: string, ttl: number): Promise<boolean> {
    try {
      const result = await redisClient.expire(key, ttl);
      return result > 0;
    } catch (error) {
      logger.error(`Redis EXPIRE error for key ${key}:`, error);
      return false;
    }
  }
};

// Health check function
export const redisHealthCheck = async (): Promise<{ 
  status: string; 
  responseTime: number; 
  memory: any;
}> => {
  const start = Date.now();
  try {
    const ping = await redisClient.ping();
    const responseTime = Date.now() - start;
    
    if (ping === 'PONG') {
      // Get memory info
      const memory = await redisClient.memory('USAGE');
      return { 
        status: 'healthy', 
        responseTime,
        memory: memory || 'N/A'
      };
    } else {
      return { 
        status: 'unhealthy', 
        responseTime: Date.now() - start,
        memory: null
      };
    }
  } catch (error) {
    const responseTime = Date.now() - start;
    logger.error('Redis health check failed:', error);
    return { 
      status: 'unhealthy', 
      responseTime,
      memory: null
    };
  }
};

// Close Redis connection
export const closeRedis = async (): Promise<void> => {
  try {
    await redisClient.quit();
    logger.info('Redis connection closed gracefully');
  } catch (error) {
    logger.error('Error closing Redis connection:', error);
    // Force close if graceful shutdown fails
    redisClient.disconnect();
  }
};

export { redisClient }; 