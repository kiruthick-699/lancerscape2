import knex from 'knex';
import { Model } from 'objection';
import { config } from '../config';
import { logger } from '../utils/logger';

// Database configuration
const dbConfig = {
  client: 'postgresql',
  connection: {
    host: config.database.host,
    port: config.database.port,
    database: config.database.name,
    user: config.database.username,
    password: config.database.password,
    ssl: config.database.ssl ? { rejectUnauthorized: false } : false,
  },
  pool: {
    min: config.database.pool.min,
    max: config.database.pool.max,
    acquireTimeoutMillis: 30000,
    createTimeoutMillis: 30000,
    destroyTimeoutMillis: 5000,
    idleTimeoutMillis: 30000,
    reapIntervalMillis: 1000,
    createRetryIntervalMillis: 100,
  },
  migrations: {
    directory: '../database/migrations',
    tableName: 'knex_migrations',
  },
  seeds: {
    directory: '../database/seeds',
  },
  debug: config.nodeEnv === 'development',
};

// Create Knex instance
export const knexInstance = knex(dbConfig);

// Bind Objection.js to Knex
Model.knex(knexInstance);

// Database connection test
export async function testConnection(): Promise<boolean> {
  try {
    await knexInstance.raw('SELECT 1');
    logger.info('Database connection test successful');
    return true;
  } catch (error) {
    logger.error('Database connection test failed:', error);
    return false;
  }
}

// Initialize database
export async function initializeDatabase(): Promise<void> {
  try {
    // Test connection
    const isConnected = await testConnection();
    if (!isConnected) {
      throw new Error('Failed to connect to database');
    }

    // Run migrations
    await knexInstance.migrate.latest();
    logger.info('Database migrations completed');

    // Run seeds in development
    if (config.nodeEnv === 'development') {
      await knexInstance.seed.run();
      logger.info('Database seeds completed');
    }

    logger.info('Database initialized successfully');
  } catch (error) {
    logger.error('Database initialization failed:', error);
    throw error;
  }
}

// Graceful shutdown
export async function closeDatabase(): Promise<void> {
  try {
    await knexInstance.destroy();
    logger.info('Database connection closed');
  } catch (error) {
    logger.error('Error closing database connection:', error);
  }
}

// Health check
export async function healthCheck(): Promise<{ status: string; responseTime: number }> {
  const start = Date.now();
  try {
    await knexInstance.raw('SELECT 1');
    const responseTime = Date.now() - start;
    return { status: 'healthy', responseTime };
  } catch (error) {
    const responseTime = Date.now() - start;
    logger.error('Database health check failed:', error);
    return { status: 'unhealthy', responseTime };
  }
}

// Transaction helper
export async function withTransaction<T>(
  callback: (trx: any) => Promise<T>
): Promise<T> {
  return await knexInstance.transaction(callback);
}

// Query builder helper
export function getQueryBuilder() {
  return knexInstance;
}

export default knexInstance; 