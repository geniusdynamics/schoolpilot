import { useAppData } from '../../../contexts/AppDataContext';

export const useMerchantData = () => {
  const { merchants, addMerchant, updateMerchant, deleteMerchant } = useAppData();
  
  return {
    data: merchants,
    create: addMerchant,
    update: updateMerchant,
    remove: deleteMerchant
  };
};
