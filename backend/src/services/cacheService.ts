import { redisClient, redisOperations } from '../database/redis';
import { logger } from '../utils/logger';

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  prefix?: string; // Key prefix for organization
  compress?: boolean; // Whether to compress data
}

export interface CacheStats {
  hits: number;
  misses: number;
  keys: number;
  memory: number;
  hitRate: number;
}

export class CacheService {
  private readonly defaultTTL = 3600; // 1 hour
  private readonly defaultPrefix = 'lancerscape2';
  private stats = {
    hits: 0,
    misses: 0,
    keys: 0
  };

  // Generate cache key with prefix
  private generateKey(key: string, prefix?: string): string {
    const keyPrefix = prefix || this.defaultPrefix;
    return `${keyPrefix}:${key}`;
  }

  // Set cache with options
  async set(key: string, value: any, options: CacheOptions = {}): Promise<boolean> {
    try {
      const cacheKey = this.generateKey(key, options.prefix);
      const ttl = options.ttl || this.defaultTTL;
      
      let dataToStore = value;
      
      // Compress data if requested
      if (options.compress && typeof value === 'string' && value.length > 1000) {
        // Simple compression for large strings
        dataToStore = Buffer.from(value).toString('base64');
      }
      
      const serializedValue = JSON.stringify({
        data: dataToStore,
        compressed: options.compress || false,
        timestamp: Date.now()
      });

      const result = await redisOperations.set(cacheKey, serializedValue, ttl);
      
      if (result) {
        this.stats.keys++;
        logger.debug('Cache set successful', { key: cacheKey, ttl, compressed: options.compress });
      }
      
      return result;
    } catch (error) {
      logger.error('Cache set failed:', error);
      return false;
    }
  }

  // Get cache with automatic decompression
  async get<T>(key: string, prefix?: string): Promise<T | null> {
    try {
      const cacheKey = this.generateKey(key, prefix);
      const cachedValue = await redisOperations.get(cacheKey);
      
      if (!cachedValue) {
        this.stats.misses++;
        return null;
      }

      const parsed = JSON.parse(cachedValue);
      
      // Decompress if needed
      let data = parsed.data;
      if (parsed.compressed && typeof data === 'string') {
        try {
          data = Buffer.from(data, 'base64').toString();
        } catch (decompressError) {
          logger.warn('Failed to decompress cached data:', decompressError);
          return null;
        }
      }

      this.stats.hits++;
      logger.debug('Cache hit', { key: cacheKey });
      
      return data as T;
    } catch (error) {
      logger.error('Cache get failed:', error);
      this.stats.misses++;
      return null;
    }
  }

  // Delete cache key
  async delete(key: string, prefix?: string): Promise<boolean> {
    try {
      const cacheKey = this.generateKey(key, prefix);
      const result = await redisOperations.del(cacheKey);
      
      if (result) {
        this.stats.keys = Math.max(0, this.stats.keys - 1);
        logger.debug('Cache delete successful', { key: cacheKey });
      }
      
      return result;
    } catch (error) {
      logger.error('Cache delete failed:', error);
      return false;
    }
  }

  // Check if key exists
  async exists(key: string, prefix?: string): Promise<boolean> {
    try {
      const cacheKey = this.generateKey(key, prefix);
      return await redisOperations.exists(cacheKey);
    } catch (error) {
      logger.error('Cache exists check failed:', error);
      return false;
    }
  }

  // Set multiple cache keys
  async mset(keyValuePairs: Array<{ key: string; value: any; options?: CacheOptions }>): Promise<boolean> {
    try {
      const pipeline = redisClient.pipeline();
      
      for (const { key, value, options } of keyValuePairs) {
        const cacheKey = this.generateKey(key, options?.prefix);
        const ttl = options?.ttl || this.defaultTTL;
        
        let dataToStore = value;
        if (options?.compress && typeof value === 'string' && value.length > 1000) {
          dataToStore = Buffer.from(value).toString('base64');
        }
        
        const serializedValue = JSON.stringify({
          data: dataToStore,
          compressed: options?.compress || false,
          timestamp: Date.now()
        });
        
        pipeline.setex(cacheKey, ttl, serializedValue);
      }
      
      await pipeline.exec();
      this.stats.keys += keyValuePairs.length;
      
      logger.debug('Cache mset successful', { count: keyValuePairs.length });
      return true;
    } catch (error) {
      logger.error('Cache mset failed:', error);
      return false;
    }
  }

  // Get multiple cache keys
  async mget<T>(keys: Array<{ key: string; prefix?: string }>): Promise<Array<T | null>> {
    try {
      const cacheKeys = keys.map(k => this.generateKey(k.key, k.prefix));
      const values = await redisClient.mget(...cacheKeys);
      
      const results: Array<T | null> = [];
      let hitCount = 0;
      
      for (let i = 0; i < values.length; i++) {
        if (values[i]) {
          try {
            const parsed = JSON.parse(values[i]!);
            let data = parsed.data;
            
            if (parsed.compressed && typeof data === 'string') {
              try {
                data = Buffer.from(data, 'base64').toString();
              } catch (decompressError) {
                logger.warn('Failed to decompress cached data:', decompressError);
                results.push(null);
                continue;
              }
            }
            
            results.push(data as T);
            hitCount++;
          } catch (parseError) {
            logger.warn('Failed to parse cached data:', parseError);
            results.push(null);
          }
        } else {
          results.push(null);
        }
      }
      
      this.stats.hits += hitCount;
      this.stats.misses += values.length - hitCount;
      
      logger.debug('Cache mget completed', { requested: keys.length, hits: hitCount });
      return results;
    } catch (error) {
      logger.error('Cache mget failed:', error);
      return keys.map(() => null);
    }
  }

  // Increment counter
  async increment(key: string, value: number = 1, options: CacheOptions = {}): Promise<number | null> {
    try {
      const cacheKey = this.generateKey(key, options.prefix);
      const ttl = options.ttl || this.defaultTTL;
      
      const result = await redisOperations.incr(cacheKey);
      if (result !== null) {
        await redisOperations.expire(cacheKey, ttl);
      }
      
      return result;
    } catch (error) {
      logger.error('Cache increment failed:', error);
      return null;
    }
  }

  // Set cache with expiration
  async setex(key: string, value: any, ttl: number, prefix?: string): Promise<boolean> {
    return this.set(key, value, { ttl, prefix });
  }

  // Get cache and delete (atomic operation)
  async getdel<T>(key: string, prefix?: string): Promise<T | null> {
    try {
      const cacheKey = this.generateKey(key, prefix);
      const value = await redisOperations.get(cacheKey);
      
      if (value) {
        await redisOperations.del(cacheKey);
        this.stats.keys = Math.max(0, this.stats.keys - 1);
        
        try {
          const parsed = JSON.parse(value);
          let data = parsed.data;
          
          if (parsed.compressed && typeof data === 'string') {
            try {
              data = Buffer.from(data, 'base64').toString();
            } catch (decompressError) {
              logger.warn('Failed to decompress cached data:', decompressError);
              return null;
            }
          }
          
          this.stats.hits++;
          return data as T;
        } catch (parseError) {
          logger.warn('Failed to parse cached data:', parseError);
          return null;
        }
      }
      
      this.stats.misses++;
      return null;
    } catch (error) {
      logger.error('Cache getdel failed:', error);
      return null;
    }
  }

  // Clear cache by pattern
  async clearPattern(pattern: string, prefix?: string): Promise<number> {
    try {
      const searchPattern = this.generateKey(pattern, prefix);
      const keys = await redisClient.keys(searchPattern);
      
      if (keys.length > 0) {
        const deleted = await redisClient.del(...keys);
        this.stats.keys = Math.max(0, this.stats.keys - deleted);
        
        logger.debug('Cache pattern clear successful', { pattern: searchPattern, deleted });
        return deleted;
      }
      
      return 0;
    } catch (error) {
      logger.error('Cache pattern clear failed:', error);
      return 0;
    }
  }

  // Get cache statistics
  getStats(): CacheStats {
    const total = this.stats.hits + this.stats.misses;
    const hitRate = total > 0 ? (this.stats.hits / total) * 100 : 0;
    
    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      keys: this.stats.keys,
      memory: 0, // Would need Redis INFO command
      hitRate: Math.round(hitRate * 100) / 100
    };
  }

  // Reset statistics
  resetStats(): void {
    this.stats = { hits: 0, misses: 0, keys: 0 };
    logger.info('Cache statistics reset');
  }

  // Health check
  async healthCheck(): Promise<boolean> {
    try {
      const result = await redisClient.ping();
      return result === 'PONG';
    } catch (error) {
      logger.error('Cache health check failed:', error);
      return false;
    }
  }

  // Cache warming for critical data
  async warmCache(): Promise<void> {
    try {
      logger.info('Starting cache warming...');
      
      // Warm frequently accessed data
      const warmData = [
        { key: 'system:stats', value: { users: 0, jobs: 0, proposals: 0 }, ttl: 300 },
        { key: 'system:categories', value: ['Development', 'Design', 'Marketing', 'Writing'], ttl: 3600 },
        { key: 'system:skills', value: ['React', 'Node.js', 'Python', 'UI/UX'], ttl: 3600 }
      ];
      
      for (const item of warmData) {
        await this.set(item.key, item.value, { ttl: item.ttl });
      }
      
      logger.info('Cache warming completed');
    } catch (error) {
      logger.error('Cache warming failed:', error);
    }
  }

  // Cache invalidation strategies
  async invalidateUserData(userId: string): Promise<void> {
    try {
      const patterns = [
        `user:${userId}:*`,
        `profile:${userId}`,
        `jobs:user:${userId}:*`,
        `proposals:user:${userId}:*`
      ];
      
      for (const pattern of patterns) {
        await this.clearPattern(pattern);
      }
      
      logger.debug('User data cache invalidated', { userId });
    } catch (error) {
      logger.error('User data cache invalidation failed:', error);
    }
  }

  async invalidateJobData(jobId: string): Promise<void> {
    try {
      const patterns = [
        `job:${jobId}`,
        `jobs:search:*`,
        `jobs:category:*`,
        `jobs:stats`
      ];
      
      for (const pattern of patterns) {
        await this.clearPattern(pattern);
      }
      
      logger.debug('Job data cache invalidated', { jobId });
    } catch (error) {
      logger.error('Job data cache invalidation failed:', error);
    }
  }

  // Cache optimization
  async optimize(): Promise<void> {
    try {
      logger.info('Starting cache optimization...');
      
      // Get memory info
      const memoryInfo = await redisClient.memory('USAGE');
      logger.info('Cache memory usage:', { memory: memoryInfo });
      
      // Clear expired keys (Redis does this automatically, but we can trigger it)
      await redisClient.eval(`
        local keys = redis.call('keys', '${this.defaultPrefix}:*')
        local deleted = 0
        for i, key in ipairs(keys) do
          if redis.call('ttl', key) == -1 then
            redis.call('del', key)
            deleted = deleted + 1
          end
        end
        return deleted
      `, 0);
      
      logger.info('Cache optimization completed');
    } catch (error) {
      logger.error('Cache optimization failed:', error);
    }
  }
}

// Export singleton instance
export const cacheService = new CacheService();

// Export for direct use
export default cacheService;
