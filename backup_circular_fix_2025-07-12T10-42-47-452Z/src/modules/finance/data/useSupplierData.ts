import { useAppData } from '../../../contexts/AppDataContext';

export const useSupplierData = () => {
  const { suppliers, addSupplier, updateSupplier, deleteSupplier } = useAppData();
  
  return {
    data: suppliers,
    create: addSupplier,
    update: updateSupplier,
    remove: deleteSupplier
  };
};
