// ABOUTME: Safe context hook for library module - returns empty data when module is disabled
import { useLibraryDataContext } from './LibraryDataContext';
import { moduleRegistry } from '@/core/moduleRegistry';

export const useSafeLibraryContext = () => {
  const isEnabled = moduleRegistry.isEnabled('library');

  if (!isEnabled) {
    return {
      bookCategories: [],
      books: [],
      loans: [],
      fines: [],
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

  return { ...useLibraryDataContext(), isModuleEnabled: true };
};
