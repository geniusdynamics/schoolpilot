import { useState, useEffect, useCallback } from 'react';
import { logger } from '@/utils/logging';

import {
  checkReorderRequirements,
  ReorderAlert,
  ReorderMonitoringResult
} from '../services/reorderMonitoringService';

export interface UseReorderMonitoringReturn {
  // State
  alerts: ReorderAlert[];
  monitoringResult: ReorderMonitoringResult | null;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  checkReorderRequirements: () => Promise<void>;
  getActiveAlerts: () => Promise<void>;
  dismissAlert: (itemId: string) => Promise<void>;
  refreshAlerts: () => Promise<void>;
  
  // Computed values
  highPriorityAlerts: ReorderAlert[];
  mediumPriorityAlerts: ReorderAlert[];
  lowPriorityAlerts: ReorderAlert[];
  totalAlertsCount: number;
}

/**
 * Hook for managing automated reorder monitoring and alerts
 */
export const useReorderMonitoring = (): UseReorderMonitoringReturn => {
  const [alerts, setAlerts] = useState<ReorderAlert[]>([]);
  const [monitoringResult, setMonitoringResult] = useState<ReorderMonitoringResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Check all items for reorder requirements
   */
  const checkReorderRequirementsAction = useCallback(async (items, stockLevels) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = checkReorderRequirements(items, stockLevels);
      setMonitoringResult(result);
      setAlerts(result.alerts);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to check reorder requirements';
      setError(errorMessage);
      logger.error('Error checking reorder requirements:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Get active reorder alerts - placeholder implementation
   */
  const getActiveAlerts = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // For now, just return current alerts since we don't have persistent storage
      // In a real implementation, this would fetch from a database or API
      logger.info('Getting active alerts (placeholder)');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get active alerts';
      setError(errorMessage);
      logger.error('Error getting active alerts:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Dismiss a specific alert
   */
  const dismissAlert = useCallback(async (itemId: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // In a real implementation, this would update the database
      // For now, just remove from local state
      setAlerts(prevAlerts => prevAlerts.filter(alert => alert.item_id !== itemId));
      logger.info(`Alert dismissed for item: ${itemId}`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to dismiss alert';
      setError(errorMessage);
      logger.error('Error dismissing alert:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Refresh alerts by getting the latest active alerts
   */
  const refreshAlerts = useCallback(async () => {
    await getActiveAlerts();
  }, [getActiveAlerts]);

  // Computed values
  const highPriorityAlerts = alerts.filter(alert => alert.priority === 'HIGH');
  const mediumPriorityAlerts = alerts.filter(alert => alert.priority === 'MEDIUM');
  const lowPriorityAlerts = alerts.filter(alert => alert.priority === 'LOW');
  const totalAlertsCount = alerts.length;

  // Load active alerts on mount
  useEffect(() => {
    getActiveAlerts();
  }, [getActiveAlerts]);

  return {
    // State
    alerts,
    monitoringResult,
    isLoading,
    error,
    
    // Actions
    checkReorderRequirements: checkReorderRequirementsAction,
    getActiveAlerts,
    dismissAlert,
    refreshAlerts,
    
    // Computed values
    highPriorityAlerts,
    mediumPriorityAlerts,
    lowPriorityAlerts,
    totalAlertsCount
  };
};

/**
 * Hook for periodic reorder monitoring
 * Automatically checks reorder requirements at specified intervals
 */
export const usePeriodicReorderMonitoring = (intervalMinutes: number = 60) => {
  const reorderMonitoring = useReorderMonitoring();
  const [isAutoMonitoringEnabled, setIsAutoMonitoringEnabled] = useState(false);
  const [lastAutoCheck, setLastAutoCheck] = useState<Date | null>(null);

  useEffect(() => {
    if (!isAutoMonitoringEnabled) return;

    const intervalMs = intervalMinutes * 60 * 1000;
    
    const performAutoCheck = async () => {
      try {
        await reorderMonitoring.checkReorderRequirements();
        setLastAutoCheck(new Date());
      } catch (error) {
        logger.error('Auto reorder check failed:', error);
      }
    };

    // Perform initial check
    performAutoCheck();

    // Set up interval
    const interval = setInterval(performAutoCheck, intervalMs);

    return () => clearInterval(interval);
  }, [isAutoMonitoringEnabled, intervalMinutes, reorderMonitoring]);

  const enableAutoMonitoring = useCallback(() => {
    setIsAutoMonitoringEnabled(true);
  }, []);

  const disableAutoMonitoring = useCallback(() => {
    setIsAutoMonitoringEnabled(false);
  }, []);

  return {
    ...reorderMonitoring,
    isAutoMonitoringEnabled,
    lastAutoCheck,
    enableAutoMonitoring,
    disableAutoMonitoring
  };
};