import { useAppData } from '../../../contexts/AppDataContext';

export const useStudentOpeningBalanceData = () => {
  const { studentopeningbalances, addStudentOpeningBalance, updateStudentOpeningBalance, deleteStudentOpeningBalance } = useAppData();
  
  return {
    data: studentopeningbalances,
    create: addStudentOpeningBalance,
    update: updateStudentOpeningBalance,
    remove: deleteStudentOpeningBalance
  };
};
