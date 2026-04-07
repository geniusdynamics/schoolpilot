// ABOUTME: Performance analysis utilities for statistical analysis and trend detection
// ABOUTME: Provides helper functions for performance data analysis and visualization

import { PerformanceBenchmark } from '../services/performance/performanceBenchmark';
import { ChartDataPoint, PerformanceChartData } from '../types/performance';

/**
 * Calculate statistical measures for a set of values
 */
export interface StatisticalSummary {
  mean: number;
  median: number;
  min: number;
  max: number;
  standardDeviation: number;
  variance: number;
  percentile95: number;
  percentile99: number;
}

export function calculateStatistics(values: number[]): StatisticalSummary {
  if (values.length === 0) {
    return {
      mean: 0,
      median: 0,
      min: 0,
      max: 0,
      standardDeviation: 0,
      variance: 0,
      percentile95: 0,
      percentile99: 0
    };
  }

  const sorted = [...values].sort((a, b) => a - b);
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  const standardDeviation = Math.sqrt(variance);
  
  const getPercentile = (p: number) => {
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  };

  return {
    mean,
    median: sorted[Math.floor(sorted.length / 2)],
    min: sorted[0],
    max: sorted[sorted.length - 1],
    standardDeviation,
    variance,
    percentile95: getPercentile(95),
    percentile99: getPercentile(99)
  };
}

/**
 * Detect trends in performance data
 */
export interface TrendAnalysis {
  direction: 'improving' | 'degrading' | 'stable';
  strength: 'weak' | 'moderate' | 'strong';
  confidence: number; // 0-1
  slope: number;
  correlation: number;
}

export function analyzeTrend(dataPoints: ChartDataPoint[]): TrendAnalysis {
  if (dataPoints.length < 3) {
    return {
      direction: 'stable',
      strength: 'weak',
      confidence: 0,
      slope: 0,
      correlation: 0
    };
  }

  // Calculate linear regression
  const n = dataPoints.length;
  const sumX = dataPoints.reduce((sum, point, index) => sum + index, 0);
  const sumY = dataPoints.reduce((sum, point) => sum + point.value, 0);
  const sumXY = dataPoints.reduce((sum, point, index) => sum + (index * point.value), 0);
  const sumXX = dataPoints.reduce((sum, point, index) => sum + (index * index), 0);
  const sumYY = dataPoints.reduce((sum, point) => sum + (point.value * point.value), 0);

  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const correlation = (n * sumXY - sumX * sumY) / 
    Math.sqrt((n * sumXX - sumX * sumX) * (n * sumYY - sumY * sumY));

  const direction = slope > 0.01 ? 'degrading' : slope < -0.01 ? 'improving' : 'stable';
  const absCorrelation = Math.abs(correlation);
  const strength = absCorrelation > 0.7 ? 'strong' : absCorrelation > 0.4 ? 'moderate' : 'weak';
  const confidence = Math.min(1, absCorrelation * (n / 10)); // Confidence increases with more data points

  return {
    direction,
    strength,
    confidence,
    slope,
    correlation
  };
}

/**
 * Convert benchmarks to chart data
 */
export function benchmarksToChartData(benchmarks: PerformanceBenchmark[]): PerformanceChartData {
  const sortedBenchmarks = benchmarks.sort((a, b) => a.timestamp - b.timestamp);

  return {
    startupTime: sortedBenchmarks.map(b => ({
      timestamp: b.timestamp,
      value: b.metrics.startupTime,
      label: b.name
    })),
    memoryUsage: sortedBenchmarks.map(b => ({
      timestamp: b.timestamp,
      value: b.metrics.memoryUsage,
      label: b.name
    })),
    moduleLoadingTime: sortedBenchmarks.map(b => ({
      timestamp: b.timestamp,
      value: b.metrics.moduleLoadingTime,
      label: b.name
    })),
    dataOperationTime: sortedBenchmarks.map(b => ({
      timestamp: b.timestamp,
      value: b.metrics.dataOperationTime,
      label: b.name
    })),
    interactionResponseTime: sortedBenchmarks.map(b => ({
      timestamp: b.timestamp,
      value: b.metrics.interactionResponseTime,
      label: b.name
    }))
  };
}

/**
 * Calculate performance score based on multiple metrics
 */
export function calculatePerformanceScore(benchmark: PerformanceBenchmark, baseline?: PerformanceBenchmark): number {
  const weights = {
    startupTime: 0.3,
    memoryUsage: 0.25,
    moduleLoadingTime: 0.2,
    dataOperationTime: 0.15,
    interactionResponseTime: 0.1
  };

  if (!baseline) {
    // Score based on absolute values (lower is better for most metrics)
    const scores = {
      startupTime: Math.max(0, 100 - (benchmark.metrics.startupTime / 50)), // 50ms = 0 points
      memoryUsage: Math.max(0, 100 - (benchmark.metrics.memoryUsage / (50 * 1024 * 1024))), // 50MB = 0 points
      moduleLoadingTime: Math.max(0, 100 - (benchmark.metrics.moduleLoadingTime / 20)), // 20ms = 0 points
      dataOperationTime: Math.max(0, 100 - (benchmark.metrics.dataOperationTime / 10)), // 10ms = 0 points
      interactionResponseTime: Math.max(0, 100 - (benchmark.metrics.interactionResponseTime / 5)) // 5ms = 0 points
    };

    return Object.entries(weights).reduce((total, [metric, weight]) => {
      return total + (scores[metric as keyof typeof scores] * weight);
    }, 0);
  }

  // Score based on comparison to baseline
  const improvements = {
    startupTime: Math.max(-50, Math.min(50, ((baseline.metrics.startupTime - benchmark.metrics.startupTime) / baseline.metrics.startupTime) * 100)),
    memoryUsage: Math.max(-50, Math.min(50, ((baseline.metrics.memoryUsage - benchmark.metrics.memoryUsage) / baseline.metrics.memoryUsage) * 100)),
    moduleLoadingTime: Math.max(-50, Math.min(50, ((baseline.metrics.moduleLoadingTime - benchmark.metrics.moduleLoadingTime) / baseline.metrics.moduleLoadingTime) * 100)),
    dataOperationTime: Math.max(-50, Math.min(50, ((baseline.metrics.dataOperationTime - benchmark.metrics.dataOperationTime) / baseline.metrics.dataOperationTime) * 100)),
    interactionResponseTime: Math.max(-50, Math.min(50, ((baseline.metrics.interactionResponseTime - benchmark.metrics.interactionResponseTime) / baseline.metrics.interactionResponseTime) * 100))
  };

  const score = Object.entries(weights).reduce((total, [metric, weight]) => {
    return total + ((improvements[metric as keyof typeof improvements] + 50) * weight);
  }, 0);

  return Math.max(0, Math.min(100, score));
}

/**
 * Identify performance bottlenecks
 */
export interface PerformanceBottleneck {
  metric: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  value: number;
  threshold: number;
  impact: string;
  suggestions: string[];
}

export function identifyBottlenecks(benchmark: PerformanceBenchmark): PerformanceBottleneck[] {
  const bottlenecks: PerformanceBottleneck[] = [];

  // Define thresholds (these could be configurable)
  const thresholds = {
    startupTime: { medium: 2000, high: 5000, critical: 10000 }, // ms
    memoryUsage: { medium: 50 * 1024 * 1024, high: 100 * 1024 * 1024, critical: 200 * 1024 * 1024 }, // bytes
    moduleLoadingTime: { medium: 500, high: 1000, critical: 2000 }, // ms
    dataOperationTime: { medium: 100, high: 500, critical: 1000 }, // ms
    interactionResponseTime: { medium: 50, high: 100, critical: 200 } // ms
  };

  Object.entries(benchmark.metrics).forEach(([metric, value]) => {
    if (metric === 'totalMetrics') return; // Skip this metric

    const threshold = thresholds[metric as keyof typeof thresholds];
    if (!threshold) return;

    let severity: PerformanceBottleneck['severity'] = 'low';
    let suggestions: string[] = [];

    if (value >= threshold.critical) {
      severity = 'critical';
    } else if (value >= threshold.high) {
      severity = 'high';
    } else if (value >= threshold.medium) {
      severity = 'medium';
    } else {
      return; // No bottleneck
    }

    // Generate suggestions based on metric
    switch (metric) {
      case 'startupTime':
        suggestions = [
          'Implement lazy loading for non-critical modules',
          'Optimize application initialization sequence',
          'Consider code splitting strategies',
          'Review and optimize synchronous operations during startup'
        ];
        break;
      case 'memoryUsage':
        suggestions = [
          'Review component cleanup and unmounting',
          'Optimize data caching strategies',
          'Check for memory leaks and circular references',
          'Consider implementing virtual scrolling for large lists'
        ];
        break;
      case 'moduleLoadingTime':
        suggestions = [
          'Optimize module bundling and dependencies',
          'Implement module preloading for critical paths',
          'Review network connectivity and CDN usage',
          'Consider dynamic imports for better code splitting'
        ];
        break;
      case 'dataOperationTime':
        suggestions = [
          'Optimize database queries and indexing',
          'Implement data caching and memoization',
          'Review data transformation and processing logic',
          'Consider pagination for large datasets'
        ];
        break;
      case 'interactionResponseTime':
        suggestions = [
          'Optimize event handlers and UI updates',
          'Implement debouncing for frequent operations',
          'Review component re-rendering patterns',
          'Consider using React.memo and useMemo for optimization'
        ];
        break;
    }

    bottlenecks.push({
      metric,
      severity,
      value,
      threshold: threshold.medium,
      impact: `${metric} is ${((value / threshold.medium - 1) * 100).toFixed(0)}% above recommended threshold`,
      suggestions
    });
  });

  return bottlenecks.sort((a, b) => {
    const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
    return severityOrder[b.severity] - severityOrder[a.severity];
  });
}

/**
 * Generate performance insights
 */
export interface PerformanceInsight {
  type: 'improvement' | 'degradation' | 'stability' | 'anomaly';
  title: string;
  description: string;
  confidence: number;
  actionable: boolean;
  recommendations?: string[];
}

export function generateInsights(
  benchmarks: PerformanceBenchmark[],
): PerformanceInsight[] {
  const insights: PerformanceInsight[] = [];

  if (benchmarks.length < 2) {
    return insights;
  }

  const recent = benchmarks.slice(0, 5); // Last 5 benchmarks
  const chartData = benchmarksToChartData(recent);

  // Analyze trends for each metric
  Object.entries(chartData).forEach(([metric, data]) => {
    const trend = analyzeTrend(data);
    
    if (trend.confidence > 0.6) {
      if (trend.direction === 'improving' && trend.strength !== 'weak') {
        insights.push({
          type: 'improvement',
          title: `${metric} is improving`,
          description: `${metric} shows a ${trend.strength} ${trend.direction} trend with ${(trend.confidence * 100).toFixed(0)}% confidence`,
          confidence: trend.confidence,
          actionable: false
        });
      } else if (trend.direction === 'degrading' && trend.strength !== 'weak') {
        insights.push({
          type: 'degradation',
          title: `${metric} is degrading`,
          description: `${metric} shows a ${trend.strength} ${trend.direction} trend with ${(trend.confidence * 100).toFixed(0)}% confidence`,
          confidence: trend.confidence,
          actionable: true,
          recommendations: [
            `Investigate recent changes that might affect ${metric}`,
            'Review performance optimization strategies',
            'Consider creating a new baseline after fixes'
          ]
        });
      }
    }
  });

  // Check for anomalies
  recent.forEach((benchmark, index) => {
    if (index === 0) return; // Skip first benchmark

    const previous = recent[index - 1];
    Object.entries(benchmark.metrics).forEach(([metric, value]) => {
      if (metric === 'totalMetrics') return;

      const previousValue = previous.metrics[metric as keyof typeof previous.metrics];
      const change = Math.abs((value - previousValue) / previousValue);

      if (change > 0.5) { // 50% change
        insights.push({
          type: 'anomaly',
          title: `Significant ${metric} change detected`,
          description: `${metric} changed by ${(change * 100).toFixed(0)}% between recent benchmarks`,
          confidence: 0.8,
          actionable: true,
          recommendations: [
            'Investigate what changed between these benchmark runs',
            'Check for environmental factors (network, system load)',
            'Verify data integrity and measurement accuracy'
          ]
        });
      }
    });
  });

  return insights.sort((a, b) => b.confidence - a.confidence);
}

/**
 * Format performance values for display
 */
export function formatPerformanceValue(value: number, metric: string): string {
  switch (metric) {
    case 'startupTime':
    case 'moduleLoadingTime':
    case 'dataOperationTime':
    case 'interactionResponseTime':
      return value < 1000 ? `${value.toFixed(1)}ms` : `${(value / 1000).toFixed(2)}s`;
    case 'memoryUsage': {
      const mb = value / (1024 * 1024);
      return mb < 1024 ? `${mb.toFixed(1)}MB` : `${(mb / 1024).toFixed(2)}GB`;
    }
    case 'totalMetrics':
      return value.toString();
    default:
      return value.toFixed(2);
  }
}

/**
 * Get performance status color
 */
export function getPerformanceStatusColor(status: 'improved' | 'degraded' | 'stable'): string {
  switch (status) {
    case 'improved': return 'text-green-600';
    case 'degraded': return 'text-red-600';
    default: return 'text-gray-600';
  }
}