import { useAppData } from '../../../contexts/AppDataContext';

export const useStudentMealPlanData = () => {
  const { studentmealplans, addStudentMealPlan, updateStudentMealPlan, deleteStudentMealPlan } = useAppData();
  
  return {
    data: studentmealplans,
    create: addStudentMealPlan,
    update: updateStudentMealPlan,
    remove: deleteStudentMealPlan
  };
};
