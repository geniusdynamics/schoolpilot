// ABOUTME: Serves as the main CSL entry point for the Nutrition & Wallet module's data definitions.
// ABOUTME: It re-exports types, mock data, schemas, and collection configurations.

export * from './types';
export * from './mockData';
export * from './schema';
export * from './collections';

export { isGlobalProvider as isMealPlanGlobalProvider, useMealPlanData } from './useMealPlanData';
export { isGlobalProvider as isStudentMealPlanGlobalProvider, useStudentMealPlanData } from './useStudentMealPlanData';
export { isGlobalProvider as isMenuGlobalProvider, useMenuData } from './useMenuData';
export { isGlobalProvider as isMealConsumptionLogGlobalProvider, useMealConsumptionLogData } from './useMealConsumptionLogData';
export { isGlobalProvider as isMerchantGlobalProvider, useMerchantData } from './useMerchantData';
export { isGlobalProvider as isStudentWalletGlobalProvider, useStudentWalletData } from './useStudentWalletData';
export { isGlobalProvider as isWalletTransactionGlobalProvider, useWalletTransactionData } from './useWalletTransactionData';
