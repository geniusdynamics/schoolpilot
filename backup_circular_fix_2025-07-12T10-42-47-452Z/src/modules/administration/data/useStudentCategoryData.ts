import { useAppData } from '../../../contexts/AppDataContext';

export const useStudentCategoryData = () => {
  const { studentcategorys, addStudentCategory, updateStudentCategory, deleteStudentCategory } = useAppData();
  
  return {
    data: studentcategorys,
    create: addStudentCategory,
    update: updateStudentCategory,
    remove: deleteStudentCategory
  };
};
