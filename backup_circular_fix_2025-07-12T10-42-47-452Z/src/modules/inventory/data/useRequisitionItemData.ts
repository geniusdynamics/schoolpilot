import { useAppData } from '../../../contexts/AppDataContext';

export const useRequisitionItemData = () => {
  const { requisitionitems, addRequisitionItem, updateRequisitionItem, deleteRequisitionItem } = useAppData();
  
  return {
    data: requisitionitems,
    create: addRequisitionItem,
    update: updateRequisitionItem,
    remove: deleteRequisitionItem
  };
};
