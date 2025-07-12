import { useAppData } from '../../../contexts/AppDataContext';

export const useDesignationData = () => {
  const { designations, addDesignation, updateDesignation, deleteDesignation } = useAppData();
  
  return {
    data: designations,
    create: addDesignation,
    update: updateDesignation,
    remove: deleteDesignation
  };
};
