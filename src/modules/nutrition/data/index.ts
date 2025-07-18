// ABOUTME: Exports all data hooks and types for the nutrition module
// ABOUTME: Registers data hooks with the global context
// ABOUTME: Provides consistent data access patterns

import { useMealConsumptionLogData } from './useMealConsumptionLogData';
import { useMealPlanData } from './useMealPlanData';
import { useMenuData } from './useMenuData';
import { useMerchantData } from './useMerchantData';
import { useStudentMealPlanData } from './useStudentMealPlanData';
import { useStudentWalletData } from './useStudentWalletData';
import { useWalletTransactionData } from './useWalletTransactionData';

// Export all data hooks
export {
  useMealConsumptionLogData,
  useMealPlanData,
  useMenuData,
  useMerchantData,
  useStudentMealPlanData,
  useStudentWalletData,
  useWalletTransactionData
};

// Export data hook configurations for registration
export { useMealPlanDataConfig } from './useMealPlanData';

// Export types
export * from './types';