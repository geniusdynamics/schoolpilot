// ABOUTME: React hook for database memory management monitoring
// ABOUTME: Provides real-time memory metrics, alerts, and management controls

import { useState, useEffect, useCallback, useRef } from 'react';
import { MemoryUsageMetrics, MemoryAlert, MemoryThresholds, databaseMemoryManager } from '@/services/database/MemoryManager';

export interface MemoryManagementState {
  metrics: MemoryUsageMetrics | null;
  history: MemoryUsageMetrics[];
  alerts: MemoryAlert[];
  activeAlerts: MemoryAlert[];
  connectionStats: {
    total: number;
    active: number;
    stale: number;
    byProvider: Record<string, number>;
  };
  summary: {
    current: MemoryUsageMetrics | null;
    trend: 'increasing' | 'decreasing' | 'stable';
    alerts: number;
    connections: {
      active: number;
      stale: number;
    };
    recommendations: string[];
  };
  thresholds: MemoryThresholds;
  isMonitoring: boolean;
}

export interface MemoryManagementActions {
  startMonitoring: (intervalMs?: number) => void;
  stopMonitoring: () => void;
  forceCleanup: () => void;
  resolveAlert: (alertId: string) => boolean;
  updateThresholds: (thresholds: Partial<MemoryThresholds>) => void;
  registerGCCallback: (callback: () => void) => void;
  unregisterGCCallback: (callback: () => void) => void;
  refreshMetrics: () => void;
}

/**
 * Hook for database memory management
 */
export function useMemoryManagement(): MemoryManagementState & MemoryManagementActions {
  const [state, setState] = useState<MemoryManagementState>(() => ({
    metrics: databaseMemoryManager.getLatestMemoryMetrics(),
    history: databaseMemoryManager.getMemoryHistory(),
    alerts: databaseMemoryManager.getAllAlerts(),
    activeAlerts: databaseMemoryManager.getActiveAlerts(),
    connectionStats: databaseMemoryManager.getConnectionStats(),
    summary: databaseMemoryManager.getMemorySummary(),
    thresholds: databaseMemoryManager.getThresholds(),
    isMonitoring: true, // Memory manager starts automatically
  }));

  // Update state when memory metrics change
  const updateState = useCallback(() => {
    setState(prevState => ({
      ...prevState,
      metrics: databaseMemoryManager.getLatestMemoryMetrics(),
      history: databaseMemoryManager.getMemoryHistory(),
      alerts: databaseMemoryManager.getAllAlerts(),
      activeAlerts: databaseMemoryManager.getActiveAlerts(),
      connectionStats: databaseMemoryManager.getConnectionStats(),
      summary: databaseMemoryManager.getMemorySummary(),
      thresholds: databaseMemoryManager.getThresholds(),
    }));
  }, []);

  // Set up memory monitoring listener
  useEffect(() => {
    const handleMemoryUpdate = (metrics: MemoryUsageMetrics) => {
      updateState();
    };

    databaseMemoryManager.addListener(handleMemoryUpdate);

    // Initial update
    updateState();

    return () => {
      databaseMemoryManager.removeListener(handleMemoryUpdate);
    };
  }, [updateState]);

  // Actions
  const startMonitoring = useCallback((intervalMs?: number) => {
    databaseMemoryManager.startMonitoring(intervalMs);
    setState(prevState => ({ ...prevState, isMonitoring: true }));
  }, []);

  const stopMonitoring = useCallback(() => {
    databaseMemoryManager.stopMonitoring();
    setState(prevState => ({ ...prevState, isMonitoring: false }));
  }, []);

  const forceCleanup = useCallback(() => {
    databaseMemoryManager.forceCleanup();
    updateState();
  }, [updateState]);

  const resolveAlert = useCallback((alertId: string) => {
    const result = databaseMemoryManager.resolveAlert(alertId);
    if (result) {
      updateState();
    }
    return result;
  }, [updateState]);

  const updateThresholds = useCallback((thresholds: Partial<MemoryThresholds>) => {
    databaseMemoryManager.updateThresholds(thresholds);
    updateState();
  }, [updateState]);

  const registerGCCallback = useCallback((callback: () => void) => {
    databaseMemoryManager.registerGCCallback(callback);
  }, []);

  const unregisterGCCallback = useCallback((callback: () => void) => {
    databaseMemoryManager.unregisterGCCallback(callback);
  }, []);

  const refreshMetrics = useCallback(() => {
    updateState();
  }, [updateState]);

  return {
    ...state,
    startMonitoring,
    stopMonitoring,
    forceCleanup,
    resolveAlert,
    updateThresholds,
    registerGCCallback,
    unregisterGCCallback,
    refreshMetrics,
  };
}

/**
 * Hook for simplified memory metrics
 */
export function useMemoryMetrics() {
  const [metrics, setMetrics] = useState<MemoryUsageMetrics | null>(
    databaseMemoryManager.getLatestMemoryMetrics()
  );

  useEffect(() => {
    const handleMemoryUpdate = (newMetrics: MemoryUsageMetrics) => {
      setMetrics(newMetrics);
    };

    databaseMemoryManager.addListener(handleMemoryUpdate);

    return () => {
      databaseMemoryManager.removeListener(handleMemoryUpdate);
    };
  }, []);

  return metrics;
}

/**
 * Hook for memory alerts only
 */
export function useMemoryAlerts() {
  const [alerts, setAlerts] = useState<MemoryAlert[]>(
    databaseMemoryManager.getActiveAlerts()
  );

  useEffect(() => {
    const updateAlerts = () => {
      setAlerts(databaseMemoryManager.getActiveAlerts());
    };

    databaseMemoryManager.addListener(updateAlerts);

    // Update alerts every 30 seconds
    const interval = setInterval(updateAlerts, 30000);

    return () => {
      databaseMemoryManager.removeListener(updateAlerts);
      clearInterval(interval);
    };
  }, []);

  return alerts;
}

/**
 * Hook for connection tracking
 */
export function useConnectionTracking() {
  const registerConnection = useCallback((id: string, provider: string) => {
    databaseMemoryManager.registerConnection(id, provider);
  }, []);

  const updateConnectionActivity = useCallback((id: string) => {
    databaseMemoryManager.updateConnectionActivity(id);
  }, []);

  const unregisterConnection = useCallback((id: string) => {
    databaseMemoryManager.unregisterConnection(id);
  }, []);

  const getConnectionStats = useCallback(() => {
    return databaseMemoryManager.getConnectionStats();
  }, []);

  return {
    registerConnection,
    updateConnectionActivity,
    unregisterConnection,
    getConnectionStats,
  };
}

export function useMemoryAwareCache<T>(namespace: string, maxEntries = 50) {
  const cacheRef = useRef<Map<string, T>>(new Map());

  const setCache = useCallback((key: string, value: T) => {
    const namespacedKey = `${namespace}:${key}`;
    const cache = cacheRef.current;

    if (cache.size >= maxEntries && !cache.has(namespacedKey)) {
      const firstKey = cache.keys().next().value;
      if (firstKey) {
        cache.delete(firstKey);
      }
    }

    cache.set(namespacedKey, value);
  }, [namespace, maxEntries]);

  const getCache = useCallback((key: string): T | null => {
    const namespacedKey = `${namespace}:${key}`;
    return cacheRef.current.get(namespacedKey) ?? null;
  }, [namespace]);

  const clearCache = useCallback((key?: string) => {
    if (key) {
      cacheRef.current.delete(`${namespace}:${key}`);
      return;
    }

    const keysToDelete: string[] = [];
    for (const cacheKey of cacheRef.current.keys()) {
      if (cacheKey.startsWith(`${namespace}:`)) {
        keysToDelete.push(cacheKey);
      }
    }

    keysToDelete.forEach(cacheKey => cacheRef.current.delete(cacheKey));
  }, [namespace]);

  return {
    setCache,
    getCache,
    clearCache,
  };
}
