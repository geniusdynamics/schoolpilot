// Module Loading Performance Hook
// Provides access to module loading performance metrics and optimization capabilities

import { useState, useEffect } from 'react';
import { dynamicModuleLoader, ModuleLoadingProgress } from '../services/module/dynamicModuleLoader';
import { ModulePerformanceMetrics } from '../services/module/enhancedModuleLoader';

interface UseModuleLoadingPerformanceOptions {
  moduleId?: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

interface UseModuleLoadingPerformanceReturn {
  loadingProgress: ModuleLoadingProgress;
  performanceMetrics: ModulePerformanceMetrics | undefined;
  allPerformanceMetrics: Map<string, ModulePerformanceMetrics>;
  loadTime: number | undefined;
  allLoadTimes: Map<string, number>;
  performanceReport: Record<string, any>;
  isLoading: boolean;
  refreshMetrics: () => void;
}

export const useModuleLoadingPerformance = (
  options: UseModuleLoadingPerformanceOptions = {}
): UseModuleLoadingPerformanceReturn => {
  const {
    moduleId,
    autoRefresh = false,
    refreshInterval = 30000 // 30 seconds
  } = options;

  const [loadingProgress, setLoadingProgress] = useState<ModuleLoadingProgress>(
    dynamicModuleLoader.getLoadingProgress()
  );

  const [performanceMetrics, setPerformanceMetrics] = useState<ModulePerformanceMetrics | undefined>(
    moduleId ? dynamicModuleLoader.getModulePerformanceMetrics(moduleId) : undefined
  );

  const [allPerformanceMetrics, setAllPerformanceMetrics] = useState<Map<string, ModulePerformanceMetrics>>(
    dynamicModuleLoader.getAllModulePerformanceMetrics()
  );

  const [loadTime, setLoadTime] = useState<number | undefined>(
    moduleId ? dynamicModuleLoader.getAllModuleLoadTimes().get(moduleId) : undefined
  );

  const [allLoadTimes, setAllLoadTimes] = useState<Map<string, number>>(
    dynamicModuleLoader.getAllModuleLoadTimes()
  );

  const [performanceReport, setPerformanceReport] = useState<Record<string, any>>({});

  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Subscribe to loading progress updates
  useEffect(() => {
    const unsubscribe = dynamicModuleLoader.subscribeToProgress(currentProgress => {
      setLoadingProgress(currentProgress);
    });

    return unsubscribe;
  }, []);

  // Set up auto-refresh
  useEffect(() => {
    if (!autoRefresh) {
      return;
    }

    const refreshTimer = setInterval(() => {
      refreshMetrics();
    }, refreshInterval);

    return () => {
      clearInterval(refreshTimer);
    };
  }, [autoRefresh, refreshInterval]);

  // Refresh metrics
  const refreshMetrics = () => {
    setIsLoading(true);

    if (moduleId) {
      setPerformanceMetrics(dynamicModuleLoader.getModulePerformanceMetrics(moduleId));
      setLoadTime(dynamicModuleLoader.getAllModuleLoadTimes().get(moduleId));
    }

    setAllPerformanceMetrics(dynamicModuleLoader.getAllModulePerformanceMetrics());
    setAllLoadTimes(dynamicModuleLoader.getAllModuleLoadTimes());
    setPerformanceReport(dynamicModuleLoader.generatePerformanceReport());

    setIsLoading(false);
  };

  return {
    loadingProgress,
    performanceMetrics,
    allPerformanceMetrics,
    loadTime,
    allLoadTimes,
    performanceReport,
    isLoading,
    refreshMetrics
  };
};

export default useModuleLoadingPerformance;