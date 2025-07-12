import { useAppData } from '../../../contexts/AppDataContext';

export const useGeneralPaymentData = () => {
  const { generalpayments, addGeneralPayment, updateGeneralPayment, deleteGeneralPayment } = useAppData();
  
  return {
    data: generalpayments,
    create: addGeneralPayment,
    update: updateGeneralPayment,
    remove: deleteGeneralPayment
  };
};
