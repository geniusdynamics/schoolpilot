import { useAppData } from '../../../contexts/AppDataContext';

export const useLoanData = () => {
  const { loans, addLoan, updateLoan, deleteLoan } = useAppData();
  
  return {
    data: loans,
    create: addLoan,
    update: updateLoan,
    remove: deleteLoan
  };
};
