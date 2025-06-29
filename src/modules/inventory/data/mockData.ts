// ABOUTME: Provides initial mock data for entities specific to the Inventory module.
// ABOUTME: This data is used in "demo" mode and for seeding RxDB in "production" mode.

import {
    Warehouse,
    ItemCategoryInv,
    ItemInv,
    FixedAsset,
    AssetDepreciationLog,
    StockLevel,
    StockTransaction,
    Requisition,
    RequisitionItem,
    PurchaseOrder,
    PurchaseOrderItem,
    ItemTypeInv,
    DepreciationMethod,
    StockTransactionType,
    RequisitionStatus,
    PurchaseOrderStatus
} from '../../../core/types';

export const initialMockWarehouses: Warehouse[] = [
  { id: 1, name: 'Main Store' },
  { id: 2, name: 'Science Lab Store' },
  { id: 3, name: 'Kitchen Store' },
];

export const initialMockItemCategoriesInv: ItemCategoryInv[] = [
  { id: 1, name: 'Stationery' },
  { id: 2, name: 'Textbooks' },
  { id: 3, name: 'Lab Equipment' },
  { id: 4, name: 'Furniture' },
  { id: 5, name: 'Cleaning Supplies' },
  { id: 6, name: 'Foodstuff' },
];

export const initialMockItemsInv: ItemInv[] = [
  { id: 'INV001', name: 'A4 Ream Paper', category_id: 1, unit_of_measure: 'Ream', item_type: ItemTypeInv.CONSUMABLE, current_price: 500, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), category_name: 'Stationery' },
  { id: 'INV002', name: 'Blue Bic Pen', category_id: 1, unit_of_measure: 'Box (50pcs)', item_type: ItemTypeInv.CONSUMABLE, current_price: 600, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), category_name: 'Stationery' },
  { id: 'INV003', name: 'Student Desk', category_id: 4, unit_of_measure: 'Piece', item_type: ItemTypeInv.FIXED_ASSET, current_price: 3500, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), category_name: 'Furniture' },
  { id: 'INV004', name: 'Lab Stool', category_id: 4, unit_of_measure: 'Piece', item_type: ItemTypeInv.FIXED_ASSET, current_price: 1500, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), category_name: 'Furniture' },
  { id: 'INV005', name: 'Maize Flour', category_id: 6, unit_of_measure: '90kg Bag', item_type: ItemTypeInv.CONSUMABLE, current_price: 5000, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), category_name: 'Foodstuff' },
];

export const initialMockFixedAssets: FixedAsset[] = [
  { id: 'FA001', item_id: 'INV003', asset_tag: 'DESK001', purchase_date: '2023-01-15', purchase_cost: 3500, current_value: 3200, depreciation_method: DepreciationMethod.STRAIGHT_LINE, depreciation_rate_pa: 10, item_name: 'Student Desk', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'FA002', item_id: 'INV004', asset_tag: 'STOOL001', purchase_date: '2023-01-15', purchase_cost: 1500, current_value: 1350, depreciation_method: DepreciationMethod.STRAIGHT_LINE, depreciation_rate_pa: 10, item_name: 'Lab Stool', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
];

export const initialMockAssetDepreciationLogs: AssetDepreciationLog[] = [
    { id: 'ADL001', asset_id: 'FA001', depreciation_date: '2023-12-31', amount_depreciated: 350, book_value_after: 3150 }
];

export const initialMockStockLevels: StockLevel[] = [
  { compositeId: 'INV001-1', item_id: 'INV001', warehouse_id: 1, quantity: 50, item_name: 'A4 Ream Paper', warehouse_name: 'Main Store', category_name: 'Stationery' },
  { compositeId: 'INV002-1', item_id: 'INV002', warehouse_id: 1, quantity: 25, item_name: 'Blue Bic Pen', warehouse_name: 'Main Store', category_name: 'Stationery' },
  { compositeId: 'INV005-3', item_id: 'INV005', warehouse_id: 3, quantity: 10, item_name: 'Maize Flour', warehouse_name: 'Kitchen Store', category_name: 'Foodstuff' },
];

export const initialMockStockTransactions: StockTransaction[] = [
    { id: 'STK-T001', item_id: 'INV001', warehouse_id: 1, transaction_type: StockTransactionType.RECEIVE, quantity: 100, transaction_date: '2024-01-10', notes: 'Initial stock from supplier X' },
    { id: 'STK-T002', item_id: 'INV001', warehouse_id: 1, transaction_type: StockTransactionType.ISSUE, quantity: -50, transaction_date: '2024-02-05', notes: 'Issued to Admin Dept' },
];

export const initialMockRequisitions: Requisition[] = [
  { id: 'REQ001', requesting_staff_id: 'STF004', request_date: '2024-07-01', status: RequisitionStatus.PENDING_APPROVAL, notes: 'Stationery for Term 3', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), requesting_staff_name: 'Pam Beesly', department_name: 'Administration' },
];

export const initialMockRequisitionItems: RequisitionItem[] = [
    { id: 'RI001', requisition_id: 'REQ001', item_id: 'INV001', quantity_requested: 10, item_name: 'A4 Ream Paper' },
    { id: 'RI002', requisition_id: 'REQ001', item_id: 'INV002', quantity_requested: 5, item_name: 'Blue Bic Pen' },
];

export const initialMockPurchaseOrders: PurchaseOrder[] = [
    { id: 'PO001', supplier_id: 1, order_date: '2024-06-20', status: PurchaseOrderStatus.FULLY_RECEIVED, notes: 'Q3 Stationery Restock', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), supplier_name: 'Office Supplies Inc.' }
];

export const initialMockPurchaseOrderItems: PurchaseOrderItem[] = [
    { id: 'POI001', purchase_order_id: 'PO001', item_id: 'INV001', quantity_ordered: 50, unit_price: 480, quantity_received: 50, item_name: 'A4 Ream Paper' },
];
