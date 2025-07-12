import { useAppData } from '../../../contexts/AppDataContext';

export const useSupplierInvoiceData = () => {
  const { supplierinvoices, addSupplierInvoice, updateSupplierInvoice, deleteSupplierInvoice } = useAppData();
  
  return {
    data: supplierinvoices,
    create: addSupplierInvoice,
    update: updateSupplierInvoice,
    remove: deleteSupplierInvoice
  };
};
