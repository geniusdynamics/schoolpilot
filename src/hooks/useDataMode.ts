// ABOUTME: React hook for managing data layer mode state and operations
// ABOUTME: Provides a clean interface for components to interact with DataModeManager

import { useState, useEffect, useCallback } from 'react';
import { getDataModeManager, DataMode, DataModeStatus, ModeTransitionOptions, isDemoDataCleared as checkIsDemoDataCleared, markDemoDataCleared as serviceMarkDemoCleared } from '../services/data/dataModeManager';

// Use the same key as the service for consistency
const DEMO_CLEARED_KEY = 'schoolpilot_demo_data_cleared';

export interface UseDataModeReturn {
  status: DataModeStatus | null;
  isLoading: boolean;
  error: string | null;
  switchMode: (mode: DataMode, options?: ModeTransitionOptions) => Promise<void>;
  clearData: (options?: { force?: boolean; confirmationToken?: string }) => Promise<void>;
  seedData: (volume?: 'tiny' | 'small' | 'medium' | 'large' | 'enterprise', modules?: string[]) => Promise<void>;
  refreshStatus: () => Promise<void>;
  resetError: () => void;
  isDemoCleared: boolean;
  markDemoCleared: () => void;
  isDemoReseedingDisabled: boolean;
}

export function useDataMode(): UseDataModeReturn {
  const [status, setStatus] = useState<DataModeStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDemoCleared, setIsDemoCleared] = useState(() => localStorage.getItem(DEMO_CLEARED_KEY) === 'true');

  const dataModeManager = getDataModeManager();

  const markDemoCleared = useCallback(() => {
    serviceMarkDemoCleared();
    setIsDemoCleared(true);
  }, []);

  const refreshStatus = useCallback(async () => {
    try {
      const currentStatus = await dataModeManager.getStatus();
      setStatus(currentStatus);
      setError(null);
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
      // If clearing data in demo mode, mark as cleared for production transition
      const currentMode = dataModeManager.getCurrentMode();
      if (currentMode === 'demo') {
        markDemoCleared();
      }
      await refreshStatus();
    } catch (err) {
      console.error('Failed to clear data:', err);
      setError(err instanceof Error ? err.message : 'Failed to clear data');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [dataModeManager, refreshStatus, markDemoCleared]);

  const seedData = useCallback(async (volume?: 'tiny' | 'small' | 'medium' | 'large' | 'enterprise', modules?: string[]) => {
    try {
      setIsLoading(true);
      setError(null);
      await dataModeManager.seedDemoData(volume, modules);
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
    refreshStatus();

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
      // Check if demo mode was cleared
      const currentMode = dataModeManager.getCurrentMode();
      if (currentMode === 'demo') {
        markDemoCleared();
      }
      refreshStatus();
    };

    // Listen for permanent demo data clearance from service
    const handleDemoDataPermanentlyCleared = () => {
      setIsDemoCleared(true);
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
    dataModeManager.on('demoDataPermanentlyCleared', handleDemoDataPermanentlyCleared);
    dataModeManager.on('dataSeeded', handleDataSeeded);

    return () => {
      dataModeManager.off('modeChanged', handleModeChanged);
      dataModeManager.off('error', handleError);
      dataModeManager.off('transitionStarted', handleTransitionStarted);
      dataModeManager.off('transitionCompleted', handleTransitionCompleted);
      dataModeManager.off('dataCleared', handleDataCleared);
      dataModeManager.off('demoDataPermanentlyCleared', handleDemoDataPermanentlyCleared);
      dataModeManager.off('dataSeeded', handleDataSeeded);
    };
  }, [dataModeManager, refreshStatus, markDemoCleared]);

  return {
    status,
    isLoading,
    error,
    switchMode,
    clearData,
    seedData,
    refreshStatus,
    resetError,
    isDemoCleared,
    markDemoCleared,
    isDemoReseedingDisabled: isDemoCleared,
  };
}

export default useDataMode;
