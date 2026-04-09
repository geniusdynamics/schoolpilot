/**
 * Academic Year Data Hook
 * 
 * Provides CRUD operations for academic year management.
 * Uses the data hook factory for consistent interface.
 * 
 * @module academics/data/useAcademicYearData
 */

import { useMemo } from 'react';
import { AcademicYear } from '@/core/types';
import { createDataHook, DataHookConfig } from '@/hooks/useDataHookFactory';
import { useDataHookRegistration } from '@/hooks/useDataHookRegistration';

// Local initial data for academic years
// TODO: This should ideally come from database or shared store
const initialAcademicYears: AcademicYear[] = [];

// Create the standardized data hook using the factory
export const useAcademicYearData = () => {
  // Memoize the configuration to prevent infinite re-renders
  const config = useMemo((): DataHookConfig<AcademicYear> => ({
    entityName: 'academicYears',
    initialData: initialAcademicYears,
    entityModule: 'academics',
    requiresBackend: false,
    allowOffline: true,
    syncPriority: 'normal'
  }), []);

  // Register the hook with the global context
  useDataHookRegistration(config);

  // Return the hook implementation
  return createDataHook<AcademicYear>(config)();
};
