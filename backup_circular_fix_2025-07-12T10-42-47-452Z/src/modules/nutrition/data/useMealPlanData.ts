import { useAppData } from '../../../contexts/AppDataContext';

export const useMealPlanData = () => {
  const { mealplans, addMealPlan, updateMealPlan, deleteMealPlan } = useAppData();
  
  return {
    data: mealplans,
    create: addMealPlan,
    update: updateMealPlan,
    remove: deleteMealPlan
  };
};
