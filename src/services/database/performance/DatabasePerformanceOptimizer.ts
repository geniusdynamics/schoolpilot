// ABOUTME: Database Performance Optimizer - provides query optimization, indexing, and performance monitoring
// ABOUTME: Implements caching, query analysis, and automatic performance improvements for database operations

import { ICollection, QueryOptions, IndexDefinition } from '../interfaces';
import { getCurrentUnifiedConfig } from '../../../config/unifiedConfig';

export interface QueryPerformanceMetrics {
  queryId: string;
  collection: string;
  query: QueryOptions;
  executionTime: number;
  resultCount: number;
  timestamp: Date;
  cacheHit: boolean;
  indexesUsed: string[];
  optimizationSuggestions: string[];
}

export interface CollectionPerformanceStats {
  collection: string;
  totalQueries: number;
  averageQueryTime: number;
  slowQueries: number;
  cacheHitRate: number;
  indexEfficiency: number;
  lastOptimized: Date | null;
  suggestedIndexes: IndexDefinition[];
}

export interface PerformanceOptimizationConfig {
  enableQueryCaching: boolean;
  cacheMaxSize: number;
  cacheTTL: number; // Time to live in milliseconds
  slowQueryThreshold: number; // Milliseconds
  enableAutoIndexing: boolean;
  indexCreationThreshold: number; // Number of slow queries before creating index
  enableQueryLogging: boolean;
  maxLogEntries: number;
}

interface CacheEntry<T> {
  data: T[];
  timestamp: Date;
  ttl: number;
  hitCount: number;
}

export class DatabasePerformanceOptimizer {
  private static instance: DatabasePerformanceOptimizer;
  private queryMetrics: Map<string, QueryPerformanceMetrics[]> = new Map();
  private queryCache: Map<string, CacheEntry<any>> = new Map();
  private collectionStats: Map<string, CollectionPerformanceStats> = new Map();
  private config: PerformanceOptimizationConfig;
  private cleanupInterval: NodeJS.Timeout | null = null;

  private constructor() {
    this.config = this.loadConfiguration();
    this.startCleanupScheduler();
  }

  public static getInstance(): DatabasePerformanceOptimizer {
    if (!DatabasePerformanceOptimizer.instance) {
      DatabasePerformanceOptimizer.instance = new DatabasePerformanceOptimizer();
    }
    return DatabasePerformanceOptimizer.instance;
  }

  /**
   * Load performance optimization configuration
   */
  private loadConfiguration(): PerformanceOptimizationConfig {
    const unifiedConfig = getCurrentUnifiedConfig();
    const dbConfig = unifiedConfig.database;

    return {
      enableQueryCaching: dbConfig?.performance?.enableQueryCaching ?? true,
      cacheMaxSize: dbConfig?.performance?.cacheMaxSize ?? 1000,
      cacheTTL: dbConfig?.performance?.cacheTTL ?? 5 * 60 * 1000, // 5 minutes
      slowQueryThreshold: dbConfig?.performance?.slowQueryThreshold ?? 1000, // 1 second
      enableAutoIndexing: dbConfig?.performance?.enableAutoIndexing ?? true,
      indexCreationThreshold: dbConfig?.performance?.indexCreationThreshold ?? 10,
      enableQueryLogging: dbConfig?.performance?.enableQueryLogging ?? true,
      maxLogEntries: dbConfig?.performance?.maxLogEntries ?? 10000
    };
  }

  /**
   * Optimize a query execution with caching and performance monitoring
   */
  public async optimizeQuery<T>(
    collection: ICollection<T>,
    query: QueryOptions = {},
    operation: 'find' | 'count' = 'find'
  ): Promise<T[] | number> {
    const startTime = Date.now();
    const queryId = this.generateQueryId(collection.name, query, operation);
    
    try {
      // Check cache first if enabled
      if (this.config.enableQueryCaching && operation === 'find') {
        const cachedResult = this.getCachedResult<T>(queryId);
        if (cachedResult) {
          this.recordQueryMetrics(collection.name, query, Date.now() - startTime, 
            Array.isArray(cachedResult) ? cachedResult.length : 0, true, queryId);
          return cachedResult;
        }
      }

      // Execute the query
      let result: T[] | number;
      let resultCount: number;

      if (operation === 'find') {
        result = await collection.find(query);
        resultCount = Array.isArray(result) ? result.length : 0;
        
        // Cache the result if enabled
        if (this.config.enableQueryCaching) {
          this.cacheResult(queryId, result as T[]);
        }
      } else {
        result = await collection.count(query);
        resultCount = typeof result === 'number' ? result : 0;
      }

      const executionTime = Date.now() - startTime;

      // Record performance metrics
      this.recordQueryMetrics(collection.name, query, executionTime, resultCount, false, queryId);

      // Check if this was a slow query and suggest optimizations
      if (executionTime > this.config.slowQueryThreshold) {
        await this.analyzeSlowQuery(collection, query, executionTime);
      }

      return result;

    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.recordQueryMetrics(collection.name, query, executionTime, 0, false, queryId, error);
      throw error;
    }
  }

  /**
   * Generate a unique query ID for caching and tracking
   */
  private generateQueryId(collectionName: string, query: QueryOptions, operation: string): string {
    const queryString = JSON.stringify({
      collection: collectionName,
      operation,
      selector: query.selector,
      sort: query.sort,
      limit: query.limit,
      skip: query.skip,
      fields: query.fields
    });
    
    // Simple hash function for query ID
    let hash = 0;
    for (let i = 0; i < queryString.length; i++) {
      const char = queryString.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return `${collectionName}_${operation}_${Math.abs(hash)}`;
  }

  /**
   * Get cached query result if available and not expired
   */
  private getCachedResult<T>(queryId: string): T[] | null {
    const cacheEntry = this.queryCache.get(queryId);
    
    if (!cacheEntry) {
      return null;
    }

    const now = Date.now();
    const age = now - cacheEntry.timestamp.getTime();
    
    if (age > cacheEntry.ttl) {
      // Cache entry expired
      this.queryCache.delete(queryId);
      return null;
    }

    // Update hit count
    cacheEntry.hitCount++;
    return cacheEntry.data;
  }

  /**
   * Cache query result
   */
  private cacheResult<T>(queryId: string, data: T[]): void {
    // Check cache size limit
    if (this.queryCache.size >= this.config.cacheMaxSize) {
      this.evictOldestCacheEntries();
    }

    this.queryCache.set(queryId, {
      data,
      timestamp: new Date(),
      ttl: this.config.cacheTTL,
      hitCount: 0
    });
  }

  /**
   * Evict oldest cache entries when cache is full
   */
  private evictOldestCacheEntries(): void {
    const entries = Array.from(this.queryCache.entries());
    
    // Sort by timestamp (oldest first)
    entries.sort((a, b) => a[1].timestamp.getTime() - b[1].timestamp.getTime());
    
    // Remove oldest 25% of entries
    const toRemove = Math.floor(entries.length * 0.25);
    for (let i = 0; i < toRemove; i++) {
      this.queryCache.delete(entries[i][0]);
    }
  }

  /**
   * Record query performance metrics
   */
  private recordQueryMetrics(
    collection: string,
    query: QueryOptions,
    executionTime: number,
    resultCount: number,
    cacheHit: boolean,
    queryId: string,
    error?: any
  ): void {
    if (!this.config.enableQueryLogging) {
      return;
    }

    const metrics: QueryPerformanceMetrics = {
      queryId,
      collection,
      query,
      executionTime,
      resultCount,
      timestamp: new Date(),
      cacheHit,
      indexesUsed: this.analyzeIndexUsage(query),
      optimizationSuggestions: this.generateOptimizationSuggestions(query, executionTime)
    };

    // Store metrics for this collection
    if (!this.queryMetrics.has(collection)) {
      this.queryMetrics.set(collection, []);
    }

    const collectionMetrics = this.queryMetrics.get(collection)!;
    collectionMetrics.push(metrics);

    // Limit the number of stored metrics
    if (collectionMetrics.length > this.config.maxLogEntries) {
      collectionMetrics.splice(0, collectionMetrics.length - this.config.maxLogEntries);
    }

    // Update collection statistics
    this.updateCollectionStats(collection, metrics);

    // Log slow queries
    if (executionTime > this.config.slowQueryThreshold) {
      console.warn(`🐌 [DatabasePerformanceOptimizer] Slow query detected:`, {
        collection,
        executionTime: `${executionTime}ms`,
        query: JSON.stringify(query),
        suggestions: metrics.optimizationSuggestions
      });
    }
  }

  /**
   * Analyze which indexes might be used for a query
   */
  private analyzeIndexUsage(query: QueryOptions): string[] {
    const indexesUsed: string[] = [];

    if (query.selector) {
      // Check for potential index usage based on query fields
      Object.keys(query.selector).forEach(field => {
        if (field !== '$and' && field !== '$or' && field !== '$not') {
          indexesUsed.push(field);
        }
      });
    }

    if (query.sort) {
      // Sort operations typically use indexes
      if (Array.isArray(query.sort)) {
        query.sort.forEach(sortField => {
          if (typeof sortField === 'string') {
            indexesUsed.push(sortField);
          } else if (typeof sortField === 'object') {
            Object.keys(sortField).forEach(field => indexesUsed.push(field));
          }
        });
      }
    }

    return [...new Set(indexesUsed)]; // Remove duplicates
  }

  /**
   * Generate optimization suggestions for a query
   */
  private generateOptimizationSuggestions(query: QueryOptions, executionTime: number): string[] {
    const suggestions: string[] = [];

    if (executionTime > this.config.slowQueryThreshold) {
      suggestions.push('Query execution time exceeds threshold - consider optimization');
    }

    if (query.selector) {
      const selectorKeys = Object.keys(query.selector);
      
      if (selectorKeys.length > 3) {
        suggestions.push('Complex selector with many fields - consider compound indexes');
      }

      if (selectorKeys.some(key => key.startsWith('$'))) {
        suggestions.push('Complex query operators detected - verify index usage');
      }
    }

    if (query.sort && !query.limit) {
      suggestions.push('Sorting without limit - consider adding limit for better performance');
    }

    if (query.limit && query.limit > 1000) {
      suggestions.push('Large result set requested - consider pagination');
    }

    if (!query.fields) {
      suggestions.push('No field projection - consider selecting only needed fields');
    }

    return suggestions;
  }

  /**
   * Update collection performance statistics
   */
  private updateCollectionStats(collection: string, metrics: QueryPerformanceMetrics): void {
    let stats = this.collectionStats.get(collection);
    
    if (!stats) {
      stats = {
        collection,
        totalQueries: 0,
        averageQueryTime: 0,
        slowQueries: 0,
        cacheHitRate: 0,
        indexEfficiency: 0,
        lastOptimized: null,
        suggestedIndexes: []
      };
      this.collectionStats.set(collection, stats);
    }

    // Update statistics
    stats.totalQueries++;
    stats.averageQueryTime = (stats.averageQueryTime * (stats.totalQueries - 1) + metrics.executionTime) / stats.totalQueries;
    
    if (metrics.executionTime > this.config.slowQueryThreshold) {
      stats.slowQueries++;
    }

    // Calculate cache hit rate
    const collectionMetrics = this.queryMetrics.get(collection) || [];
    const cacheHits = collectionMetrics.filter(m => m.cacheHit).length;
    stats.cacheHitRate = collectionMetrics.length > 0 ? (cacheHits / collectionMetrics.length) * 100 : 0;

    // Calculate index efficiency (simplified)
    const queriesWithIndexes = collectionMetrics.filter(m => m.indexesUsed.length > 0).length;
    stats.indexEfficiency = collectionMetrics.length > 0 ? (queriesWithIndexes / collectionMetrics.length) * 100 : 0;
  }

  /**
   * Analyze slow query and suggest optimizations
   */
  private async analyzeSlowQuery<T>(
    collection: ICollection<T>,
    query: QueryOptions,
    executionTime: number
  ): Promise<void> {
    const collectionName = collection.name;
    const stats = this.collectionStats.get(collectionName);
    
    if (!stats) return;

    // Check if we should create an index
    if (this.config.enableAutoIndexing && stats.slowQueries >= this.config.indexCreationThreshold) {
      const suggestedIndexes = this.suggestIndexes(query);
      
      for (const indexDef of suggestedIndexes) {
        try {
          await collection.createIndex(indexDef);
          console.log(`📈 [DatabasePerformanceOptimizer] Created index for ${collectionName}:`, indexDef);
          stats.lastOptimized = new Date();
        } catch (error) {
          console.warn(`⚠️ [DatabasePerformanceOptimizer] Failed to create index for ${collectionName}:`, error);
        }
      }
    }
  }

  /**
   * Suggest indexes based on query patterns
   */
  private suggestIndexes(query: QueryOptions): IndexDefinition[] {
    const indexes: IndexDefinition[] = [];

    if (query.selector) {
      const selectorFields = Object.keys(query.selector).filter(key => !key.startsWith('$'));
      
      if (selectorFields.length > 0) {
        // Single field indexes
        selectorFields.forEach(field => {
          indexes.push({
            name: `idx_${field}`,
            fields: [field],
            background: true
          });
        });

        // Compound index for multiple fields
        if (selectorFields.length > 1) {
          indexes.push({
            name: `idx_compound_${selectorFields.join('_')}`,
            fields: selectorFields,
            background: true
          });
        }
      }
    }

    if (query.sort) {
      const sortFields: string[] = [];
      
      if (Array.isArray(query.sort)) {
        query.sort.forEach(sortField => {
          if (typeof sortField === 'string') {
            sortFields.push(sortField);
          } else if (typeof sortField === 'object') {
            Object.keys(sortField).forEach(field => sortFields.push(field));
          }
        });
      }

      if (sortFields.length > 0) {
        indexes.push({
          name: `idx_sort_${sortFields.join('_')}`,
          fields: sortFields,
          background: true
        });
      }
    }

    return indexes;
  }

  /**
   * Get performance statistics for a collection
   */
  public getCollectionPerformanceStats(collectionName: string): CollectionPerformanceStats | null {
    return this.collectionStats.get(collectionName) || null;
  }

  /**
   * Get all performance statistics
   */
  public getAllPerformanceStats(): Map<string, CollectionPerformanceStats> {
    return new Map(this.collectionStats);
  }

  /**
   * Get recent query metrics for a collection
   */
  public getRecentQueryMetrics(collectionName: string, limit: number = 100): QueryPerformanceMetrics[] {
    const metrics = this.queryMetrics.get(collectionName) || [];
    return metrics.slice(-limit);
  }

  /**
   * Clear cache for a specific collection or all collections
   */
  public clearCache(collectionName?: string): void {
    if (collectionName) {
      // Clear cache entries for specific collection
      const keysToDelete = Array.from(this.queryCache.keys()).filter(key => key.startsWith(collectionName));
      keysToDelete.forEach(key => this.queryCache.delete(key));
    } else {
      // Clear all cache
      this.queryCache.clear();
    }
  }

  /**
   * Get cache statistics
   */
  public getCacheStats(): {
    totalEntries: number;
    totalHits: number;
    hitRate: number;
    memoryUsage: number;
  } {
    const entries = Array.from(this.queryCache.values());
    const totalHits = entries.reduce((sum, entry) => sum + entry.hitCount, 0);
    const totalRequests = entries.length + totalHits;
    
    return {
      totalEntries: entries.length,
      totalHits,
      hitRate: totalRequests > 0 ? (totalHits / totalRequests) * 100 : 0,
      memoryUsage: this.estimateCacheMemoryUsage()
    };
  }

  /**
   * Estimate cache memory usage (rough calculation)
   */
  private estimateCacheMemoryUsage(): number {
    let totalSize = 0;
    
    for (const entry of this.queryCache.values()) {
      // Rough estimation: JSON string length * 2 (for UTF-16)
      totalSize += JSON.stringify(entry.data).length * 2;
    }
    
    return totalSize;
  }

  /**
   * Start cleanup scheduler for expired cache entries and old metrics
   */
  private startCleanupScheduler(): void {
    // Run cleanup every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.performCleanup();
    }, 5 * 60 * 1000);
  }

  /**
   * Perform cleanup of expired cache entries and old metrics
   */
  private performCleanup(): void {
    const now = Date.now();
    
    // Clean expired cache entries
    for (const [key, entry] of this.queryCache.entries()) {
      const age = now - entry.timestamp.getTime();
      if (age > entry.ttl) {
        this.queryCache.delete(key);
      }
    }

    // Clean old metrics (keep only recent ones)
    for (const [collection, metrics] of this.queryMetrics.entries()) {
      if (metrics.length > this.config.maxLogEntries) {
        metrics.splice(0, metrics.length - this.config.maxLogEntries);
      }
    }
  }

  /**
   * Update configuration
   */
  public updateConfiguration(newConfig: Partial<PerformanceOptimizationConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Destroy the optimizer and clean up resources
   */
  public destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    
    this.queryCache.clear();
    this.queryMetrics.clear();
    this.collectionStats.clear();
  }
}

// Export singleton instance
export const databasePerformanceOptimizer = DatabasePerformanceOptimizer.getInstance();