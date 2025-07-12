import { useAppData } from '../../../contexts/AppDataContext';

export const useAcademicYearStructureData = () => {
  const { academicyearstructures, addAcademicYearStructure, updateAcademicYearStructure, deleteAcademicYearStructure } = useAppData();
  
  return {
    data: academicyearstructures,
    create: addAcademicYearStructure,
    update: updateAcademicYearStructure,
    remove: deleteAcademicYearStructure
  };
};
