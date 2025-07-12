import { useAppData } from '../../../contexts/AppDataContext';

export const useSubjectPaperData = () => {
  const { subjectpapers, addSubjectPaper, updateSubjectPaper, deleteSubjectPaper } = useAppData();
  
  return {
    data: subjectpapers,
    create: addSubjectPaper,
    update: updateSubjectPaper,
    remove: deleteSubjectPaper
  };
};
