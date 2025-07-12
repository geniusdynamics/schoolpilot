import { useAppData } from '../../../contexts/AppDataContext';

export const useStudentExamResultData = () => {
  const { studentexamresults, addStudentExamResult, updateStudentExamResult, deleteStudentExamResult } = useAppData();
  
  return {
    data: studentexamresults,
    create: addStudentExamResult,
    update: updateStudentExamResult,
    remove: deleteStudentExamResult
  };
};
