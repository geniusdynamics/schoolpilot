import { useAppData } from '@/hooks/useAppData';
import { useInventoryDataContext } from '../data/InventoryDataProvider';

export const useInventory = () => {
  const appData = useAppData();
  const ctx = useInventoryDataContext();
  return {
    warehouses: appData.warehouses,
    items: appData.items,
    stockTransactions: appData.stockTransactions,
    requisitions: appData.requisitions,
    purchaseOrders: appData.purchaseOrders,
    loading: appData.loading,
    addWarehouse: ctx.addWarehouse,
    updateWarehouse: ctx.updateWarehouse,
    deleteWarehouse: ctx.deleteWarehouse,
    addItem: ctx.addItem,
    updateItem: ctx.updateItem,
    deleteItem: ctx.deleteItem,
    addStockTransaction: ctx.addStockTransaction,
    updateStockTransaction: ctx.updateStockTransaction,
    deleteStockTransaction: ctx.deleteStockTransaction,
  };
};
export default useInventory;
