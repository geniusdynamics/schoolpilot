// ABOUTME: Inventory Module Collection Configuration
import type { ModuleCollectionsConfig } from '@/core/types/moduleCollections';

export const inventoryModuleCollections: ModuleCollectionsConfig = {
  moduleName: 'inventory',
  aliases: {
    warehouses: 'warehouses',
    item_categories_inv: 'itemCategoriesInv',
    items_inv: 'itemsInv',
    fixed_assets: 'fixedAssets',
    requisitions: 'requisitions',
    purchase_orders: 'purchaseOrders',
    stock_levels: 'stockLevels',
    stock_transactions: 'stockTransactions',
    rfqs: 'rfqs',

    // Report / View collections
    stationery_items: 'stationeryItems',
  },
};

export default inventoryModuleCollections;
