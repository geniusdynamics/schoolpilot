// ABOUTME: React hook for database connection pool monitoring
// ABOUTME: Provides real-time pool metrics, status, and management controls
import { useState, useEffect, useCallback } from 'react';
import {
  DatabaseConnectionPool,
  ConnectionPoolMetrics,
  ConnectionPoolConfig,
  databaseConnectionPool,
} from '@/services/database/ConnectionPool';

export interface ConnectionPoolState {
  metrics: ConnectionPoolMetrics;
  status: {
    isHealthy: boolean;
    issues: string[];
    recommendations: string[];
  };
  config: ConnectionPoolConfig;
}

export interface ConnectionPoolActions {
  updateConfig: (config: Partial<ConnectionPoolConfig>) => void;
  refreshMetrics: () => void;
}

/**
 * Hook for database connection pool monitoring
 */
export const useConnectionPool = (): ConnectionPoolState & ConnectionPoolActions => {
  const [state, setState] = useState<ConnectionPoolState>(() => ({
    metrics: databaseConnectionPool.getMetrics(),
    status: databaseConnectionPool.getStatus(),
    config: databaseConnectionPool.getConfig(),
  }));

  // Update state when metrics change
  const updateState = useCallback(() => {
    setState(prevState => ({
      ...prevState,
      metrics: databaseConnectionPool.getMetrics(),
      status: databaseConnectionPool.getStatus(),
      config: databaseConnectionPool.getConfig(),
    }));
  }, []);

  // Set up metrics listener
  useEffect(() => {
    const handleMetricsUpdate = (metrics: ConnectionPoolMetrics) => {
      updateState();
    };

    databaseConnectionPool.addMetricsListener(handleMetricsUpdate);

    // Initial update
    updateState();

    return () => {
      databaseConnectionPool.removeMetricsListener(handleMetricsUpdate);
    };
  }, [updateState]);

  // Actions
  const updateConfig = useCallback((config: Partial<ConnectionPoolConfig>) => {
    databaseConnectionPool.updateConfig(config);
    updateState();
  }, [updateState]);

  const refreshMetrics = useCallback(() => {
    updateState();
  }, [updateState]);

  return {
    ...state,
    updateConfig,
    refreshMetrics,
  };
};

/**
 * Hook for simplified connection pool metrics
 */
export const useConnectionPoolMetrics = () => {
  const [metrics, setMetrics] = useState<ConnectionPoolMetrics>(
    databaseConnectionPool.getMetrics()
  );

  useEffect(() => {
    const handleMetricsUpdate = (newMetrics: ConnectionPoolMetrics) => {
      setMetrics(newMetrics);
    };

    databaseConnectionPool.addMetricsListener(handleMetricsUpdate);

    return () => {
      databaseConnectionPool.removeMetricsListener(handleMetricsUpdate);
    };
  }, []);

  return metrics;
};