import { useAppData } from '../../../contexts/AppDataContext';

export const useStudentPaperMarkData = () => {
  const { studentpapermarks, addStudentPaperMark, updateStudentPaperMark, deleteStudentPaperMark } = useAppData();
  
  return {
    data: studentpapermarks,
    create: addStudentPaperMark,
    update: updateStudentPaperMark,
    remove: deleteStudentPaperMark
  };
};
