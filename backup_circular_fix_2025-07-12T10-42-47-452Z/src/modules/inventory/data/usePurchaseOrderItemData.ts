import { useAppData } from '../../../contexts/AppDataContext';

export const usePurchaseOrderItemData = () => {
  const { purchaseorderitems, addPurchaseOrderItem, updatePurchaseOrderItem, deletePurchaseOrderItem } = useAppData();
  
  return {
    data: purchaseorderitems,
    create: addPurchaseOrderItem,
    update: updatePurchaseOrderItem,
    remove: deletePurchaseOrderItem
  };
};
