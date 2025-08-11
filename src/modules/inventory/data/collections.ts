// ABOUTME: Defines the RxDB collection configurations for the Inventory module.
// ABOUTME: This structure is imported by the central rxdbService to add module-specific collections.

import * as schemas from './schema';

export const inventoryCollections = {
  warehouses: {
    schema: schemas.warehouseSchema,
  },
  item_categories_inv: { // Note: collection name matches type suffix for clarity
    schema: schemas.itemCategoryInvSchema,
  },
  items_inv: { // Note: collection name matches type suffix
    schema: schemas.itemInvSchema,
  },
  fixed_assets: {
    schema: schemas.fixedAssetSchema,
  },
  asset_depreciation_logs: {
    schema: schemas.assetDepreciationLogSchema,
  },
  stock_levels: {
    schema: schemas.stockLevelSchema,
  },
  stock_transactions: {
    schema: schemas.stockTransactionSchema,
  },
  requisitions: {
    schema: schemas.requisitionSchema,
  },
  // Note: requisition_items are nested within requisitions
  purchase_orders: {
    schema: schemas.purchaseOrderSchema,
  },
  // Note: purchase_order_items are nested within purchase_orders
  rfqs: {
    schema: schemas.rfqSchema,
  },
  suppliers: {
    schema: schemas.supplierSchema,
  },
  supplier_contracts: {
    schema: schemas.supplierContractSchema,
  },
  stock_alerts: {
    schema: schemas.stockAlertSchema,
  },
};

// Type helper for consumers of this module's collections (optional)
export type InventoryCollections = typeof inventoryCollections;
