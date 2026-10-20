// ABOUTME: React hook for database performance monitoring
// ABOUTME: Provides real-time query performance metrics, health summary, and optimization recommendations

import { useState, useEffect, useCallback } from 'react';
import { databasePerformanceOptimizer } from '@/services/database/DatabasePerformanceOptimizer';

export interface DatabasePerformanceMetrics {
  averageQueryTime: number;
  slowQueries: number;
  cacheHitRate: number;
  totalOperations: number;
  failedOperations: number;
}

export interface DatabasePerformanceSummary {
  overall: 'excellent' | 'good' | 'fair' | 'poor';
}

export interface DatabasePerformanceResult {
  metrics: DatabasePerformanceMetrics;
  summary: DatabasePerformanceSummary;
  recommendations: string[];
  refreshMetrics: () => void;
}

/**
 * Hook for database performance monitoring
 * Returns query performance metrics, health summary, and optimization recommendations
 */
export function useDatabasePerformance(): DatabasePerformanceResult {
  const [metrics, setMetrics] = useState<DatabasePerformanceMetrics>(() => {
    const report = databasePerformanceOptimizer.getPerformanceReport();
    return {
      averageQueryTime: report.averageQueryTime,
      slowQueries: report.slowQueries.length,
      cacheHitRate: report.cacheHitRate / 100,
      totalOperations: report.totalQueries,
      failedOperations: 0,
    };
  });

  const [summary, setSummary] = useState<DatabasePerformanceSummary>(() => {
    const report = databasePerformanceOptimizer.getPerformanceReport();
    return {
      overall: deriveOverallRating(report.averageQueryTime, report.cacheHitRate, report.maintenanceNeeded),
    };
  });

  const [recommendations, setRecommendations] = useState<string[]>(() => {
    return generateRecommendations(databasePerformanceOptimizer.getPerformanceReport());
  });

  const updateState = useCallback(() => {
    const report = databasePerformanceOptimizer.getPerformanceReport();
    setMetrics({
      averageQueryTime: report.averageQueryTime,
      slowQueries: report.slowQueries.length,
      cacheHitRate: report.cacheHitRate / 100,
      totalOperations: report.totalQueries,
      failedOperations: 0,
    });
    setSummary({
      overall: deriveOverallRating(report.averageQueryTime, report.cacheHitRate, report.maintenanceNeeded),
    });
    setRecommendations(generateRecommendations(report));
  }, []);

  // Poll performance data every 30 seconds
  useEffect(() => {
    const interval = setInterval(updateState, 30000);
    return () => clearInterval(interval);
  }, [updateState]);

  const refreshMetrics = useCallback(() => {
    updateState();
  }, [updateState]);

  return {
    metrics,
    summary,
    recommendations,
    refreshMetrics,
  };
}

/**
 * Derive an overall performance rating from key metrics
 */
function deriveOverallRating(
  averageQueryTime: number,
  cacheHitRate: number,
  maintenanceNeeded: boolean
): 'excellent' | 'good' | 'fair' | 'poor' {
  if (averageQueryTime < 50 && cacheHitRate > 90 && !maintenanceNeeded) {
    return 'excellent';
  }
  if (averageQueryTime < 200 && cacheHitRate > 70 && !maintenanceNeeded) {
    return 'good';
  }
  if (averageQueryTime < 500 && cacheHitRate > 50) {
    return 'fair';
  }
  return 'poor';
}

/**
 * Generate human-readable recommendations based on the performance report
 */
function generateRecommendations(report: {
  averageQueryTime: number;
  slowQueries: any[];
  cacheHitRate: number;
  maintenanceNeeded: boolean;
  indexRecommendations: any[];
}): string[] {
  const recs: string[] = [];

  if (report.averageQueryTime > 500) {
    recs.push(`High average query time (${report.averageQueryTime.toFixed(0)}ms) - consider adding indexes or optimizing queries`);
  }

  if (report.slowQueries.length > 5) {
    recs.push(`${report.slowQueries.length} slow queries detected - review and optimize slow running queries`);
  }

  if (report.cacheHitRate < 60) {
    recs.push(`Low cache hit rate (${report.cacheHitRate.toFixed(0)}%) - consider increasing cache size or reviewing cache strategy`);
  }

  if (report.maintenanceNeeded) {
    recs.push('Database maintenance is recommended - consider running compaction and cache cleanup');
  }

  if (report.indexRecommendations.length > 0) {
    const highPriority = report.indexRecommendations.filter((r: any) => r.priority === 'high');
    if (highPriority.length > 0) {
      recs.push(`${highPriority.length} high-priority index recommendations available for improved query performance`);
    }
  }

  if (recs.length === 0) {
    recs.push('Database performance is healthy - no recommendations at this time');
  }

  return recs;
}

export default useDatabasePerformance;
