import { useAppData } from '../../../contexts/AppDataContext';

export const useRFQData = () => {
  const { rfqs, addRFQ, updateRFQ, deleteRFQ } = useAppData();
  
  return {
    data: rfqs,
    create: addRFQ,
    update: updateRFQ,
    remove: deleteRFQ
  };
};
