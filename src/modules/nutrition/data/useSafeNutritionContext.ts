// ABOUTME: Safe context hook for nutrition module - returns empty data when module is disabled
import { useNutritionDataContext } from './NutritionDataContext';
import { moduleRegistry } from '@/core/moduleRegistry';

export const useSafeNutritionContext = () => {
  const isEnabled = moduleRegistry.isEnabled('nutrition');

  if (!isEnabled) {
    return {
      mealPlans: [],
      menus: [],
      studentMealPlans: [],
      mealConsumptionLogs: [],
      walletTransactions: [],
      studentWallets: [],
      merchants: [],
      isModuleEnabled: false,
    };
  }

  return { ...useNutritionDataContext(), isModuleEnabled: true };
};
