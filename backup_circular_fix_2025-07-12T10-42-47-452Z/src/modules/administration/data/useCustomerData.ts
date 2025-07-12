import { useAppData } from '../../../contexts/AppDataContext';

export const useCustomerData = () => {
  const { customers, addCustomer, updateCustomer, deleteCustomer } = useAppData();
  
  return {
    data: customers,
    create: addCustomer,
    update: updateCustomer,
    remove: deleteCustomer
  };
};
