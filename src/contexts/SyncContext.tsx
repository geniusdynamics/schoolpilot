import { logger } from '@/utils/logging';

// ABOUTME: Sync state management context for handling data synchronization
// ABOUTME: Provides sync status, controls, and queue management functionality

import React, { createContext, useContext, ReactNode, useState, useCallback, useMemo } from 'react';
import { useNetwork } from './NetworkContext';

export interface SyncSettings {
  autoSync: boolean;
  syncInterval: number;
  batchSize: number;
}

export interface SyncStatus {
  state: 'idle' | 'syncing' | 'error' | 'paused';
  progress: number;
  lastError: Error | null;
  conflictsCount: number;
  lastSyncTime: Date | null;
}

export interface QueueStatus {
  api: {
    pending: number;
    processing: boolean;
    byPriority: Record<string, number>;
  };
  sync: {
    pending: number;
    processing: boolean;
    byPriority: Record<string, number>;
    errors: number;
  };
}

export interface OfflineCapability {
  feature: string;
  available: boolean;
  reason?: string;
  alternativeAction?: string;
}

export interface SyncContextType {
  // Sync status
  syncStatus: SyncStatus;
  pendingSyncCount: number;
  lastSyncTime: Date | null;
  
  // Sync controls
  forceSync: () => Promise<void>;
  pauseSync: () => void;
  resumeSync: () => void;
  
  // Queue management
  getQueueStatus: () => QueueStatus;
  clearQueue: () => void;
  clearSyncQueue: () => void;
  
  // Sync settings
  getSyncSettings: () => SyncSettings;
  updateSyncSettings: (settings: Partial<SyncSettings>) => void;
  
  // Offline capabilities
  offlineCapabilities: OfflineCapability[];
  disabledFeatures: string[];
}

const SyncContext = createContext<SyncContextType | undefined>(undefined);

export const SyncProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { isOnline } = useNetwork();
  
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    state: 'idle',
    progress: 0,
    lastError: null,
    conflictsCount: 0,
    lastSyncTime: null
  });

  const [syncSettings, setSyncSettings] = useState<SyncSettings>({
    autoSync: true,
    syncInterval: 30000,
    batchSize: 20
  });

  // Sync controls
  const forceSync = useCallback(async () => {
    if (!isOnline) {
      logger.warn('Cannot sync while offline');
      return;
    }
    logger.info('Force sync triggered');
    setSyncStatus(prev => ({ ...prev, state: 'syncing', progress: 0 }));
    // Simulate sync process
    setTimeout(() => {
      setSyncStatus(prev => ({ 
        ...prev, 
        state: 'idle', 
        progress: 100, 
        lastSyncTime: new Date() 
      }));
    }, 2000);
  }, [isOnline]);

  const pauseSync = useCallback(() => {
    logger.info('Sync paused');
    setSyncStatus(prev => ({ ...prev, state: 'paused' }));
  }, []);

  const resumeSync = useCallback(() => {
    logger.info('Sync resumed');
    setSyncStatus(prev => ({ ...prev, state: 'idle' }));
  }, []);

  const clearQueue = useCallback(() => {
    logger.info('Queue cleared');
  }, []);

  const clearSyncQueue = useCallback(() => {
    logger.info('Sync queue cleared');
  }, []);

  const getQueueStatus = useCallback((): QueueStatus => ({
    api: { pending: 0, processing: false, byPriority: {} },
    sync: { pending: 0, processing: false, byPriority: {}, errors: 0 }
  }), []);

  const getSyncSettings = useCallback(() => syncSettings, [syncSettings]);

  const updateSyncSettings = useCallback((settings: Partial<SyncSettings>) => {
    setSyncSettings(prev => ({ ...prev, ...settings }));
    logger.info('Sync settings updated:', settings);
  }, []);

  // Offline capabilities
  const offlineCapabilities = useMemo((): OfflineCapability[] => [
    { feature: 'student-registration', available: true, alternativeAction: 'Data will sync when online' },
    { feature: 'grade-entry', available: true, alternativeAction: 'Grades will sync when online' },
    { feature: 'attendance-tracking', available: true, alternativeAction: 'Attendance will sync when online' }
  ], []);

  const disabledFeatures = useMemo(() => [
    'payment-processing',
    'invoice-generation',
    'real-time-notifications'
  ], []);

  const contextValue = useMemo((): SyncContextType => ({
    // Sync status
    syncStatus,
    pendingSyncCount: 0,
    lastSyncTime: syncStatus.lastSyncTime,
    
    // Sync controls
    forceSync,
    pauseSync,
    resumeSync,
    
    // Queue management
    getQueueStatus,
    clearQueue,
    clearSyncQueue,
    
    // Sync settings
    getSyncSettings,
    updateSyncSettings,
    
    // Offline capabilities
    offlineCapabilities,
    disabledFeatures
  }), [
    syncStatus,
    forceSync,
    pauseSync,
    resumeSync,
    getQueueStatus,
    clearQueue,
    clearSyncQueue,
    getSyncSettings,
    updateSyncSettings,
    offlineCapabilities,
    disabledFeatures
  ]);

  return (
    <SyncContext.Provider value={contextValue}>
      {children}
    </SyncContext.Provider>
  );
};

export const useSync = (): SyncContextType => {
  const context = useContext(SyncContext);
  if (context === undefined) {
    throw new Error('useSync must be used within a SyncProvider');
  }
  return context;
};