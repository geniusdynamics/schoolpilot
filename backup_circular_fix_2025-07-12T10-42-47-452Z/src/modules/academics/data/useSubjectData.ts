import { useAppData } from '../../../contexts/AppDataContext';

export const useSubjectData = () => {
  const { subjects, addSubject, updateSubject, deleteSubject } = useAppData();
  
  return {
    data: subjects,
    create: addSubject,
    update: updateSubject,
    remove: deleteSubject
  };
};
