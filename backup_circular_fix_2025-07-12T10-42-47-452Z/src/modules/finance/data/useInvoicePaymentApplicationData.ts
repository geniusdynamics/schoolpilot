import { useAppData } from '../../../contexts/AppDataContext';

export const useInvoicePaymentApplicationData = () => {
  const { invoicepaymentapplications, addInvoicePaymentApplication, updateInvoicePaymentApplication, deleteInvoicePaymentApplication } = useAppData();
  
  return {
    data: invoicepaymentapplications,
    create: addInvoicePaymentApplication,
    update: updateInvoicePaymentApplication,
    remove: deleteInvoicePaymentApplication
  };
};
