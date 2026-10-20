// ABOUTME: React hook for database startup performance monitoring
// ABOUTME: Provides startup metrics, progressive loading states, and optimization controls

import { useState, useEffect, useCallback } from 'react';
import {
  StartupMetrics,
  ProgressiveLoadingState,
  StartupOptimizationConfig,
  databaseStartupOptimizer,
} from '@/services/database/StartupOptimizer';

export interface StartupPerformanceState {
  latestMetrics: StartupMetrics | null;
  allMetrics: StartupMetrics[];
  progressiveLoadingStates: Map<string, ProgressiveLoadingState>;
  loadingStatistics: {
    preloadedCollections: number;
    lazyLoadedCollections: number;
    progressivelyLoadingCollections: number;
    completedProgressiveLoading: number;
    totalCollectionsTracked: number;
  };
  performanceSummary: {
    averageStartupTime: number;
    fastestStartup: number;
    slowestStartup: number;
    recentTrend: 'improving' | 'degrading' | 'stable';
    recommendations: string[];
  };
  configuration: StartupOptimizationConfig;
  isOptimizing: boolean;
}

export interface StartupPerformanceActions {
  updateConfiguration: (config: Partial<StartupOptimizationConfig>) => void;
  resetTracking: () => void;
  refreshMetrics: () => void;
  isCollectionLoaded: (collectionName: string) => boolean;
  getProgressiveLoadingState: (collectionName: string) => ProgressiveLoadingState | null;
}

/**
 * Hook for database startup performance monitoring
 */
export const useStartupPerformance = (): StartupPerformanceState & StartupPerformanceActions => {
  const [state, setState] = useState<StartupPerformanceState>(() => ({
    latestMetrics: databaseStartupOptimizer.getLatestStartupMetrics(),
    allMetrics: databaseStartupOptimizer.getStartupMetrics(),
    progressiveLoadingStates: databaseStartupOptimizer.getProgressiveLoadingStates(),
    loadingStatistics: databaseStartupOptimizer.getLoadingStatistics(),
    performanceSummary: databaseStartupOptimizer.getStartupPerformanceSummary(),
    configuration: databaseStartupOptimizer.getConfiguration(),
    isOptimizing: false, // This would need to be tracked in the optimizer
  }));

  // Update state when startup metrics change
  const updateState = useCallback(() => {
    setState(prevState => ({
      ...prevState,
      latestMetrics: databaseStartupOptimizer.getLatestStartupMetrics(),
      allMetrics: databaseStartupOptimizer.getStartupMetrics(),
      progressiveLoadingStates: databaseStartupOptimizer.getProgressiveLoadingStates(),
      loadingStatistics: databaseStartupOptimizer.getLoadingStatistics(),
      performanceSummary: databaseStartupOptimizer.getStartupPerformanceSummary(),
      configuration: databaseStartupOptimizer.getConfiguration(),
    }));
  }, []);

  // Set up startup metrics listener
  useEffect(() => {
    const handleStartupMetrics = (_metrics: StartupMetrics) => {
      updateState();
    };

    databaseStartupOptimizer.addStartupListener(handleStartupMetrics);

    // Initial update
    updateState();

    return () => {
      databaseStartupOptimizer.removeStartupListener(handleStartupMetrics);
    };
  }, [updateState]);

  // Actions
  const updateConfiguration = useCallback((config: Partial<StartupOptimizationConfig>) => {
    databaseStartupOptimizer.updateConfiguration(config);
    updateState();
  }, [updateState]);

  const resetTracking = useCallback(() => {
    databaseStartupOptimizer.reset();
    updateState();
  }, [updateState]);

  const refreshMetrics = useCallback(() => {
    updateState();
  }, [updateState]);

  const isCollectionLoaded = useCallback((collectionName: string) => {
    return databaseStartupOptimizer.isCollectionLoaded(collectionName);
  }, []);

  const getProgressiveLoadingState = useCallback((collectionName: string) => {
    return databaseStartupOptimizer.getProgressiveLoadingState(collectionName);
  }, []);

  return {
    ...state,
    updateConfiguration,
    resetTracking,
    refreshMetrics,
    isCollectionLoaded,
    getProgressiveLoadingState,
  };
};

/**
 * Hook for simplified startup metrics
 */
export const useStartupMetrics = () => {
  const [metrics, setMetrics] = useState<StartupMetrics | null>(
    databaseStartupOptimizer.getLatestStartupMetrics()
  );

  useEffect(() => {
    const handleStartupMetrics = (newMetrics: StartupMetrics) => {
      setMetrics(newMetrics);
    };

    databaseStartupOptimizer.addStartupListener(handleStartupMetrics);

    return () => {
      databaseStartupOptimizer.removeStartupListener(handleStartupMetrics);
    };
  }, []);

  return metrics;
};

/**
 * Hook for progressive loading states
 */
export const useProgressiveLoading = () => {
  const [loadingStates, setLoadingStates] = useState<Map<string, ProgressiveLoadingState>>(
    databaseStartupOptimizer.getProgressiveLoadingStates()
  );

  useEffect(() => {
    const updateLoadingStates = () => {
      setLoadingStates(databaseStartupOptimizer.getProgressiveLoadingStates());
    };

    // Update loading states every 2 seconds during active loading
    const interval = setInterval(updateLoadingStates, 2000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  const getLoadingProgress = useCallback((collectionName: string): number => {
    const state = loadingStates.get(collectionName);
    if (!state || state.totalRecords === 0) return 0;
    return (state.loadedRecords / state.totalRecords) * 100;
  }, [loadingStates]);

  const isLoadingComplete = useCallback((collectionName: string): boolean => {
    const state = loadingStates.get(collectionName);
    return state ? state.isComplete : false;
  }, [loadingStates]);

  const getLoadingStats = useCallback(() => {
    const states = Array.from(loadingStates.values());
    return {
      totalCollections: states.length,
      completedCollections: states.filter(s => s.isComplete).length,
      activelyLoading: states.filter(s => !s.isComplete).length,
      totalRecords: states.reduce((sum, s) => sum + s.totalRecords, 0),
      loadedRecords: states.reduce((sum, s) => sum + s.loadedRecords, 0),
    };
  }, [loadingStates]);

  return {
    loadingStates,
    getLoadingProgress,
    isLoadingComplete,
    getLoadingStats,
  };
};

/**
 * Hook for startup performance recommendations
 */
export const useStartupRecommendations = () => {
  const [recommendations, setRecommendations] = useState<string[]>(
    databaseStartupOptimizer.getStartupPerformanceSummary().recommendations
  );

  useEffect(() => {
    const updateRecommendations = () => {
      const summary = databaseStartupOptimizer.getStartupPerformanceSummary();
      setRecommendations(summary.recommendations);
    };

    const handleStartupMetrics = () => {
      updateRecommendations();
    };

    databaseStartupOptimizer.addStartupListener(handleStartupMetrics);

    // Update recommendations every 30 seconds
    const interval = setInterval(updateRecommendations, 30000);

    return () => {
      databaseStartupOptimizer.removeStartupListener(handleStartupMetrics);
      clearInterval(interval);
    };
  }, []);

  return recommendations;
};
