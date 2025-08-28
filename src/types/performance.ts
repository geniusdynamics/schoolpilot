// ABOUTME: TypeScript type definitions for performance monitoring and benchmarking
// ABOUTME: Provides comprehensive type safety for performance-related operations

// Re-export types from services for convenience
export type {
  PerformanceBenchmark,
  ComparisonResult,
  RegressionResult,
  Recommendation,
  BenchmarkStorage
} from '../services/performanceBenchmark';

export type {
  PerformanceReport,
  PerformanceMetric,
  ModuleLoadingMetric,
  DataOperationMetric,
  UserInteractionMetric
} from '../services/performanceMonitor';

// Additional types for UI components
export interface BenchmarkUIState {
  selectedBaseline: string;
  selectedBenchmark: string;
  activeTab: 'baselines' | 'benchmarks' | 'comparison' | 'regression';
  isCreatingBaseline: boolean;
  isRunningBenchmark: boolean;
  showComparison: boolean;
}

export interface PerformanceThreshold {
  metric: string;
  warning: number;
  critical: number;
  unit: 'ms' | 'MB' | 'count' | 'percent';
}

export interface PerformanceAlert {
  id: string;
  type: 'warning' | 'critical' | 'info';
  metric: string;
  message: string;
  timestamp: number;
  acknowledged: boolean;
}

export interface OptimizationSuggestion {
  id: string;
  category: 'startup' | 'memory' | 'modules' | 'data' | 'ui';
  title: string;
  description: string;
  impact: 'low' | 'medium' | 'high';
  difficulty: 'easy' | 'medium' | 'hard';
  estimatedImprovement: string;
  steps: string[];
}

export interface PerformanceConfig {
  monitoring: {
    enabled: boolean;
    autoRefresh: boolean;
    refreshInterval: number;
    metricsRetention: number;
  };
  benchmarking: {
    enabled: boolean;
    autoBaseline: boolean;
    regressionDetection: boolean;
    alertThresholds: PerformanceThreshold[];
  };
  optimization: {
    autoOptimize: boolean;
    suggestionLevel: 'basic' | 'advanced' | 'expert';
    enableRecommendations: boolean;
  };
}

// Chart data types for visualization
export interface ChartDataPoint {
  timestamp: number;
  value: number;
  label?: string;
}

export interface PerformanceChartData {
  startupTime: ChartDataPoint[];
  memoryUsage: ChartDataPoint[];
  moduleLoadingTime: ChartDataPoint[];
  dataOperationTime: ChartDataPoint[];
  interactionResponseTime: ChartDataPoint[];
}

// Export utility types
export type PerformanceMetricKey = keyof PerformanceBenchmark['metrics'];
export type ComparisonStatus = 'improved' | 'degraded' | 'stable';
export type RegressionSeverity = 'low' | 'medium' | 'high' | 'critical';