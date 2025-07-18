// ABOUTME: Standardized hook for bank data management
// ABOUTME: Provides CRUD operations for banks with AppDataContext integration
// ABOUTME: Uses the data hook factory for consistent interface and behavior

import { initialMockBanks } from './mockData';
import { Bank } from '../../../core/types';
import { createDataHook, DataHookConfig } from '../../../hooks/useDataHookFactory';
import { useDataHookRegistration } from '../../../hooks/useDataHookRegistration';

// Configuration for the data hook
export const useBankDataConfig: DataHookConfig<Bank> = {
  entityName: 'banks',
  initialData: initialMockBanks,
  entityModule: 'finance',
  requiresBackend: false,
  allowOffline: true,
  syncPriority: 'medium'
};

// Create the standardized data hook using the factory
export const useBankData = () => {
  // Register the hook with the global context
  useDataHookRegistration(useBankDataConfig);
  
  // Return the hook implementation
  return createDataHook<Bank>(useBankDataConfig)();
};
