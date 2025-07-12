import { useAppData } from '../../../contexts/AppDataContext';

export const useFinancialYearData = () => {
  const { financialyears, addFinancialYear, updateFinancialYear, deleteFinancialYear } = useAppData();
  
  return {
    data: financialyears,
    create: addFinancialYear,
    update: updateFinancialYear,
    remove: deleteFinancialYear
  };
};
