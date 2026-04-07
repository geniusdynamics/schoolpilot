// ABOUTME: Database performance optimization service for query optimization and monitoring
// ABOUTME: Provides indexing, caching, performance monitoring, and automatic maintenance

import { ICollection, IDatabaseProvider } from './interfaces';
import { getDatabaseConfig } from '@/config/unifiedConfig';

export interface QueryPerformanceMetrics {
  queryId: string;
  collection: string;
  operation: 'find' | 'findOne' | 'insert' | 'update' | 'delete' | 'count';
  executionTime: number; // milliseconds
  recordsAffected: number;
  timestamp: Date;
  queryHash: string;
  cacheHit: boolean;
}

export interface IndexRecommendation {
  collection: string;
  fields: string[];
  reason: string;
  estimatedImprovement: number; // percentage
  priority: 'high' | 'medium' | 'low';
}

export interface PerformanceReport {
  totalQueries: number;
  averageQueryTime: number;
  slowQueries: QueryPerformanceMetrics[];
  cacheHitRate: number;
  indexRecommendations: IndexRecommendation[];
  memoryUsage: number;
  lastCompaction: Date | null;
  maintenanceNeeded: boolean;
}

export interface QueryCache {
  get(queryHash: string): any;
  set(queryHash: string, result: any, ttl?: number): void;
  clear(): void;
  size(): number;
  hitRate(): number;
}

export class DatabasePerformanceOptimizer {
  private static instance: DatabasePerformanceOptimizer;
  private queryMetrics: QueryPerformanceMetrics[] = [];
  private queryCache: Map<string, { result: any; timestamp: number; ttl: number }> = new Map();
  private indexCache: Map<string, Set<string>> = new Map(); // collection -> indexed fields
  private performanceConfig: any;
  private maintenanceInterval: NodeJS.Timeout | null = null;

  private constructor() {
    this.performanceConfig = getDatabaseConfig().performance;
    this.startMaintenanceScheduler();
  }

  public static getInstance(): DatabasePerformanceOptimizer {
    if (!DatabasePerformanceOptimizer.instance) {
      DatabasePerformanceOptimizer.instance = new DatabasePerformanceOptimizer();
    }
    return DatabasePerformanceOptimizer.instance;
  }

  /**
   * Monitor query performance and collect metrics
   */
  public async monitorQuery<T>(
    collection: string,
    operation: string,
    queryFn: () => Promise<T>,
    queryHash?: string
  ): Promise<T> {
    const startTime = Date.now();
    const queryId = `${collection}_${operation}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      // Check cache first if enabled and query is cacheable
      if (this.performanceConfig.enableCaching && queryHash && this.isCacheableOperation(operation)) {
        const cached = this.getCachedResult(queryHash);
        if (cached) {
          this.recordQueryMetrics({
            queryId,
            collection,
            operation: operation as any,
            executionTime: 0,
            recordsAffected: Array.isArray(cached) ? cached.length : 1,
            timestamp: new Date(),
            queryHash,
            cacheHit: true,
          });
          return cached;
        }
      }

      // Execute query
      const result = await queryFn();
      const executionTime = Date.now() - startTime;

      // Cache result if enabled
      if (this.performanceConfig.enableCaching && queryHash && this.isCacheableOperation(operation)) {
        this.setCachedResult(queryHash, result);
      }

      // Record metrics
      this.recordQueryMetrics({
        queryId,
        collection,
        operation: operation as any,
        executionTime,
        recordsAffected: Array.isArray(result) ? result.length : 1,
        timestamp: new Date(),
        queryHash: queryHash || '',
        cacheHit: false,
      });

      // Check if query is slow and needs optimization
      if (executionTime > 1000) { // Queries over 1 second
        console.warn(`🐌 [DatabasePerformanceOptimizer] Slow query detected: ${collection}.${operation} took ${executionTime}ms`);
        this.analyzeSlowQuery(collection, operation, executionTime);
      }

      return result;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      
      // Record failed query metrics
      this.recordQueryMetrics({
        queryId,
        collection,
        operation: operation as any,
        executionTime,
        recordsAffected: 0,
        timestamp: new Date(),
        queryHash: queryHash || '',
        cacheHit: false,
      });

      throw error;
    }
  }

  /**
   * Optimize collection with recommended indexes
   */
  public async optimizeCollection(collection: ICollection<any>): Promise<{
    indexesCreated: number;
    performanceImprovement: number;
    recommendations: IndexRecommendation[];
  }> {
    console.log(`🚀 [DatabasePerformanceOptimizer] Optimizing collection: ${collection.name}`);

    const recommendations = this.generateIndexRecommendations(collection.name);
    let indexesCreated = 0;
    let estimatedImprovement = 0;

    for (const recommendation of recommendations) {
      if (recommendation.priority === 'high') {
        try {
          await collection.createIndex({
            name: `idx_${recommendation.fields.join('_')}`,
            fields: recommendation.fields,
            unique: false,
            background: true,
          });

          indexesCreated++;
          estimatedImprovement += recommendation.estimatedImprovement;
          
          // Track created indexes
          if (!this.indexCache.has(collection.name)) {
            this.indexCache.set(collection.name, new Set());
          }
          this.indexCache.get(collection.name)!.add(recommendation.fields.join(','));

          console.log(`✅ [DatabasePerformanceOptimizer] Created index on ${collection.name}.${recommendation.fields.join(',')}`);
        } catch (error) {
          console.warn(`⚠️ [DatabasePerformanceOptimizer] Failed to create index on ${collection.name}.${recommendation.fields.join(',')}:`, error);
        }
      }
    }

    console.log(`🎯 [DatabasePerformanceOptimizer] Optimization complete: ${indexesCreated} indexes created, estimated ${estimatedImprovement}% improvement`);

    return {
      indexesCreated,
      performanceImprovement: estimatedImprovement,
      recommendations,
    };
  }

  /**
   * Generate index recommendations based on query patterns
   */
  private generateIndexRecommendations(collectionName: string): IndexRecommendation[] {
    const recommendations: IndexRecommendation[] = [];
    const collectionMetrics = this.queryMetrics.filter(m => m.collection === collectionName);

    if (collectionMetrics.length === 0) {
      return recommendations;
    }

    // Analyze query patterns for common fields
    const fieldUsage = new Map<string, number>();
    const slowQueries = collectionMetrics.filter(m => m.executionTime > 500);

    // Count field usage in slow queries (simplified analysis)
    slowQueries.forEach(query => {
      // This would need actual query analysis - for now, recommend common fields
      const commonFields = this.getCommonQueryFields(collectionName);
      commonFields.forEach(field => {
        fieldUsage.set(field, (fieldUsage.get(field) || 0) + 1);
      });
    });

    // Generate recommendations based on usage patterns
    fieldUsage.forEach((usage, field) => {
      if (usage >= 3 && !this.hasIndex(collectionName, field)) {
        recommendations.push({
          collection: collectionName,
          fields: [field],
          reason: `Field '${field}' used in ${usage} slow queries`,
          estimatedImprovement: Math.min(usage * 10, 50), // Up to 50% improvement
          priority: usage >= 5 ? 'high' : usage >= 3 ? 'medium' : 'low',
        });
      }
    });

    // Add common composite indexes
    const compositeIndexes = this.getCommonCompositeIndexes(collectionName);
    compositeIndexes.forEach(index => {
      if (!this.hasCompositeIndex(collectionName, index.fields)) {
        recommendations.push({
          collection: collectionName,
          fields: index.fields,
          reason: index.reason,
          estimatedImprovement: index.estimatedImprovement,
          priority: index.priority,
        });
      }
    });

    return recommendations.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  /**
   * Get common query fields for a collection
   */
  private getCommonQueryFields(collectionName: string): string[] {
    const commonFields: Record<string, string[]> = {
      students: ['id', 'studentId', 'classId', 'status', 'academicYear', 'createdAt'],
      staff: ['id', 'staffId', 'department', 'role', 'status', 'createdAt'],
      classes: ['id', 'classId', 'academicYear', 'grade', 'section', 'status'],
      subjects: ['id', 'subjectId', 'classId', 'teacherId', 'status'],
      exams: ['id', 'examId', 'classId', 'subjectId', 'date', 'status'],
      fees: ['id', 'studentId', 'feeType', 'status', 'dueDate', 'academicYear'],
      attendance: ['studentId', 'date', 'classId', 'status'],
      grades: ['studentId', 'examId', 'subjectId', 'classId'],
    };

    return commonFields[collectionName] || ['id', 'createdAt', 'updatedAt', 'status'];
  }

  /**
   * Get common composite indexes for a collection
   */
  private getCommonCompositeIndexes(collectionName: string): Array<{
    fields: string[];
    reason: string;
    estimatedImprovement: number;
    priority: 'high' | 'medium' | 'low';
  }> {
    const compositeIndexes: Record<string, any[]> = {
      students: [
        {
          fields: ['classId', 'status'],
          reason: 'Common query pattern for active students in class',
          estimatedImprovement: 40,
          priority: 'high',
        },
        {
          fields: ['academicYear', 'status'],
          reason: 'Academic year filtering with status',
          estimatedImprovement: 30,
          priority: 'medium',
        },
      ],
      attendance: [
        {
          fields: ['studentId', 'date'],
          reason: 'Student attendance history queries',
          estimatedImprovement: 50,
          priority: 'high',
        },
        {
          fields: ['classId', 'date'],
          reason: 'Class attendance reports',
          estimatedImprovement: 35,
          priority: 'medium',
        },
      ],
      fees: [
        {
          fields: ['studentId', 'status'],
          reason: 'Student fee status queries',
          estimatedImprovement: 45,
          priority: 'high',
        },
        {
          fields: ['dueDate', 'status'],
          reason: 'Due fee reports',
          estimatedImprovement: 30,
          priority: 'medium',
        },
      ],
      grades: [
        {
          fields: ['studentId', 'examId'],
          reason: 'Student exam results',
          estimatedImprovement: 40,
          priority: 'high',
        },
        {
          fields: ['classId', 'subjectId'],
          reason: 'Class subject performance',
          estimatedImprovement: 35,
          priority: 'medium',
        },
      ],
    };

    return compositeIndexes[collectionName] || [];
  }

  /**
   * Check if collection has index on field
   */
  private hasIndex(collectionName: string, field: string): boolean {
    const indexes = this.indexCache.get(collectionName);
    return indexes ? indexes.has(field) : false;
  }

  /**
   * Check if collection has composite index
   */
  private hasCompositeIndex(collectionName: string, fields: string[]): boolean {
    const indexes = this.indexCache.get(collectionName);
    return indexes ? indexes.has(fields.join(',')) : false;
  }

  /**
   * Analyze slow query and suggest optimizations
   */
  private analyzeSlowQuery(collection: string, operation: string, executionTime: number): void {
    console.log(`🔍 [DatabasePerformanceOptimizer] Analyzing slow query: ${collection}.${operation} (${executionTime}ms)`);

    // Generate optimization suggestions
    const suggestions = [];

    if (executionTime > 2000) {
      suggestions.push('Consider adding indexes on frequently queried fields');
    }

    if (operation === 'find' && executionTime > 1000) {
      suggestions.push('Consider using pagination for large result sets');
      suggestions.push('Consider adding field-specific indexes');
    }

    if (operation === 'count' && executionTime > 500) {
      suggestions.push('Consider caching count results');
    }

    suggestions.forEach(suggestion => {
      console.log(`💡 [DatabasePerformanceOptimizer] Suggestion: ${suggestion}`);
    });
  }

  /**
   * Record query performance metrics
   */
  private recordQueryMetrics(metrics: QueryPerformanceMetrics): void {
    this.queryMetrics.push(metrics);

    // Keep only recent metrics (last 1000 queries)
    if (this.queryMetrics.length > 1000) {
      this.queryMetrics = this.queryMetrics.slice(-1000);
    }

    // Log slow queries
    if (metrics.executionTime > 1000) {
      console.warn(`🐌 [DatabasePerformanceOptimizer] Slow query: ${metrics.collection}.${metrics.operation} took ${metrics.executionTime}ms`);
    }
  }

  /**
   * Get performance report
   */
  public getPerformanceReport(): PerformanceReport {
    const totalQueries = this.queryMetrics.length;
    const averageQueryTime = totalQueries > 0 
      ? this.queryMetrics.reduce((sum, m) => sum + m.executionTime, 0) / totalQueries 
      : 0;

    const slowQueries = this.queryMetrics
      .filter(m => m.executionTime > 1000)
      .sort((a, b) => b.executionTime - a.executionTime)
      .slice(0, 10); // Top 10 slowest queries

    const cacheHits = this.queryMetrics.filter(m => m.cacheHit).length;
    const cacheHitRate = totalQueries > 0 ? (cacheHits / totalQueries) * 100 : 0;

    // Generate index recommendations for all collections
    const allCollections = [...new Set(this.queryMetrics.map(m => m.collection))];
    const indexRecommendations = allCollections
      .flatMap(collection => this.generateIndexRecommendations(collection))
      .filter(rec => rec.priority === 'high' || rec.priority === 'medium')
      .slice(0, 10); // Top 10 recommendations

    return {
      totalQueries,
      averageQueryTime: Math.round(averageQueryTime * 100) / 100,
      slowQueries,
      cacheHitRate: Math.round(cacheHitRate * 100) / 100,
      indexRecommendations,
      memoryUsage: this.estimateMemoryUsage(),
      lastCompaction: null, // Would be set by actual compaction
      maintenanceNeeded: this.needsMaintenance(),
    };
  }

  /**
   * Clear query cache
   */
  public clearCache(): void {
    this.queryCache.clear();
    console.log('🧹 [DatabasePerformanceOptimizer] Query cache cleared');
  }

  /**
   * Get cache statistics
   */
  public getCacheStats(): {
    size: number;
    hitRate: number;
    memoryUsage: number;
  } {
    const cacheHits = this.queryMetrics.filter(m => m.cacheHit).length;
    const totalQueries = this.queryMetrics.length;
    const hitRate = totalQueries > 0 ? (cacheHits / totalQueries) * 100 : 0;

    return {
      size: this.queryCache.size,
      hitRate: Math.round(hitRate * 100) / 100,
      memoryUsage: this.estimateCacheMemoryUsage(),
    };
  }

  /**
   * Optimize all collections with automatic indexing
   */
  public async optimizeAllCollections(collections: Map<string, ICollection<any>>): Promise<{
    totalIndexesCreated: number;
    optimizedCollections: number;
    estimatedImprovement: number;
  }> {
    console.log('🚀 [DatabasePerformanceOptimizer] Starting automatic optimization for all collections...');

    let totalIndexesCreated = 0;
    let optimizedCollections = 0;
    let totalImprovement = 0;

    for (const [name, collection] of collections) {
      try {
        const result = await this.optimizeCollection(collection);
        
        if (result.indexesCreated > 0) {
          totalIndexesCreated += result.indexesCreated;
          optimizedCollections++;
          totalImprovement += result.performanceImprovement;
        }
      } catch (error) {
        console.error(`❌ [DatabasePerformanceOptimizer] Failed to optimize collection ${name}:`, error);
      }
    }

    const averageImprovement = optimizedCollections > 0 ? totalImprovement / optimizedCollections : 0;

    console.log(`✅ [DatabasePerformanceOptimizer] Optimization complete: ${totalIndexesCreated} indexes created across ${optimizedCollections} collections`);

    return {
      totalIndexesCreated,
      optimizedCollections,
      estimatedImprovement: Math.round(averageImprovement * 100) / 100,
    };
  }

  /**
   * Perform database maintenance
   */
  public async performMaintenance(provider: IDatabaseProvider): Promise<{
    compactionPerformed: boolean;
    cacheCleared: boolean;
    oldMetricsCleared: boolean;
    maintenanceTime: number;
  }> {
    const startTime = Date.now();
    console.log('🔧 [DatabasePerformanceOptimizer] Starting database maintenance...');

    let compactionPerformed = false;
    let cacheCleared = false;
    let oldMetricsCleared = false;

    try {
      // Clear old query metrics (older than 24 hours)
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const oldMetricsCount = this.queryMetrics.length;
      this.queryMetrics = this.queryMetrics.filter(m => m.timestamp > oneDayAgo);
      oldMetricsCleared = this.queryMetrics.length < oldMetricsCount;

      // Clear expired cache entries
      const now = Date.now();
      let clearedCacheEntries = 0;
      
      for (const [key, entry] of this.queryCache.entries()) {
        if (now - entry.timestamp > entry.ttl) {
          this.queryCache.delete(key);
          clearedCacheEntries++;
        }
      }
      
      cacheCleared = clearedCacheEntries > 0;

      // Perform database compaction if supported
      if (typeof provider.compact === 'function') {
        await provider.compact();
        compactionPerformed = true;
      }

      const maintenanceTime = Date.now() - startTime;
      console.log(`✅ [DatabasePerformanceOptimizer] Maintenance complete in ${maintenanceTime}ms`);

      return {
        compactionPerformed,
        cacheCleared,
        oldMetricsCleared,
        maintenanceTime,
      };
    } catch (error) {
      console.error('❌ [DatabasePerformanceOptimizer] Maintenance failed:', error);
      throw error;
    }
  }

  /**
   * Start automatic maintenance scheduler
   */
  private startMaintenanceScheduler(): void {
    // Run maintenance every 6 hours
    this.maintenanceInterval = setInterval(() => {
      this.performAutomaticMaintenance();
    }, 6 * 60 * 60 * 1000);

    console.log('⏰ [DatabasePerformanceOptimizer] Automatic maintenance scheduler started');
  }

  /**
   * Perform automatic maintenance
   */
  private async performAutomaticMaintenance(): Promise<void> {
    try {
      console.log('🔄 [DatabasePerformanceOptimizer] Running automatic maintenance...');

      // Clear old metrics
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      this.queryMetrics = this.queryMetrics.filter(m => m.timestamp > oneDayAgo);

      // Clear expired cache entries
      const now = Date.now();
      for (const [key, entry] of this.queryCache.entries()) {
        if (now - entry.timestamp > entry.ttl) {
          this.queryCache.delete(key);
        }
      }

      console.log('✅ [DatabasePerformanceOptimizer] Automatic maintenance completed');
    } catch (error) {
      console.error('❌ [DatabasePerformanceOptimizer] Automatic maintenance failed:', error);
    }
  }

  /**
   * Check if operation is cacheable
   */
  private isCacheableOperation(operation: string): boolean {
    return ['find', 'findOne', 'count'].includes(operation);
  }

  /**
   * Get cached result
   */
  private getCachedResult(queryHash: string): any {
    const entry = this.queryCache.get(queryHash);
    if (!entry) return null;

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.queryCache.delete(queryHash);
      return null;
    }

    return entry.result;
  }

  /**
   * Set cached result
   */
  private setCachedResult(queryHash: string, result: any, ttl = 300000): void { // 5 minutes default TTL
    // Don't cache if cache is too large
    if (this.queryCache.size >= this.performanceConfig.cacheSize * 10) { // Rough estimate
      return;
    }

    this.queryCache.set(queryHash, {
      result: JSON.parse(JSON.stringify(result)), // Deep clone to prevent mutations
      timestamp: Date.now(),
      ttl,
    });
  }

  /**
   * Estimate memory usage
   */
  private estimateMemoryUsage(): number {
    // Rough estimation in MB
    const metricsSize = this.queryMetrics.length * 0.001; // ~1KB per metric
    const cacheSize = this.estimateCacheMemoryUsage();
    return Math.round((metricsSize + cacheSize) * 100) / 100;
  }

  /**
   * Estimate cache memory usage
   */
  private estimateCacheMemoryUsage(): number {
    // Rough estimation in MB
    return this.queryCache.size * 0.01; // ~10KB per cache entry
  }

  /**
   * Check if maintenance is needed
   */
  private needsMaintenance(): boolean {
    const oldMetrics = this.queryMetrics.filter(m => 
      Date.now() - m.timestamp.getTime() > 24 * 60 * 60 * 1000
    ).length;

    const expiredCacheEntries = Array.from(this.queryCache.values()).filter(entry =>
      Date.now() - entry.timestamp > entry.ttl
    ).length;

    return oldMetrics > 100 || expiredCacheEntries > 50;
  }

  /**
   * Cleanup resources
   */
  public cleanup(): void {
    if (this.maintenanceInterval) {
      clearInterval(this.maintenanceInterval);
      this.maintenanceInterval = null;
    }

    this.queryMetrics = [];
    this.queryCache.clear();
    this.indexCache.clear();

    console.log('🧹 [DatabasePerformanceOptimizer] Cleanup completed');
  }
}

// Export singleton instance
export const databasePerformanceOptimizer = DatabasePerformanceOptimizer.getInstance();