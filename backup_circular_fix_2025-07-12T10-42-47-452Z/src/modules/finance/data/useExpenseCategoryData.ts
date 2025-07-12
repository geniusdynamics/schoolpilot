import { useAppData } from '../../../contexts/AppDataContext';

export const useExpenseCategoryData = () => {
  const { expensecategorys, addExpenseCategory, updateExpenseCategory, deleteExpenseCategory } = useAppData();
  
  return {
    data: expensecategorys,
    create: addExpenseCategory,
    update: updateExpenseCategory,
    remove: deleteExpenseCategory
  };
};
