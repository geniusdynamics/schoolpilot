// ABOUTME: Provides initial mock data for entities specific to the Inventory module.
// ABOUTME: This data is used in "demo" mode and for seeding RxDB in "production" mode.

import { InvItemTypeEnum, InvRequisitionStatusEnum, InvPurchaseOrderStatusEnum, InvStockTransactionType, InvDepreciationMethod, InvRFQStatusEnum, InvWarehouseType, InvItemCategoryType, InvItemType, InvFixedAssetType, InvAssetDepreciationLogType, InvStockLevelType, InvRequisitionItemType, InvRequisitionType, InvPurchaseOrderItemType, InvPurchaseOrderType, InvRFQType } from './types';
import { generateId, generateNumericId } from '../../../hooks/useMockData'; // Assuming helpers are exported

export const initialMockWarehouses: types.Warehouse[] = [
  { id: 1, name: 'Main Store', location: 'Behind Admin Block' },
  { id: 2, name: 'Science Lab Store', location: 'Science Block, Room S03' },
];

export const initialMockItemCategoriesInv: types.ItemCategoryInv[] = [
  { id: 1, name: 'Stationery' },
  { id: 2, name: 'Textbooks' },
  { id: 3, name: 'Lab Equipment' },
  { id: 4, name: 'Furniture' },
  { id: 5, name: 'Cleaning Supplies' },
];

export const initialMockItemsInv: types.ItemInv[] = [
  { id: generateId(), name: 'A4 Ream Paper', category_id: 1, unit_of_measure: 'Ream', item_type: types.ItemTypeInv.CONSUMABLE, current_price: 500, reorder_level: 20, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), category_name: 'Stationery' },
  { id: generateId(), name: 'Blue Bic Pen', category_id: 1, unit_of_measure: 'Box (50pcs)', item_type: types.ItemTypeInv.CONSUMABLE, current_price: 600, reorder_level: 10, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), category_name: 'Stationery' },
  { id: generateId(), name: 'Student Desk', category_id: 4, unit_of_measure: 'Piece', item_type: types.ItemTypeInv.FIXED_ASSET, current_price: 3500, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), category_name: 'Furniture' },
];

export const initialMockFixedAssets: types.FixedAsset[] = [
  { id: generateId(), item_id: initialMockItemsInv[2].id, asset_tag: 'DESK001', purchase_date: '2023-01-15', purchase_cost: 3500, current_value: 3200, depreciation_method: types.DepreciationMethod.STRAIGHT_LINE, item_name: 'Student Desk', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
];

export const initialMockAssetDepreciationLogs: types.AssetDepreciationLog[] = []; // Usually populated by a process

export const initialMockRequisitions: types.Requisition[] = [
  { id: generateId(), requesting_staff_id: 'STF002', request_date: '2024-07-01', status: InvRequisitionStatusEnum.PENDING_APPROVAL, items: [], requesting_staff_name: 'Dwight Schrute', department_name: 'Academics', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
];

export const initialMockPurchaseOrders: types.PurchaseOrder[] = [];

export const initialMockStockLevels: types.StockLevel[] = [
  { compositeId: `${initialMockItemsInv[0].id}-${initialMockWarehouses[0].id}`, item_id: initialMockItemsInv[0].id, warehouse_id: initialMockWarehouses[0].id, quantity: 50, last_updated: new Date().toISOString(), item_name: 'A4 Ream Paper', warehouse_name: 'Main Store', category_name: 'Stationery' },
  { compositeId: `${initialMockItemsInv[1].id}-${initialMockWarehouses[0].id}`, item_id: initialMockItemsInv[1].id, warehouse_id: initialMockWarehouses[0].id, quantity: 25, last_updated: new Date().toISOString(), item_name: 'Blue Bic Pen', warehouse_name: 'Main Store', category_name: 'Stationery' },
];

export const initialMockStockTransactions: types.StockTransaction[] = [];

export const initialMockRfqs: InvRFQType[] = [
    { id: generateId(), title: "RFQ for Bulk Stationery Supply Q3 2024", issue_date: "2024-06-15", closing_date: "2024-07-15", status: InvRFQStatusEnum.OPEN, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
];
