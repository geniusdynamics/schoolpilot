import { useAppData } from '../../../contexts/AppDataContext';

export const useAcademicYearData = () => {
  const { academicyears, addAcademicYear, updateAcademicYear, deleteAcademicYear } = useAppData();
  
  return {
    data: academicyears,
    create: addAcademicYear,
    update: updateAcademicYear,
    remove: deleteAcademicYear
  };
};
