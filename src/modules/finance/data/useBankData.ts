// ABOUTME: Standardized hook for bank data management
// ABOUTME: Provides CRUD operations for banks with AppDataContext integration
// ABOUTME: Uses the data hook factory for consistent interface and behavior

import { useMemo } from 'react';
import { initialMockBanks } from './mockData';
import { Bank } from '../../../core/types';
import { createDataHook, DataHookConfig } from '../../../hooks/useDataHookFactory';
import { useDataHookRegistration } from '../../../hooks/useDataHookRegistration';

// Create the standardized data hook using the factory
export const useBankData = () => {
  // Memoize the configuration to prevent infinite re-renders
  const config = useMemo((): DataHookConfig<Bank> => ({
    entityName: 'banks',
    initialData: initialMockBanks,
    entityModule: 'finance',
    requiresBackend: false,
    allowOffline: true,
    syncPriority: 'medium'
  }), []);

  // Register the hook with the global context
  useDataHookRegistration(config);
  
  // Return the hook implementation
  return createDataHook<Bank>(config)();
};
