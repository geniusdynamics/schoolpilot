// ABOUTME: Nutrition Module Collection Configuration
import type { ModuleCollectionsConfig } from '@/core/types/moduleCollections';

export const nutritionModuleCollections: ModuleCollectionsConfig = {
  moduleName: 'nutrition',
  aliases: {
    meal_plans: 'mealPlans',
    meal_plan_items: 'mealPlanItems',
    nutrition_wallets: 'nutritionWallets',
    menus: 'menus',
    merchants: 'merchants',
  },
};

export default nutritionModuleCollections;
