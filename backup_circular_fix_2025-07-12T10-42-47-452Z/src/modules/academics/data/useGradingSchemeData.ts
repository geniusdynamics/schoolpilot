import { useAppData } from '../../../contexts/AppDataContext';

export const useGradingSchemeData = () => {
  const { gradingschemes, addGradingScheme, updateGradingScheme, deleteGradingScheme } = useAppData();
  
  return {
    data: gradingschemes,
    create: addGradingScheme,
    update: updateGradingScheme,
    remove: deleteGradingScheme
  };
};
