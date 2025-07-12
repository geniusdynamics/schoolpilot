import { useAppData } from '../../../contexts/AppDataContext';

export const useStudentInvoiceData = () => {
  const { studentinvoices, addStudentInvoice, updateStudentInvoice, deleteStudentInvoice } = useAppData();
  
  return {
    data: studentinvoices,
    create: addStudentInvoice,
    update: updateStudentInvoice,
    remove: deleteStudentInvoice
  };
};
