// ABOUTME: Defines the RxDB collection configurations for the Nutrition & Wallet module.
// ABOUTME: This structure is imported by the central rxdbService to add module-specific collections.

import * as schemas from './schema';

export const nutritionCollections = {
  meal_plans: {
    schema: schemas.mealPlanSchema,
  },
  student_meal_plans: {
    schema: schemas.studentMealPlanSchema,
  },
  menus: {
    schema: schemas.menuSchema,
  },
  meal_consumption_logs: {
    schema: schemas.mealConsumptionLogSchema,
  },
  merchants: {
    schema: schemas.merchantSchema,
  },
  student_wallets: {
    schema: schemas.studentWalletSchema,
  },
  wallet_transactions: {
    schema: schemas.walletTransactionSchema,
  },
};

// Type helper for consumers of this module's collections (optional)
export type NutritionCollections = typeof nutritionCollections;
