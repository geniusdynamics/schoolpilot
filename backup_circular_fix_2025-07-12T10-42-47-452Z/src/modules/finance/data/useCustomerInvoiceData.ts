import { useAppData } from '../../../contexts/AppDataContext';

export const useCustomerInvoiceData = () => {
  const { customerinvoices, addCustomerInvoice, updateCustomerInvoice, deleteCustomerInvoice } = useAppData();
  
  return {
    data: customerinvoices,
    create: addCustomerInvoice,
    update: updateCustomerInvoice,
    remove: deleteCustomerInvoice
  };
};
