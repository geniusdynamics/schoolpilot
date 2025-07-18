// ABOUTME: Standardized hook for academic year data management
// ABOUTME: Provides CRUD operations for academic years with AppDataContext integration
// ABOUTME: Uses the data hook factory for consistent interface and behavior

import { initialMockAcademicYears } from '../../administration/data/mockData';
import { AcademicYear } from '../../../core/types';
import { createDataHook, DataHookConfig } from '../../../hooks/useDataHookFactory';
import { useDataHookRegistration } from '../../../hooks/useDataHookRegistration';

// Configuration for the data hook
export const useAcademicYearDataConfig: DataHookConfig<AcademicYear> = {
  entityName: 'academicYears',
  initialData: initialMockAcademicYears,
  entityModule: 'academics',
  requiresBackend: false,
  allowOffline: true,
  syncPriority: 'normal'
};

// Create the standardized data hook using the factory
export const useAcademicYearData = () => {
  // Register the hook with the global context
  useDataHookRegistration(useAcademicYearDataConfig);

  // Return the hook implementation
  return createDataHook<AcademicYear>(useAcademicYearDataConfig)();
};
