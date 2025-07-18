// ABOUTME: Standardized hook for mealplan data management
// ABOUTME: Provides CRUD operations for mealplans with AppDataContext integration
// ABOUTME: Uses the data hook factory for consistent interface and behavior

import { initialMockMealPlans } from './mockData';
import { MealPlan } from '../../../core/types';
import { createDataHook, DataHookConfig } from '../../../hooks/useDataHookFactory';
import { useDataHookRegistration } from '../../../hooks/useDataHookRegistration';

// Configuration for the data hook
export const useMealPlanDataConfig: DataHookConfig<MealPlan> = {
  entityName: 'mealPlans',
  initialData: initialMockMealPlans,
  entityModule: 'nutrition',
  requiresBackend: false,
  allowOffline: true,
  syncPriority: 'medium'
};

// Create the standardized data hook using the factory
export const useMealPlanData = () => {
  // Register the hook with the global context
  useDataHookRegistration(useMealPlanDataConfig);
  
  // Return the hook implementation
  return createDataHook<MealPlan>(useMealPlanDataConfig)();
};
