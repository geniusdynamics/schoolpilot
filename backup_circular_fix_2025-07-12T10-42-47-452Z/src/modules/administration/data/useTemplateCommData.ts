import { useAppData } from '../../../contexts/AppDataContext';

export const useTemplateCommData = () => {
  const { templatecomms, addTemplateComm, updateTemplateComm, deleteTemplateComm } = useAppData();
  
  return {
    data: templatecomms,
    create: addTemplateComm,
    update: updateTemplateComm,
    remove: deleteTemplateComm
  };
};
