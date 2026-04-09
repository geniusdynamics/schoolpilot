import { useAppData } from '@/hooks/useAppData';
import { useNutritionDataContext } from '../data/NutritionDataProvider';

export const useNutrition = () => {
  const appData = useAppData();
  const ctx = useNutritionDataContext();
  return {
    mealPlans: appData.mealPlans || [],
    mealPlanItems: appData.mealPlanItems || [],
    nutritionWallets: appData.nutritionWallets || [],
    loading: appData.loading,
    addMealPlan: ctx.addMealPlan,
    updateMealPlan: ctx.updateMealPlan,
    deleteMealPlan: ctx.deleteMealPlan,
    addNutritionWallet: ctx.addNutritionWallet,
    updateNutritionWallet: ctx.updateNutritionWallet,
    deleteNutritionWallet: ctx.deleteNutritionWallet,
  };
};
export default useNutrition;
