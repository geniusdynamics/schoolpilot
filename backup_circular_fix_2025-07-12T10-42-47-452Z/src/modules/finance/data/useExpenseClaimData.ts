import { useAppData } from '../../../contexts/AppDataContext';

export const useExpenseClaimData = () => {
  const { expenseclaims, addExpenseClaim, updateExpenseClaim, deleteExpenseClaim } = useAppData();
  
  return {
    data: expenseclaims,
    create: addExpenseClaim,
    update: updateExpenseClaim,
    remove: deleteExpenseClaim
  };
};
