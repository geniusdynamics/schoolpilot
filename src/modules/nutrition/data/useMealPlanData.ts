// ABOUTME: Standardized hook for mealplan data management
// ABOUTME: Provides CRUD operations for mealplans with AppDataContext integration
// ABOUTME: Uses the data hook factory for consistent interface and behavior

import { useMemo } from 'react';
import { initialMockMealPlans } from './mockData';
import { MealPlan } from '../../../core/types';
import { createDataHook, DataHookConfig } from '../../../hooks/useDataHookFactory';
import { useDataHookRegistration } from '../../../hooks/useDataHookRegistration';

// Create the standardized data hook using the factory
export const useMealPlanData = () => {
  // Memoize the configuration to prevent infinite re-renders
  const config = useMemo((): DataHookConfig<MealPlan> => ({
    entityName: 'mealPlans',
    initialData: initialMockMealPlans,
    entityModule: 'nutrition',
    requiresBackend: false,
    allowOffline: true,
    syncPriority: 'medium'
  }), []);

  // Register the hook with the global context
  useDataHookRegistration(config);
  
  // Return the hook implementation
  return createDataHook<MealPlan>(config)();
};
