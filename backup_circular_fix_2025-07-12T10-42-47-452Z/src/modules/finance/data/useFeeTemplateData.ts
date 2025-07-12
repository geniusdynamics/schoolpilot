import { useAppData } from '../../../contexts/AppDataContext';

export const useFeeTemplateData = () => {
  const { feetemplates, addFeeTemplate, updateFeeTemplate, deleteFeeTemplate } = useAppData();
  
  return {
    data: feetemplates,
    create: addFeeTemplate,
    update: updateFeeTemplate,
    remove: deleteFeeTemplate
  };
};
