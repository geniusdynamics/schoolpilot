import { useAppData } from '../../../contexts/AppDataContext';

export const useRequisitionData = () => {
  const { requisitions, addRequisition, updateRequisition, deleteRequisition } = useAppData();
  
  return {
    data: requisitions,
    create: addRequisition,
    update: updateRequisition,
    remove: deleteRequisition
  };
};
