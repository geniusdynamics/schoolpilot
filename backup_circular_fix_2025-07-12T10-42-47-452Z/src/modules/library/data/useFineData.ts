import { useAppData } from '../../../contexts/AppDataContext';

export const useFineData = () => {
  const { fines, addFine, updateFine, deleteFine } = useAppData();
  
  return {
    data: fines,
    create: addFine,
    update: updateFine,
    remove: deleteFine
  };
};
