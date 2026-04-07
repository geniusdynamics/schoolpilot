// ABOUTME: React hook for performance benchmarking operations and state management
// ABOUTME: Provides interface for creating baselines, running benchmarks, and comparing results

import { useState, useEffect, useCallback } from 'react';
import { 
  performanceBenchmarkService, 
  PerformanceBenchmark, 
  ComparisonResult, 
  RegressionResult 
} from '../services/performance/performanceBenchmark';

export interface BenchmarkState {
  baselines: PerformanceBenchmark[];
  benchmarks: PerformanceBenchmark[];
  isLoading: boolean;
  error: string | null;
  lastComparison: ComparisonResult | null;
  lastRegression: RegressionResult | null;
}

export interface BenchmarkOperations {
  // Baseline operations
  createBaseline: (name: string, description?: string, tags?: string[]) => Promise<PerformanceBenchmark | null>;
  deleteBaseline: (id: string) => boolean;
  
  // Benchmark operations
  runBenchmark: (name?: string, baselineId?: string) => Promise<PerformanceBenchmark | null>;
  deleteBenchmark: (id: string) => boolean;
  
  // Comparison operations
  compareBenchmarks: (baselineId: string, currentId: string) => ComparisonResult | null;
  detectRegression: (baselineId?: string) => RegressionResult | null;
  
  // Data operations
  refreshData: () => void;
  exportData: () => string;
  importData: (data: string) => boolean;
  clearAllData: () => void;
  
  // Utility operations
  clearError: () => void;
}

export const usePerformanceBenchmark = (): BenchmarkState & BenchmarkOperations => {
  const [state, setState] = useState<BenchmarkState>({
    baselines: [],
    benchmarks: [],
    isLoading: false,
    error: null,
    lastComparison: null,
    lastRegression: null
  });

  // Load initial data
  const refreshData = useCallback(() => {
    try {
      const baselines = performanceBenchmarkService.getBaselines();
      const benchmarks = performanceBenchmarkService.getBenchmarks();
      
      setState(prev => ({
        ...prev,
        baselines,
        benchmarks,
        error: null
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to load benchmark data'
      }));
    }
  }, []);

  // Load data on mount
  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // Create baseline
  const createBaseline = useCallback(async (
    name: string, 
    description?: string, 
    tags?: string[]
  ): Promise<PerformanceBenchmark | null> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const baseline = await performanceBenchmarkService.createBaseline(name, description, tags);
      refreshData(); // Refresh to get updated data
      setState(prev => ({ ...prev, isLoading: false }));
      return baseline;
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to create baseline'
      }));
      return null;
    }
  }, [refreshData]);

  // Delete baseline
  const deleteBaseline = useCallback((id: string): boolean => {
    try {
      const success = performanceBenchmarkService.deleteBaseline(id);
      if (success) {
        refreshData();
      }
      return success;
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to delete baseline'
      }));
      return false;
    }
  }, [refreshData]);

  // Run benchmark
  const runBenchmark = useCallback(async (
    name?: string, 
    baselineId?: string
  ): Promise<PerformanceBenchmark | null> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const benchmark = await performanceBenchmarkService.runBenchmark(name, baselineId);
      refreshData(); // Refresh to get updated data
      setState(prev => ({ ...prev, isLoading: false }));
      return benchmark;
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to run benchmark'
      }));
      return null;
    }
  }, [refreshData]);

  // Delete benchmark
  const deleteBenchmark = useCallback((id: string): boolean => {
    try {
      const success = performanceBenchmarkService.deleteBenchmark(id);
      if (success) {
        refreshData();
      }
      return success;
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to delete benchmark'
      }));
      return false;
    }
  }, [refreshData]);

  // Compare benchmarks
  const compareBenchmarks = useCallback((baselineId: string, currentId: string): ComparisonResult | null => {
    try {
      const comparison = performanceBenchmarkService.compareBenchmarks(baselineId, currentId);
      setState(prev => ({ ...prev, lastComparison: comparison, error: null }));
      return comparison;
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to compare benchmarks'
      }));
      return null;
    }
  }, []);

  // Detect regression
  const detectRegression = useCallback((baselineId?: string): RegressionResult | null => {
    try {
      const benchmarks = performanceBenchmarkService.getBenchmarks();
      const regression = performanceBenchmarkService.detectRegression(benchmarks, baselineId);
      setState(prev => ({ ...prev, lastRegression: regression, error: null }));
      return regression;
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to detect regression'
      }));
      return null;
    }
  }, []);

  // Export data
  const exportData = useCallback((): string => {
    try {
      return performanceBenchmarkService.exportBenchmarks();
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to export data'
      }));
      return '';
    }
  }, []);

  // Import data
  const importData = useCallback((data: string): boolean => {
    try {
      const success = performanceBenchmarkService.importBenchmarks(data);
      if (success) {
        refreshData();
      } else {
        setState(prev => ({ ...prev, error: 'Invalid import data format' }));
      }
      return success;
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to import data'
      }));
      return false;
    }
  }, [refreshData]);

  // Clear all data
  const clearAllData = useCallback(() => {
    try {
      performanceBenchmarkService.clearAllData();
      refreshData();
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to clear data'
      }));
    }
  }, [refreshData]);

  // Clear error
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  return {
    // State
    ...state,
    
    // Operations
    createBaseline,
    deleteBaseline,
    runBenchmark,
    deleteBenchmark,
    compareBenchmarks,
    detectRegression,
    refreshData,
    exportData,
    importData,
    clearAllData,
    clearError
  };
};

// Hook for automatic regression detection
export const useRegressionDetection = (
  enabled: boolean = false,
  checkInterval: number = 60000 // 1 minute
) => {
  const [regressionStatus, setRegressionStatus] = useState<{
    lastCheck: number | null;
    detected: boolean;
    severity: RegressionResult['severity'];
    details: RegressionResult | null;
  }>({
    lastCheck: null,
    detected: false,
    severity: 'low',
    details: null
  });

  useEffect(() => {
    if (!enabled) return;

    const checkRegression = () => {
      try {
        const benchmarks = performanceBenchmarkService.getBenchmarks();
        const regression = performanceBenchmarkService.detectRegression(benchmarks);
        
        setRegressionStatus({
          lastCheck: Date.now(),
          detected: regression.detected,
          severity: regression.severity,
          details: regression
        });

        // Log significant regressions
        if (regression.detected && (regression.severity === 'high' || regression.severity === 'critical')) {
          console.warn('Performance regression detected:', regression);
        }
      } catch (error) {
        console.error('Failed to check for regression:', error);
      }
    };

    // Initial check
    checkRegression();

    // Set up interval
    const interval = setInterval(checkRegression, checkInterval);

    return () => clearInterval(interval);
  }, [enabled, checkInterval]);

  return regressionStatus;
};