import { useAppData } from '../../../contexts/AppDataContext';

export const usePayrollItemTypeData = () => {
  const { payrollitemtypes, addPayrollItemType, updatePayrollItemType, deletePayrollItemType } = useAppData();
  
  return {
    data: payrollitemtypes,
    create: addPayrollItemType,
    update: updatePayrollItemType,
    remove: deletePayrollItemType
  };
};
