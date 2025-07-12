import { useAppData } from '../../../contexts/AppDataContext';

export const usePayrollPeriodData = () => {
  const { payrollperiods, addPayrollPeriod, updatePayrollPeriod, deletePayrollPeriod } = useAppData();
  
  return {
    data: payrollperiods,
    create: addPayrollPeriod,
    update: updatePayrollPeriod,
    remove: deletePayrollPeriod
  };
};
