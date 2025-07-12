import { useAppData } from '../../../contexts/AppDataContext';

export const useClubAndSocietyData = () => {
  const { clubandsocietys, addClubAndSociety, updateClubAndSociety, deleteClubAndSociety } = useAppData();
  
  return {
    data: clubandsocietys,
    create: addClubAndSociety,
    update: updateClubAndSociety,
    remove: deleteClubAndSociety
  };
};
