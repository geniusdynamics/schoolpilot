import { useAppData } from '../../../contexts/AppDataContext';

export const usePayslipData = () => {
  const { payslips, addPayslip, updatePayslip, deletePayslip } = useAppData();
  
  return {
    data: payslips,
    create: addPayslip,
    update: updatePayslip,
    remove: deletePayslip
  };
};
