import Queue from 'bull';
import { logger } from '../utils/logger';

export const initializeQueue = () => {
  // Example queue for email processing
  const emailQueue = new Queue('email', {
    redis: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
    }
  });

  emailQueue.on('completed', (job) => {
    logger.info(`Email job ${job.id} completed`);
  });

  emailQueue.on('failed', (job, err) => {
    logger.error(`Email job ${job.id} failed:`, err);
  });

  logger.info('Queue system initialized');
  
  return { emailQueue };
}; 