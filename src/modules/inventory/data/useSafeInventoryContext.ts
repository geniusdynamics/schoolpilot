// ABOUTME: Safe context hook for inventory module - returns empty data when module is disabled
import { useInventoryDataContext } from './InventoryDataContext';
import { moduleRegistry } from '@/core/moduleRegistry';

export const useSafeInventoryContext = () => {
  const isEnabled = moduleRegistry.isEnabled('inventory');

  if (!isEnabled) {
    return {
      warehouses: [],
      itemCategories: [],
      items: [],
      fixedAssets: [],
      assetDepreciationLogs: [],
      stockLevels: [],
      stockTransactions: [],
      requisitionItems: [],
      requisitions: [],
      purchaseOrderItems: [],
      purchaseOrders: [],
      supplierContracts: [],
      rfqs: [],
      isModuleEnabled: false,
    };
  }

  return { ...useInventoryDataContext(), isModuleEnabled: true };
};
