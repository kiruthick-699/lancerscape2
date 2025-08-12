import { knex } from '../database/connection';
import { logger } from '../utils/logger';
import { cacheService } from './cacheService';
import { config } from '../config';

export interface QueryMetrics {
  query: string;
  executionTime: number;
  rowsReturned: number;
  timestamp: Date;
  userId?: string;
  endpoint?: string;
  method?: string;
}

export interface QueryAnalysis {
  slowQueries: QueryMetrics[];
  frequentQueries: Array<{
    query: string;
    count: number;
    avgExecutionTime: number;
    totalExecutionTime: number;
  }>;
  optimizationSuggestions: string[];
}

export interface IndexRecommendation {
  table: string;
  columns: string[];
  type: 'btree' | 'hash' | 'gin' | 'gist';
  reason: string;
  estimatedImprovement: string;
}

export class QueryOptimizer {
  private queryHistory: QueryMetrics[] = [];
  private readonly maxHistorySize = 1000;
  private readonly slowQueryThreshold = 1000; // 1 second
  private readonly frequentQueryThreshold = 10; // queries per hour

  // Track query execution
  async trackQuery(
    query: string,
    executionTime: number,
    rowsReturned: number,
    userId?: string,
    endpoint?: string,
    method?: string
  ): Promise<void> {
    try {
      const metrics: QueryMetrics = {
        query: this.sanitizeQuery(query),
        executionTime,
        rowsReturned,
        timestamp: new Date(),
        userId,
        endpoint,
        method
      };

      this.queryHistory.push(metrics);

      // Keep history size manageable
      if (this.queryHistory.length > this.maxHistorySize) {
        this.queryHistory = this.queryHistory.slice(-this.maxHistorySize);
      }

      // Log slow queries
      if (executionTime > this.slowQueryThreshold) {
        logger.warn('Slow query detected', {
          query: metrics.query,
          executionTime,
          rowsReturned,
          userId,
          endpoint,
          method
        });
      }

      // Cache query metrics for analysis
      const cacheKey = `query:metrics:${this.hashQuery(query)}`;
      await cacheService.set(cacheKey, metrics, { ttl: 3600 });
    } catch (error) {
      logger.error('Failed to track query metrics:', error);
    }
  }

  // Sanitize query for logging (remove sensitive data)
  private sanitizeQuery(query: string): string {
    return query
      .replace(/\b(password|secret|token|key)\s*=\s*['"][^'"]*['"]/gi, '$1=***')
      .replace(/\b\d{4}-\d{4}-\d{4}-\d{4}\b/g, '****-****-****-****') // UUID
      .replace(/\b0x[a-fA-F0-9]{40}\b/g, '0x***') // Ethereum address
      .substring(0, 500); // Limit length
  }

  // Hash query for caching
  private hashQuery(query: string): string {
    const crypto = require('crypto');
    return crypto.createHash('md5').update(query).digest('hex');
  }

  // Analyze query performance
  async analyzeQueryPerformance(): Promise<QueryAnalysis> {
    try {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

      // Filter recent queries
      const recentQueries = this.queryHistory.filter(
        q => q.timestamp > oneHourAgo
      );

      // Find slow queries
      const slowQueries = recentQueries.filter(
        q => q.executionTime > this.slowQueryThreshold
      );

      // Analyze frequent queries
      const queryFrequency = new Map<string, {
        count: number;
        totalTime: number;
        queries: QueryMetrics[];
      }>();

      recentQueries.forEach(query => {
        const key = this.hashQuery(query.query);
        const existing = queryFrequency.get(key);
        
        if (existing) {
          existing.count++;
          existing.totalTime += query.executionTime;
          existing.queries.push(query);
        } else {
          queryFrequency.set(key, {
            count: 1,
            totalTime: query.executionTime,
            queries: [query]
          });
        }
      });

      // Get frequent queries
      const frequentQueries = Array.from(queryFrequency.entries())
        .filter(([_, data]) => data.count >= this.frequentQueryThreshold)
        .map(([_, data]) => ({
          query: data.queries[0].query,
          count: data.count,
          avgExecutionTime: data.totalTime / data.count,
          totalExecutionTime: data.totalTime
        }))
        .sort((a, b) => b.count - a.count);

      // Generate optimization suggestions
      const optimizationSuggestions = this.generateOptimizationSuggestions(
        slowQueries,
        frequentQueries
      );

      return {
        slowQueries,
        frequentQueries,
        optimizationSuggestions
      };
    } catch (error) {
      logger.error('Failed to analyze query performance:', error);
      return {
        slowQueries: [],
        frequentQueries: [],
        optimizationSuggestions: ['Failed to analyze queries']
      };
    }
  }

  // Generate optimization suggestions
  private generateOptimizationSuggestions(
    slowQueries: QueryMetrics[],
    frequentQueries: Array<{
      query: string;
      count: number;
      avgExecutionTime: number;
      totalExecutionTime: number;
    }>
  ): string[] {
    const suggestions: string[] = [];

    // Analyze slow queries
    slowQueries.forEach(query => {
      if (query.query.toLowerCase().includes('select *')) {
        suggestions.push('Consider selecting only needed columns instead of SELECT *');
      }
      
      if (query.query.toLowerCase().includes('like %')) {
        suggestions.push('Consider using full-text search or indexed columns for LIKE queries');
      }
      
      if (query.rowsReturned > 1000) {
        suggestions.push('Consider implementing pagination for large result sets');
      }
    });

    // Analyze frequent queries
    frequentQueries.forEach(query => {
      if (query.avgExecutionTime > 500) {
        suggestions.push(`Optimize frequently executed query: ${query.query.substring(0, 100)}...`);
      }
    });

    // General suggestions
    if (suggestions.length === 0) {
      suggestions.push('Query performance is within acceptable limits');
    }

    return suggestions;
  }

  // Get database statistics
  async getDatabaseStats(): Promise<{
    tableSizes: Array<{ table: string; size: string; rows: number }>;
    indexUsage: Array<{ index: string; usage: number }>;
    connectionInfo: { active: number; idle: number; total: number };
    cacheHitRate: number;
  }> {
    try {
      // Get table sizes and row counts
      const tableStats = await knex.raw(`
        SELECT 
          schemaname,
          tablename,
          pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
          n_tup_ins + n_tup_upd + n_tup_del as total_operations
        FROM pg_stat_user_tables 
        ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
        LIMIT 20
      `);

      // Get index usage statistics
      const indexStats = await knex.raw(`
        SELECT 
          schemaname,
          tablename,
          indexname,
          idx_scan as usage_count
        FROM pg_stat_user_indexes 
        WHERE idx_scan > 0
        ORDER BY idx_scan DESC
        LIMIT 20
      `);

      // Get connection pool info
      const poolStats = await knex.client.pool;
      const connectionInfo = {
        active: poolStats.numUsed(),
        idle: poolStats.numFree(),
        total: poolStats.numUsed() + poolStats.numFree()
      };

      // Get cache hit rate
      const cacheStats = cacheService.getStats();
      const cacheHitRate = cacheStats.hitRate;

      return {
        tableSizes: tableStats.rows.map((row: any) => ({
          table: `${row.schemaname}.${row.tablename}`,
          size: row.size,
          rows: row.total_operations
        })),
        indexUsage: indexStats.rows.map((row: any) => ({
          index: `${row.schemaname}.${row.tablename}.${row.indexname}`,
          usage: parseInt(row.usage_count)
        })),
        connectionInfo,
        cacheHitRate
      };
    } catch (error) {
      logger.error('Failed to get database stats:', error);
      return {
        tableSizes: [],
        indexUsage: [],
        connectionInfo: { active: 0, idle: 0, total: 0 },
        cacheHitRate: 0
      };
    }
  }

  // Analyze table performance
  async analyzeTablePerformance(tableName: string): Promise<{
    tableSize: string;
    rowCount: number;
    indexes: Array<{ name: string; columns: string[]; type: string }>;
    queryStats: Array<{ query: string; count: number; avgTime: number }>;
    recommendations: string[];
  }> {
    try {
      // Get table size and row count
      const tableInfo = await knex.raw(`
        SELECT 
          pg_size_pretty(pg_total_relation_size(?)) as size,
          (SELECT reltuples FROM pg_class WHERE relname = ?) as row_count
      `, [tableName, tableName]);

      // Get table indexes
      const indexes = await knex.raw(`
        SELECT 
          indexname,
          indexdef,
          schemaname
        FROM pg_indexes 
        WHERE tablename = ?
      `, [tableName]);

      // Get query statistics for this table
      const tableQueries = this.queryHistory.filter(q => 
        q.query.toLowerCase().includes(tableName.toLowerCase())
      );

      const queryStats = this.aggregateQueryStats(tableQueries);

      // Generate recommendations
      const recommendations = this.generateTableRecommendations(
        tableInfo.rows[0],
        indexes.rows,
        queryStats
      );

      return {
        tableSize: tableInfo.rows[0]?.size || 'Unknown',
        rowCount: parseInt(tableInfo.rows[0]?.row_count) || 0,
        indexes: indexes.rows.map((idx: any) => ({
          name: idx.indexname,
          columns: this.extractIndexColumns(idx.indexdef),
          type: this.determineIndexType(idx.indexdef)
        })),
        queryStats,
        recommendations
      };
    } catch (error) {
      logger.error(`Failed to analyze table performance for ${tableName}:`, error);
      return {
        tableSize: 'Unknown',
        rowCount: 0,
        indexes: [],
        queryStats: [],
        recommendations: ['Failed to analyze table']
      };
    }
  }

  // Extract index columns from index definition
  private extractIndexColumns(indexDef: string): string[] {
    const match = indexDef.match(/\(([^)]+)\)/);
    if (match) {
      return match[1].split(',').map(col => col.trim());
    }
    return [];
  }

  // Determine index type from index definition
  private determineIndexType(indexDef: string): string {
    if (indexDef.includes('USING gin')) return 'gin';
    if (indexDef.includes('USING gist')) return 'gist';
    if (indexDef.includes('USING hash')) return 'hash';
    return 'btree';
  }

  // Aggregate query statistics
  private aggregateQueryStats(queries: QueryMetrics[]): Array<{
    query: string;
    count: number;
    avgTime: number;
  }> {
    const stats = new Map<string, { count: number; totalTime: number }>();

    queries.forEach(q => {
      const key = this.hashQuery(q.query);
      const existing = stats.get(key);
      
      if (existing) {
        existing.count++;
        existing.totalTime += q.executionTime;
      } else {
        stats.set(key, { count: 1, totalTime: q.executionTime });
      }
    });

    return Array.from(stats.entries()).map(([_, data]) => ({
      query: queries.find(q => this.hashQuery(q.query) === _)?.query || '',
      count: data.count,
      avgTime: data.totalTime / data.count
    }));
  }

  // Generate table-specific recommendations
  private generateTableRecommendations(
    tableInfo: any,
    indexes: any[],
    queryStats: Array<{ query: string; count: number; avgTime: number }>
  ): string[] {
    const recommendations: string[] = [];

    // Large table recommendations
    if (tableInfo.row_count > 1000000) {
      recommendations.push('Consider partitioning large table for better performance');
      recommendations.push('Implement archiving strategy for old data');
    }

    // Index recommendations
    if (indexes.length === 0) {
      recommendations.push('Add primary key index if not exists');
    }

    // Query performance recommendations
    const slowQueries = queryStats.filter(q => q.avgTime > 500);
    if (slowQueries.length > 0) {
      recommendations.push(`Optimize ${slowQueries.length} slow queries`);
    }

    // Frequent query recommendations
    const frequentQueries = queryStats.filter(q => q.count > 10);
    if (frequentQueries.length > 0) {
      recommendations.push('Consider adding indexes for frequently accessed columns');
    }

    return recommendations;
  }

  // Get index recommendations
  async getIndexRecommendations(): Promise<IndexRecommendation[]> {
    try {
      // Analyze slow queries to identify missing indexes
      const slowQueries = this.queryHistory.filter(q => q.executionTime > this.slowQueryThreshold);
      const recommendations: IndexRecommendation[] = [];

      // Simple heuristic: look for WHERE clauses on non-indexed columns
      slowQueries.forEach(query => {
        const whereMatches = query.query.match(/WHERE\s+(\w+)\s*[=<>]/gi);
        if (whereMatches) {
          whereMatches.forEach(match => {
            const column = match.match(/WHERE\s+(\w+)\s*[=<>]/i)?.[1];
            if (column) {
              recommendations.push({
                table: 'unknown', // Would need to parse table name
                columns: [column],
                type: 'btree',
                reason: 'Frequent filtering on this column',
                estimatedImprovement: '2-10x faster queries'
              });
            }
          });
        }
      });

      return recommendations;
    } catch (error) {
      logger.error('Failed to get index recommendations:', error);
      return [];
    }
  }

  // Optimize specific query
  async optimizeQuery(query: string): Promise<{
    originalQuery: string;
    optimizedQuery: string;
    improvements: string[];
    estimatedGain: string;
  }> {
    try {
      const improvements: string[] = [];
      let optimizedQuery = query;

      // Remove SELECT * if possible
      if (query.toLowerCase().includes('select *')) {
        optimizedQuery = query.replace(/select \*/gi, 'SELECT specific_columns');
        improvements.push('Replace SELECT * with specific columns');
      }

      // Add LIMIT if missing for large result sets
      if (!query.toLowerCase().includes('limit') && query.toLowerCase().includes('select')) {
        optimizedQuery += ' LIMIT 100';
        improvements.push('Add LIMIT clause to prevent large result sets');
      }

      // Suggest indexing for WHERE clauses
      const whereMatches = query.match(/WHERE\s+(\w+)\s*[=<>]/gi);
      if (whereMatches) {
        improvements.push('Consider adding indexes on WHERE clause columns');
      }

      // Suggest using EXISTS instead of IN for subqueries
      if (query.toLowerCase().includes(' in (')) {
        improvements.push('Consider using EXISTS instead of IN for better performance');
      }

      const estimatedGain = improvements.length > 0 ? '10-50% performance improvement' : 'Query already optimized';

      return {
        originalQuery: query,
        optimizedQuery,
        improvements,
        estimatedGain
      };
    } catch (error) {
      logger.error('Failed to optimize query:', error);
      return {
        originalQuery: query,
        optimizedQuery: query,
        improvements: ['Failed to optimize query'],
        estimatedGain: 'Unknown'
      };
    }
  }

  // Get query performance report
  async getPerformanceReport(): Promise<{
    summary: {
      totalQueries: number;
      slowQueries: number;
      avgExecutionTime: number;
      cacheHitRate: number;
    };
    topSlowQueries: QueryMetrics[];
    topFrequentQueries: Array<{ query: string; count: number; avgTime: number }>;
    recommendations: string[];
  }> {
    try {
      const analysis = await this.analyzeQueryPerformance();
      const dbStats = await this.getDatabaseStats();

      const totalQueries = this.queryHistory.length;
      const slowQueries = analysis.slowQueries.length;
      const avgExecutionTime = this.queryHistory.length > 0 
        ? this.queryHistory.reduce((sum, q) => sum + q.executionTime, 0) / this.queryHistory.length
        : 0;

      const summary = {
        totalQueries,
        slowQueries,
        avgExecutionTime: Math.round(avgExecutionTime),
        cacheHitRate: dbStats.cacheHitRate
      };

      const topSlowQueries = analysis.slowQueries
        .sort((a, b) => b.executionTime - a.executionTime)
        .slice(0, 10);

      const topFrequentQueries = analysis.frequentQueries.slice(0, 10);

      const recommendations = [
        ...analysis.optimizationSuggestions,
        'Monitor slow queries regularly',
        'Consider adding database indexes',
        'Implement query result caching',
        'Use connection pooling effectively'
      ];

      return {
        summary,
        topSlowQueries,
        topFrequentQueries,
        recommendations
      };
    } catch (error) {
      logger.error('Failed to generate performance report:', error);
      return {
        summary: {
          totalQueries: 0,
          slowQueries: 0,
          avgExecutionTime: 0,
          cacheHitRate: 0
        },
        topSlowQueries: [],
        topFrequentQueries: [],
        recommendations: ['Failed to generate report']
      };
    }
  }

  // Clear query history
  clearHistory(): void {
    this.queryHistory = [];
    logger.info('Query history cleared');
  }

  // Export query metrics
  exportMetrics(): QueryMetrics[] {
    return [...this.queryHistory];
  }

  // Health check
  async healthCheck(): Promise<boolean> {
    try {
      // Test database connection
      await knex.raw('SELECT 1');
      
      // Check if we can track queries
      await this.trackQuery('SELECT 1', 1, 1);
      
      return true;
    } catch (error) {
      logger.error('Query optimizer health check failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export const queryOptimizer = new QueryOptimizer();

// Export for direct use
export default queryOptimizer;
