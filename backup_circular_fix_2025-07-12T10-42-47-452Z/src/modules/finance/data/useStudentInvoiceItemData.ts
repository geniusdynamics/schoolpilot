import { useAppData } from '../../../contexts/AppDataContext';

export const useStudentInvoiceItemData = () => {
  const { studentinvoiceitems, addStudentInvoiceItem, updateStudentInvoiceItem, deleteStudentInvoiceItem } = useAppData();
  
  return {
    data: studentinvoiceitems,
    create: addStudentInvoiceItem,
    update: updateStudentInvoiceItem,
    remove: deleteStudentInvoiceItem
  };
};
