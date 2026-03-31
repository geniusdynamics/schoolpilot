// ABOUTME: React hook for managing data layer mode state and operations
// ABOUTME: Provides a clean interface for components to interact with DataModeManager

import { useState, useEffect, useCallback } from 'react';
import { getDataModeManager, DataMode, DataModeStatus, ModeTransitionOptions } from '../services/dataModeManager';

export interface UseDataModeReturn {
  status: DataModeStatus | null;
  isLoading: boolean;
  error: string | null;
  switchMode: (mode: DataMode, options?: ModeTransitionOptions) => Promise<void>;
  clearData: () => Promise<void>;
  seedData: () => Promise<void>;
  refreshStatus: () => Promise<void>;
  resetError: () => void;
}

export function useDataMode(): UseDataModeReturn {
  const [status, setStatus] = useState<DataModeStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dataModeManager = getDataModeManager();

  const refreshStatus = useCallback(async () => {
    try {
      const currentStatus = await dataModeManager.getStatus();
      setStatus(currentStatus);
      setError(null); // Clear errors on successful refresh
    } catch (err) {
      console.error('Failed to refresh status:', err);
      setError(err instanceof Error ? err.message : 'Failed to refresh status');
    }
  }, [dataModeManager]);

  const switchMode = useCallback(async (mode: DataMode, options?: ModeTransitionOptions) => {
    try {
      setIsLoading(true);
      setError(null);
      await dataModeManager.switchMode(mode, options);
    } catch (err) {
      console.error('Failed to switch mode:', err);
      setError(err instanceof Error ? err.message : 'Failed to switch mode');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [dataModeManager]);

  const clearData = useCallback(async (options?: { force?: boolean; confirmationToken?: string }) => {
    try {
      setIsLoading(true);
      setError(null);
      await dataModeManager.clearAllData(options);
      await refreshStatus();
    } catch (err) {
      console.error('Failed to clear data:', err);
      setError(err instanceof Error ? err.message : 'Failed to clear data');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [dataModeManager, refreshStatus]);

  const seedData = useCallback(async (volume?: 'small' | 'medium' | 'large') => {
    try {
      setIsLoading(true);
      setError(null);
      await dataModeManager.seedDemoData(volume);
      await refreshStatus();
    } catch (err) {
      console.error('Failed to seed data:', err);
      setError(err instanceof Error ? err.message : 'Failed to seed data');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [dataModeManager, refreshStatus]);

  const resetError = useCallback(() => {
    setError(null);
  }, []);

  useEffect(() => {
    // Initial status load
    refreshStatus();

    // Event listeners
    const handleModeChanged = (data: any) => {
      refreshStatus();
      setError(null);
    };

    const handleError = (error: Error) => {
      setError(error.message);
      setIsLoading(false);
    };

    const handleTransitionStarted = () => {
      setIsLoading(true);
      setError(null);
    };

    const handleTransitionCompleted = () => {
      setIsLoading(false);
      refreshStatus();
    };

    const handleDataCleared = () => {
      refreshStatus();
    };

    const handleDataSeeded = () => {
      refreshStatus();
    };

    dataModeManager.on('modeChanged', handleModeChanged);
    dataModeManager.on('error', handleError);
    dataModeManager.on('transitionStarted', handleTransitionStarted);
    dataModeManager.on('transitionCompleted', handleTransitionCompleted);
    dataModeManager.on('dataCleared', handleDataCleared);
    dataModeManager.on('dataSeeded', handleDataSeeded);

    return () => {
      dataModeManager.off('modeChanged', handleModeChanged);
      dataModeManager.off('error', handleError);
      dataModeManager.off('transitionStarted', handleTransitionStarted);
      dataModeManager.off('transitionCompleted', handleTransitionCompleted);
      dataModeManager.off('dataCleared', handleDataCleared);
      dataModeManager.off('dataSeeded', handleDataSeeded);
    };
  }, [dataModeManager, refreshStatus]);

  return {
    status,
    isLoading,
    error,
    switchMode,
    clearData,
    seedData,
    refreshStatus,
    resetError
  };
}

export default useDataMode;