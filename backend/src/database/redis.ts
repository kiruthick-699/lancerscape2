import Redis from 'ioredis';
import { logger } from '../utils/logger';

const redisClient = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  maxRetriesPerRequest: 3,
});

redisClient.on('connect', () => {
  logger.info('Redis client connected');
});

redisClient.on('error', (err) => {
  logger.error('Redis Client Error', err);
});

redisClient.on('close', () => {
  logger.info('Redis client disconnected');
});

export const initializeRedis = async () => {
  try {
    await redisClient.ping();
    logger.info('Redis connection established');
  } catch (error) {
    logger.error('Failed to connect to Redis:', error);
    throw error;
  }
};

export { redisClient }; 