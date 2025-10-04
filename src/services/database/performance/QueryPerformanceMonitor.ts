// ABOUTME: Query Performance Monitor - tracks and analyzes database query performance in real-time
// ABOUTME: Provides detailed metrics, slow query detection, and performance recommendations

import { QueryOptions, ICollection } from '../interfaces';
import { databasePerformanceOptimizer } from './DatabasePerformanceOptimizer';

export interface QueryExecutionPlan {
  queryId: string;
  collection: string;
  estimatedCost: number;
  indexesAvailable: string[];
  indexesUsed: string[];
  optimizationLevel: 'optimal' | 'good' | 'poor' | 'critical';
  recommendations: string[];
}

export interface PerformanceAlert {
  id: string;
  type: 'slow_query' | 'missing_index' | 'cache_miss' | 'memory_usage' | 'connection_issue';
  severity: 'low' | 'medium' | 'high' | 'critical';
  collection: string;
  message: string;
  details: any;
  timestamp: Date;
  resolved: boolean;
}

export interface PerformanceTrend {
  collection: string;
  timeframe: 'hour' | 'day' | 'week' | 'month';
  averageQueryTime: number[];
  queryCount: number[];
  cacheHitRate: number[];
  timestamps: Date[];
}

export class QueryPerformanceMonitor {
  private static instance: QueryPerformanceMonitor;
  private alerts: Map<string, PerformanceAlert> = new Map();
  private trends: Map<string, PerformanceTrend[]> = new Map();
  private monitoringInterval: NodeJS.Timeout | null = null;
  private isMonitoring = false;

  private constructor() {
    this.startMonitoring();
  }

  public static getInstance(): QueryPerformanceMonitor {
    if (!QueryPerformanceMonitor.instance) {
      QueryPerformanceMonitor.instance = new QueryPerformanceMonitor();
    }
    return QueryPerformanceMonitor.instance;
  }

  /**
   * Start performance monitoring
   */
  public startMonitoring(): void {
    if (this.isMonitoring) return;

    this.isMonitoring = true;
    
    // Monitor performance every minute
    this.monitoringInterval = setInterval(() => {
      this.performPerformanceCheck();
    }, 60 * 1000);

    console.log('📊 [QueryPerformanceMonitor] Performance monitoring started');
  }

  /**
   * Stop performance monitoring
   */
  public stopMonitoring(): void {
    if (!this.isMonitoring) return;

    this.isMonitoring = false;
    
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    console.log('📊 [QueryPerformanceMonitor] Performance monitoring stopped');
  }

  /**
   * Monitor a query execution and provide performance insights
   */
  public async monitorQuery<T>(
    collection: ICollection<T>,
    query: QueryOptions,
    operation: 'find' | 'count' = 'find'
  ): Promise<{
    result: T[] | number;
    executionPlan: QueryExecutionPlan;
    performanceScore: number;
  }> {
    const startTime = Date.now();
    
    // Generate execution plan
    const executionPlan = this.generateExecutionPlan(collection, query, operation);
    
    try {
      // Execute query through performance optimizer
      const result = await databasePerformanceOptimizer.optimizeQuery(collection, query, operation);
      const executionTime = Date.now() - startTime;
      
      // Calculate performance score
      const performanceScore = this.calculatePerformanceScore(executionTime, executionPlan);
      
      // Check for performance issues
      this.checkForPerformanceIssues(collection.name, query, executionTime, executionPlan);
      
      return {
        result,
        executionPlan,
        performanceScore
      };
      
    } catch (error) {
      const executionTime = Date.now() - startTime;
      
      // Create error alert
      this.createAlert({
        type: 'connection_issue',
        severity: 'high',
        collection: collection.name,
        message: `Query execution failed: ${error instanceof Error ? error.message : String(error)}`,
        details: { query, executionTime, error }
      });
      
      throw error;
    }
  }

  /**
   * Generate query execution plan
   */
  private generateExecutionPlan(
    collection: ICollection<any>,
    query: QueryOptions,
    operation: string
  ): QueryExecutionPlan {
    const queryId = this.generateQueryId(collection.name, query, operation);
    
    // Analyze available indexes (simplified - would need actual schema info)
    const indexesAvailable = this.getAvailableIndexes(collection, query);
    const indexesUsed = this.predictIndexUsage(query, indexesAvailable);
    
    // Estimate query cost
    const estimatedCost = this.estimateQueryCost(query, indexesUsed);
    
    // Determine optimization level
    const optimizationLevel = this.determineOptimizationLevel(estimatedCost, indexesUsed);
    
    // Generate recommendations
    const recommendations = this.generateQueryRecommendations(query, indexesUsed, optimizationLevel);
    
    return {
      queryId,
      collection: collection.name,
      estimatedCost,
      indexesAvailable,
      indexesUsed,
      optimizationLevel,
      recommendations
    };
  }

  /**
   * Get available indexes for a collection (simplified implementation)
   */
  private getAvailableIndexes(collection: ICollection<any>, query: QueryOptions): string[] {
    const indexes: string[] = ['id']; // Primary key always available
    
    // Add common indexes based on schema (would need actual schema access)
    if (collection.name === 'students') {
      indexes.push('studentId', 'classId', 'status', 'createdAt');
    } else if (collection.name === 'staff') {
      indexes.push('staffId', 'departmentId', 'role', 'status');
    } else if (collection.name === 'classes') {
      indexes.push('classId', 'academicYearId', 'level', 'section');
    }
    
    // Add indexes based on query fields
    if (query.selector) {
      Object.keys(query.selector).forEach(field => {
        if (!field.startsWith('$') && !indexes.includes(field)) {
          indexes.push(field);
        }
      });
    }
    
    return indexes;
  }

  /**
   * Predict which indexes would be used for a query
   */
  private predictIndexUsage(query: QueryOptions, availableIndexes: string[]): string[] {
    const usedIndexes: string[] = [];
    
    if (query.selector) {
      // Check selector fields
      Object.keys(query.selector).forEach(field => {
        if (availableIndexes.includes(field)) {
          usedIndexes.push(field);
        }
      });
    }
    
    if (query.sort) {
      // Check sort fields
      if (Array.isArray(query.sort)) {
        query.sort.forEach(sortField => {
          let field: string;
          if (typeof sortField === 'string') {
            field = sortField;
          } else if (typeof sortField === 'object') {
            field = Object.keys(sortField)[0];
          } else {
            return;
          }
          
          if (availableIndexes.includes(field) && !usedIndexes.includes(field)) {
            usedIndexes.push(field);
          }
        });
      }
    }
    
    return usedIndexes;
  }

  /**
   * Estimate query execution cost (simplified scoring)
   */
  private estimateQueryCost(query: QueryOptions, indexesUsed: string[]): number {
    let cost = 1; // Base cost
    
    // Selector complexity
    if (query.selector) {
      const selectorKeys = Object.keys(query.selector);
      cost += selectorKeys.length * 2;
      
      // Complex operators increase cost
      if (selectorKeys.some(key => key.startsWith('$'))) {
        cost += 5;
      }
    }
    
    // Sort operations
    if (query.sort) {
      cost += 3;
      
      // Sorting without index is expensive
      if (indexesUsed.length === 0) {
        cost += 10;
      }
    }
    
    // Large result sets
    if (query.limit) {
      if (query.limit > 1000) {
        cost += 5;
      }
    } else {
      // No limit could be very expensive
      cost += 8;
    }
    
    // Skip operations
    if (query.skip && query.skip > 100) {
      cost += Math.floor(query.skip / 100);
    }
    
    // Index usage reduces cost
    cost = Math.max(1, cost - indexesUsed.length * 2);
    
    return cost;
  }

  /**
   * Determine optimization level based on cost and index usage
   */
  private determineOptimizationLevel(cost: number, indexesUsed: string[]): 'optimal' | 'good' | 'poor' | 'critical' {
    if (cost <= 3 && indexesUsed.length > 0) {
      return 'optimal';
    } else if (cost <= 6 && indexesUsed.length > 0) {
      return 'good';
    } else if (cost <= 10) {
      return 'poor';
    } else {
      return 'critical';
    }
  }

  /**
   * Generate query optimization recommendations
   */
  private generateQueryRecommendations(
    query: QueryOptions,
    indexesUsed: string[],
    optimizationLevel: string
  ): string[] {
    const recommendations: string[] = [];
    
    if (optimizationLevel === 'critical' || optimizationLevel === 'poor') {
      if (indexesUsed.length === 0) {
        recommendations.push('Add indexes for query fields to improve performance');
      }
      
      if (!query.limit) {
        recommendations.push('Add LIMIT clause to prevent large result sets');
      }
      
      if (query.skip && query.skip > 100) {
        recommendations.push('Consider cursor-based pagination instead of large SKIP values');
      }
    }
    
    if (query.selector) {
      const selectorKeys = Object.keys(query.selector);
      
      if (selectorKeys.length > 3) {
        recommendations.push('Consider compound indexes for multi-field queries');
      }
      
      if (selectorKeys.some(key => key.includes('$regex'))) {
        recommendations.push('Regular expressions can be slow - consider full-text search indexes');
      }
    }
    
    if (query.sort && !query.limit) {
      recommendations.push('Sorting without limit can be expensive - consider adding limit');
    }
    
    if (!query.fields) {
      recommendations.push('Use field projection to reduce data transfer');
    }
    
    return recommendations;
  }

  /**
   * Check for performance issues and create alerts
   */
  private checkForPerformanceIssues(
    collectionName: string,
    query: QueryOptions,
    executionTime: number,
    executionPlan: QueryExecutionPlan
  ): void {
    // Slow query alert
    if (executionTime > 1000) { // 1 second threshold
      this.createAlert({
        type: 'slow_query',
        severity: executionTime > 5000 ? 'critical' : 'high',
        collection: collectionName,
        message: `Slow query detected (${executionTime}ms)`,
        details: { query, executionTime, executionPlan }
      });
    }
    
    // Missing index alert
    if (executionPlan.optimizationLevel === 'critical' && executionPlan.indexesUsed.length === 0) {
      this.createAlert({
        type: 'missing_index',
        severity: 'medium',
        collection: collectionName,
        message: 'Query could benefit from indexes',
        details: { query, recommendations: executionPlan.recommendations }
      });
    }
    
    // Cache miss pattern detection
    const stats = databasePerformanceOptimizer.getCollectionPerformanceStats(collectionName);
    if (stats && stats.cacheHitRate < 20 && stats.totalQueries > 50) {
      this.createAlert({
        type: 'cache_miss',
        severity: 'low',
        collection: collectionName,
        message: `Low cache hit rate (${stats.cacheHitRate.toFixed(1)}%)`,
        details: { cacheHitRate: stats.cacheHitRate, totalQueries: stats.totalQueries }
      });
    }
  }

  /**
   * Create a performance alert
   */
  private createAlert(alertData: Omit<PerformanceAlert, 'id' | 'timestamp' | 'resolved'>): void {
    const alert: PerformanceAlert = {
      id: this.generateAlertId(),
      timestamp: new Date(),
      resolved: false,
      ...alertData
    };
    
    this.alerts.set(alert.id, alert);
    
    // Log critical alerts
    if (alert.severity === 'critical') {
      console.error(`🚨 [QueryPerformanceMonitor] Critical performance alert:`, alert);
    } else if (alert.severity === 'high') {
      console.warn(`⚠️ [QueryPerformanceMonitor] High severity performance alert:`, alert);
    }
  }

  /**
   * Generate unique alert ID
   */
  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate unique query ID
   */
  private generateQueryId(collectionName: string, query: QueryOptions, operation: string): string {
    const queryString = JSON.stringify({ collection: collectionName, operation, ...query });
    let hash = 0;
    for (let i = 0; i < queryString.length; i++) {
      const char = queryString.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return `query_${Math.abs(hash)}`;
  }

  /**
   * Perform periodic performance check
   */
  private performPerformanceCheck(): void {
    try {
      // Check overall system performance
      const allStats = databasePerformanceOptimizer.getAllPerformanceStats();
      const cacheStats = databasePerformanceOptimizer.getCacheStats();
      
      // Memory usage alert
      if (cacheStats.memoryUsage > 50 * 1024 * 1024) { // 50MB
        this.createAlert({
          type: 'memory_usage',
          severity: 'medium',
          collection: 'system',
          message: `High cache memory usage (${Math.round(cacheStats.memoryUsage / 1024 / 1024)}MB)`,
          details: cacheStats
        });
      }
      
      // Collection performance alerts
      for (const [collectionName, stats] of allStats) {
        if (stats.averageQueryTime > 500) { // 500ms average
          this.createAlert({
            type: 'slow_query',
            severity: 'medium',
            collection: collectionName,
            message: `High average query time (${stats.averageQueryTime.toFixed(0)}ms)`,
            details: stats
          });
        }
      }
      
      // Update trends
      this.updatePerformanceTrends();
      
    } catch (error) {
      console.error('❌ [QueryPerformanceMonitor] Performance check failed:', error);
    }
  }

  /**
   * Update performance trends
   */
  private updatePerformanceTrends(): void {
    const allStats = databasePerformanceOptimizer.getAllPerformanceStats();
    const now = new Date();
    
    for (const [collectionName, stats] of allStats) {
      if (!this.trends.has(collectionName)) {
        this.trends.set(collectionName, []);
      }
      
      const collectionTrends = this.trends.get(collectionName)!;
      
      // Find or create hourly trend
      let hourlyTrend = collectionTrends.find(t => 
        t.timeframe === 'hour' && 
        now.getTime() - t.timestamps[t.timestamps.length - 1]?.getTime() < 60 * 60 * 1000
      );
      
      if (!hourlyTrend) {
        hourlyTrend = {
          collection: collectionName,
          timeframe: 'hour',
          averageQueryTime: [],
          queryCount: [],
          cacheHitRate: [],
          timestamps: []
        };
        collectionTrends.push(hourlyTrend);
      }
      
      // Add current data point
      hourlyTrend.averageQueryTime.push(stats.averageQueryTime);
      hourlyTrend.queryCount.push(stats.totalQueries);
      hourlyTrend.cacheHitRate.push(stats.cacheHitRate);
      hourlyTrend.timestamps.push(now);
      
      // Keep only last 24 hours of data
      if (hourlyTrend.timestamps.length > 24) {
        hourlyTrend.averageQueryTime.shift();
        hourlyTrend.queryCount.shift();
        hourlyTrend.cacheHitRate.shift();
        hourlyTrend.timestamps.shift();
      }
    }
  }

  /**
   * Get active performance alerts
   */
  public getActiveAlerts(): PerformanceAlert[] {
    return Array.from(this.alerts.values()).filter(alert => !alert.resolved);
  }

  /**
   * Get all performance alerts
   */
  public getAllAlerts(): PerformanceAlert[] {
    return Array.from(this.alerts.values());
  }

  /**
   * Resolve an alert
   */
  public resolveAlert(alertId: string): boolean {
    const alert = this.alerts.get(alertId);
    if (alert) {
      alert.resolved = true;
      return true;
    }
    return false;
  }

  /**
   * Get performance trends for a collection
   */
  public getPerformanceTrends(collectionName: string): PerformanceTrend[] {
    return this.trends.get(collectionName) || [];
  }

  /**
   * Calculate performance score for a query
   */
  private calculatePerformanceScore(executionTime: number, executionPlan: QueryExecutionPlan): number {
    let score = 100;
    
    // Execution time penalty
    if (executionTime > 100) {
      score -= Math.min(50, Math.floor(executionTime / 100) * 5);
    }
    
    // Optimization level bonus/penalty
    switch (executionPlan.optimizationLevel) {
      case 'optimal':
        score += 0;
        break;
      case 'good':
        score -= 10;
        break;
      case 'poor':
        score -= 25;
        break;
      case 'critical':
        score -= 40;
        break;
    }
    
    // Index usage bonus
    if (executionPlan.indexesUsed.length > 0) {
      score += Math.min(10, executionPlan.indexesUsed.length * 3);
    }
    
    return Math.max(0, Math.min(100, score));
  }

  /**
   * Get performance summary
   */
  public getPerformanceSummary(): {
    totalQueries: number;
    averageExecutionTime: number;
    cacheHitRate: number;
    activeAlerts: number;
    topSlowCollections: Array<{ collection: string; averageTime: number }>;
  } {
    const allStats = databasePerformanceOptimizer.getAllPerformanceStats();
    const cacheStats = databasePerformanceOptimizer.getCacheStats();
    
    let totalQueries = 0;
    let totalExecutionTime = 0;
    const collectionTimes: Array<{ collection: string; averageTime: number }> = [];
    
    for (const [collectionName, stats] of allStats) {
      totalQueries += stats.totalQueries;
      totalExecutionTime += stats.averageQueryTime * stats.totalQueries;
      collectionTimes.push({ collection: collectionName, averageTime: stats.averageQueryTime });
    }
    
    // Sort by average time (slowest first)
    collectionTimes.sort((a, b) => b.averageTime - a.averageTime);
    
    return {
      totalQueries,
      averageExecutionTime: totalQueries > 0 ? totalExecutionTime / totalQueries : 0,
      cacheHitRate: cacheStats.hitRate,
      activeAlerts: this.getActiveAlerts().length,
      topSlowCollections: collectionTimes.slice(0, 5)
    };
  }

  /**
   * Destroy the monitor and clean up resources
   */
  public destroy(): void {
    this.stopMonitoring();
    this.alerts.clear();
    this.trends.clear();
  }
}

// Export singleton instance
export const queryPerformanceMonitor = QueryPerformanceMonitor.getInstance();