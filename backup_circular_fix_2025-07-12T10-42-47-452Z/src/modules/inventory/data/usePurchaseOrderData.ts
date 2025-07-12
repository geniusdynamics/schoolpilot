import { useAppData } from '../../../contexts/AppDataContext';

export const usePurchaseOrderData = () => {
  const { purchaseorders, addPurchaseOrder, updatePurchaseOrder, deletePurchaseOrder } = useAppData();
  
  return {
    data: purchaseorders,
    create: addPurchaseOrder,
    update: updatePurchaseOrder,
    remove: deletePurchaseOrder
  };
};
