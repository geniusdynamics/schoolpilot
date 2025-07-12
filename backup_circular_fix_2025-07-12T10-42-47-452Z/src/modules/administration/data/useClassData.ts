import { useAppData } from '../../../contexts/AppDataContext';

export const useClassData = () => {
  const { classs, addClass, updateClass, deleteClass } = useAppData();
  
  return {
    data: classs,
    create: addClass,
    update: updateClass,
    remove: deleteClass
  };
};
