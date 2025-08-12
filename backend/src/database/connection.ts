import knex from 'knex';
import { Model } from 'objection';
import { config } from '../config';
import { logger } from '../utils/logger';

// Database configuration with production optimizations
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
    acquireTimeoutMillis: 60000, // Increased for production
    createTimeoutMillis: 60000,  // Increased for production
    destroyTimeoutMillis: 10000, // Increased for production
    idleTimeoutMillis: 300000,   // 5 minutes - increased for production
    reapIntervalMillis: 1000,
    createRetryIntervalMillis: 200, // Increased for production
    afterCreate: (conn: any, done: Function) => {
      // Set session variables for better performance
      conn.query('SET SESSION statement_timeout = 30000;', done);
      conn.query('SET SESSION idle_in_transaction_session_timeout = 300000;', done);
    }
  },
  migrations: {
    directory: '../database/migrations',
    tableName: 'knex_migrations',
  },
  seeds: {
    directory: '../database/seeds',
  },
  debug: config.nodeEnv === 'development',
  // Production optimizations
  asyncStackTraces: config.nodeEnv === 'development',
  postProcessResponse: (result: any) => {
    // Remove undefined values that can cause issues
    if (Array.isArray(result)) {
      return result.map(row => {
        if (row && typeof row === 'object') {
          Object.keys(row).forEach(key => {
            if (row[key] === undefined) {
              delete row[key];
            }
          });
        }
        return row;
      });
    }
    return result;
  }
};

// Create Knex instance
export const knexInstance = knex(dbConfig);

// Bind Objection.js to Knex
Model.knex(knexInstance);

// Database connection test with retry logic
export async function testConnection(retries = 3): Promise<boolean> {
  for (let i = 0; i < retries; i++) {
    try {
      await knexInstance.raw('SELECT 1');
      logger.info('Database connection test successful');
      return true;
    } catch (error) {
      logger.error(`Database connection test failed (attempt ${i + 1}/${retries}):`, error);
      if (i === retries - 1) {
        return false;
      }
      // Wait before retry (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
    }
  }
  return false;
}

// Initialize database with better error handling
export async function initializeDatabase(): Promise<void> {
  try {
    // Test connection
    const isConnected = await testConnection();
    if (!isConnected) {
      throw new Error('Failed to connect to database after multiple attempts');
    }

    // Run migrations
    await knexInstance.migrate.latest();
    logger.info('Database migrations completed');

    // Run seeds in development only
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

// Graceful shutdown with timeout
export async function closeDatabase(): Promise<void> {
  try {
    const timeout = setTimeout(() => {
      logger.warn('Database shutdown timeout, forcing close');
      process.exit(1);
    }, 30000); // 30 second timeout

    await knexInstance.destroy();
    clearTimeout(timeout);
    logger.info('Database connection closed gracefully');
  } catch (error) {
    logger.error('Error closing database connection:', error);
    // Force exit if graceful shutdown fails
    process.exit(1);
  }
}

// Enhanced health check with performance metrics
export async function healthCheck(): Promise<{ 
  status: string; 
  responseTime: number; 
  poolStatus: any;
  activeConnections: number;
}> {
  const start = Date.now();
  try {
    await knexInstance.raw('SELECT 1');
    const responseTime = Date.now() - start;
    
    // Get pool status
    const pool = (knexInstance as any).client.pool;
    const poolStatus = {
      min: pool.min,
      max: pool.max,
      used: pool.used.length,
      free: pool.free.length,
      pending: pool.pending.length
    };
    
    return { 
      status: 'healthy', 
      responseTime,
      poolStatus,
      activeConnections: pool.used.length
    };
  } catch (error) {
    const responseTime = Date.now() - start;
    logger.error('Database health check failed:', error);
    return { 
      status: 'unhealthy', 
      responseTime,
      poolStatus: null,
      activeConnections: 0
    };
  }
}

// Transaction helper with timeout
export async function withTransaction<T>(
  callback: (trx: any) => Promise<T>,
  timeoutMs: number = 30000
): Promise<T> {
  return await knexInstance.transaction(async (trx) => {
    // Set transaction timeout
    await trx.raw(`SET LOCAL statement_timeout = ${timeoutMs}`);
    return await callback(trx);
  });
}

// Query builder helper
export function getQueryBuilder() {
  return knexInstance;
}

// Connection pool monitoring
export function getPoolStatus() {
  const pool = (knexInstance as any).client.pool;
  return {
    min: pool.min,
    max: pool.max,
    used: pool.used.length,
    free: pool.free.length,
    pending: pool.pending.length,
    total: pool.used.length + pool.free.length
  };
}

export default knexInstance; 