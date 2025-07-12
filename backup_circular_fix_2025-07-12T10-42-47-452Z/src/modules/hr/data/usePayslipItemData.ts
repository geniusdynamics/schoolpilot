import { useAppData } from '../../../contexts/AppDataContext';

export const usePayslipItemData = () => {
  const { payslipitems, addPayslipItem, updatePayslipItem, deletePayslipItem } = useAppData();
  
  return {
    data: payslipitems,
    create: addPayslipItem,
    update: updatePayslipItem,
    remove: deletePayslipItem
  };
};
