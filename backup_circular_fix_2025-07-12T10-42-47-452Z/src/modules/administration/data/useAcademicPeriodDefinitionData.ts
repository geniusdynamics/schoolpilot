import { useAppData } from '../../../contexts/AppDataContext';

export const useAcademicPeriodDefinitionData = () => {
  const { academicperioddefinitions, addAcademicPeriodDefinition, updateAcademicPeriodDefinition, deleteAcademicPeriodDefinition } = useAppData();
  
  return {
    data: academicperioddefinitions,
    create: addAcademicPeriodDefinition,
    update: updateAcademicPeriodDefinition,
    remove: deleteAcademicPeriodDefinition
  };
};
