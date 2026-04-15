// ABOUTME: Main hook for Inventory module pages
// ABOUTME: Uses useInventoryData() for database-backed data and CRUD
// ABOUTME: This is the ONLY hook Inventory pages should use

import { useInventoryData } from '../data/useInventoryData';

export const useInventory = () => {
  const invData = useInventoryData();

  return {
    // Data - map itemsInv to items for backward compatibility
    warehouses: invData.warehouses,
    items: invData.itemsInv,
    itemCategories: invData.itemCategoriesInv,
    fixedAssets: invData.fixedAssets,
    stockTransactions: invData.stockTransactions,
    stockLevels: invData.stockLevels,
    requisitions: invData.requisitions,
    purchaseOrders: invData.purchaseOrders,
    rfqs: invData.rfqs,
    loading: false,

    // Warehouse CRUD
    addWarehouse: invData.addWarehouse,
    updateWarehouse: invData.updateWarehouse,
    deleteWarehouse: invData.deleteWarehouse,

    // Item CRUD - map addItemInv to addItem for backward compatibility
    addItem: invData.addItemInv,
    updateItem: invData.updateItemInv,
    deleteItem: invData.deleteItemInv,

    // Item Category CRUD
    addItemCategory: invData.addItemCategoryInv,
    updateItemCategory: invData.updateItemCategoryInv,
    deleteItemCategory: invData.deleteItemCategoryInv,

    // Fixed Asset CRUD
    addFixedAsset: invData.addFixedAsset,
    updateFixedAsset: invData.updateFixedAsset,
    deleteFixedAsset: invData.deleteFixedAsset,

    // Requisition CRUD
    addRequisition: invData.addRequisition,
    updateRequisition: invData.updateRequisition,
    deleteRequisition: invData.deleteRequisition,

    // Purchase Order CRUD
    addPurchaseOrder: invData.addPurchaseOrder,
    updatePurchaseOrder: invData.updatePurchaseOrder,
    deletePurchaseOrder: invData.deletePurchaseOrder,

    // Stock Transaction CRUD
    addStockTransaction: invData.addStockTransaction,

    // RFQ CRUD
    addRfq: invData.addRfq,
    updateRfq: invData.updateRfq,
    deleteRfq: invData.deleteRfq,
  };
};

export default useInventory;