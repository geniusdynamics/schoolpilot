import { useAppData } from '../../../contexts/AppDataContext';

export const useGradingSchemeLevelData = () => {
  const { gradingschemelevels, addGradingSchemeLevel, updateGradingSchemeLevel, deleteGradingSchemeLevel } = useAppData();
  
  return {
    data: gradingschemelevels,
    create: addGradingSchemeLevel,
    update: updateGradingSchemeLevel,
    remove: deleteGradingSchemeLevel
  };
};
