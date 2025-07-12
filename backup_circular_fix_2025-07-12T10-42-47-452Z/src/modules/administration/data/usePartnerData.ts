import { useAppData } from '../../../contexts/AppDataContext';

export const usePartnerData = () => {
  const { partners, addPartner, updatePartner, deletePartner } = useAppData();
  
  return {
    data: partners,
    create: addPartner,
    update: updatePartner,
    remove: deletePartner
  };
};
