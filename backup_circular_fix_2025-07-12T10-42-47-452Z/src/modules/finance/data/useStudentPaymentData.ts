import { useAppData } from '../../../contexts/AppDataContext';

export const useStudentPaymentData = () => {
  const { studentpayments, addStudentPayment, updateStudentPayment, deleteStudentPayment } = useAppData();
  
  return {
    data: studentpayments,
    create: addStudentPayment,
    update: updateStudentPayment,
    remove: deleteStudentPayment
  };
};
