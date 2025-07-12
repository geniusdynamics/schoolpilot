import { useAppData } from '../../../contexts/AppDataContext';

export const useDormitoryData = () => {
  const { dormitorys, addDormitory, updateDormitory, deleteDormitory } = useAppData();
  
  return {
    data: dormitorys,
    create: addDormitory,
    update: updateDormitory,
    remove: deleteDormitory
  };
};
