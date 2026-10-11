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
    PurchaseOrderStatus,
    RFQ,
    RFQStatus
} from '@/core/types';
import { suppliers } from '@/globalMockData';
import { InvSupplierType, InvSupplierStatusEnum, StationeryItem, InvContractStatusEnum, InvSupplierContractType } from './types';

// Map global suppliers to InvSupplierType for inventory module use
export const initialMockSuppliers: InvSupplierType[] = suppliers.map(supplier => ({
  id: supplier.id,
  name: supplier.name,
  contact_person: supplier.name, // Default to supplier name
  email: supplier.email || undefined,
  phone: supplier.phone || undefined,
  address: supplier.address || undefined,
  tax_id: undefined,
  registration_number: undefined,
  status: InvSupplierStatusEnum.ACTIVE,
  payment_terms: 'Net 30',
  credit_limit: 100000,
  performance_rating: 4,
  created_at: supplier.created_at,
  updated_at: supplier.updated_at
}));

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
  // Stationery Items
  { id: 'INV001', name: 'A4 Ream Paper', category_id: 1, unit_of_measure: 'Ream', item_type: ItemTypeInv.CONSUMABLE, current_price: 500, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), category_name: 'Stationery' },
  { id: 'INV002', name: 'Blue Bic Pen', category_id: 1, unit_of_measure: 'Box (50pcs)', item_type: ItemTypeInv.CONSUMABLE, current_price: 600, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), category_name: 'Stationery' },
  { id: 'INV003', name: 'Red Bic Pen', category_id: 1, unit_of_measure: 'Box (50pcs)', item_type: ItemTypeInv.CONSUMABLE, current_price: 600, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), category_name: 'Stationery' },
  { id: 'INV004', name: 'HB Pencils', category_id: 1, unit_of_measure: 'Box (12pcs)', item_type: ItemTypeInv.CONSUMABLE, current_price: 250, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), category_name: 'Stationery' },
  { id: 'INV005', name: 'Mathematical Set', category_id: 1, unit_of_measure: 'Piece', item_type: ItemTypeInv.CONSUMABLE, current_price: 350, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), category_name: 'Stationery' },
  { id: 'INV006', name: 'Exercise Books 40 Pages', category_id: 1, unit_of_measure: 'Pack (20 books)', item_type: ItemTypeInv.CONSUMABLE, current_price: 800, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), category_name: 'Stationery' },
  { id: 'INV007', name: 'Graph Books', category_id: 1, unit_of_measure: 'Pack (10 books)', item_type: ItemTypeInv.CONSUMABLE, current_price: 450, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), category_name: 'Stationery' },
  { id: 'INV008', name: 'Whiteboard Markers', category_id: 1, unit_of_measure: 'Pack (4pcs)', item_type: ItemTypeInv.CONSUMABLE, current_price: 320, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), category_name: 'Stationery' },
  { id: 'INV009', name: 'Manila Paper Sheets', category_id: 1, unit_of_measure: 'Pack (100 sheets)', item_type: ItemTypeInv.CONSUMABLE, current_price: 750, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), category_name: 'Stationery' },
  { id: 'INV010', name: 'Stapler', category_id: 1, unit_of_measure: 'Piece', item_type: ItemTypeInv.CONSUMABLE, current_price: 450, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), category_name: 'Stationery' },
  // Textbooks
  { id: 'INV011', name: 'English Form 1 Student Book', category_id: 2, unit_of_measure: 'Piece', item_type: ItemTypeInv.CONSUMABLE, current_price: 850, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), category_name: 'Textbooks' },
  { id: 'INV012', name: 'Mathematics Form 1 Student Book', category_id: 2, unit_of_measure: 'Piece', item_type: ItemTypeInv.CONSUMABLE, current_price: 920, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), category_name: 'Textbooks' },
  { id: 'INV013', name: 'Biology Form 3 Student Book', category_id: 2, unit_of_measure: 'Piece', item_type: ItemTypeInv.CONSUMABLE, current_price: 1150, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), category_name: 'Textbooks' },
  { id: 'INV014', name: 'Chemistry Form 4 Student Book', category_id: 2, unit_of_measure: 'Piece', item_type: ItemTypeInv.CONSUMABLE, current_price: 1280, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), category_name: 'Textbooks' },
  { id: 'INV015', name: 'History Form 2 Student Book', category_id: 2, unit_of_measure: 'Piece', item_type: ItemTypeInv.CONSUMABLE, current_price: 780, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), category_name: 'Textbooks' },
  // Lab Equipment
  { id: 'INV016', name: 'Test Tubes', category_id: 3, unit_of_measure: 'Pack (50pcs)', item_type: ItemTypeInv.CONSUMABLE, current_price: 2500, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), category_name: 'Lab Equipment' },
  { id: 'INV017', name: 'Beakers 250ml', category_id: 3, unit_of_measure: 'Pack (6pcs)', item_type: ItemTypeInv.CONSUMABLE, current_price: 1800, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), category_name: 'Lab Equipment' },
  { id: 'INV018', name: 'Microscope Student Grade', category_id: 3, unit_of_measure: 'Piece', item_type: ItemTypeInv.FIXED_ASSET, current_price: 45000, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), category_name: 'Lab Equipment' },
  { id: 'INV019', name: 'Digital Scale 0.1g', category_id: 3, unit_of_measure: 'Piece', item_type: ItemTypeInv.FIXED_ASSET, current_price: 8500, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), category_name: 'Lab Equipment' },
  { id: 'INV020', name: 'Burette 50ml', category_id: 3, unit_of_measure: 'Piece', item_type: ItemTypeInv.CONSUMABLE, current_price: 950, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), category_name: 'Lab Equipment' },
  // Furniture
  { id: 'INV021', name: 'Student Desk', category_id: 4, unit_of_measure: 'Piece', item_type: ItemTypeInv.FIXED_ASSET, current_price: 3500, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), category_name: 'Furniture' },
  { id: 'INV022', name: 'Lab Stool', category_id: 4, unit_of_measure: 'Piece', item_type: ItemTypeInv.FIXED_ASSET, current_price: 1500, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), category_name: 'Furniture' },
  { id: 'INV023', name: 'Teacher Chair', category_id: 4, unit_of_measure: 'Piece', item_type: ItemTypeInv.FIXED_ASSET, current_price: 4500, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), category_name: 'Furniture' },
  { id: 'INV024', name: 'Office Table', category_id: 4, unit_of_measure: 'Piece', item_type: ItemTypeInv.FIXED_ASSET, current_price: 8500, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), category_name: 'Furniture' },
  { id: 'INV025', name: 'Filing Cabinet', category_id: 4, unit_of_measure: 'Piece', item_type: ItemTypeInv.FIXED_ASSET, current_price: 12000, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), category_name: 'Furniture' },
  { id: 'INV026', name: 'Whiteboard 4x6 ft', category_id: 4, unit_of_measure: 'Piece', item_type: ItemTypeInv.FIXED_ASSET, current_price: 6500, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), category_name: 'Furniture' },
  // Cleaning Supplies
  { id: 'INV027', name: 'Toilet Paper Roll', category_id: 5, unit_of_measure: 'Pack (12 rolls)', item_type: ItemTypeInv.CONSUMABLE, current_price: 650, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), category_name: 'Cleaning Supplies' },
  { id: 'INV028', name: 'Hand Soap Liquid', category_id: 5, unit_of_measure: '5 Liter Container', item_type: ItemTypeInv.CONSUMABLE, current_price: 850, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), category_name: 'Cleaning Supplies' },
  { id: 'INV029', name: 'Floor Disinfectant', category_id: 5, unit_of_measure: '5 Liter Container', item_type: ItemTypeInv.CONSUMABLE, current_price: 1250, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), category_name: 'Cleaning Supplies' },
  { id: 'INV030', name: 'Cleaning Cloths', category_id: 5, unit_of_measure: 'Pack (10pcs)', item_type: ItemTypeInv.CONSUMABLE, current_price: 450, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), category_name: 'Cleaning Supplies' },
  // Foodstuff
  { id: 'INV031', name: 'Maize Flour', category_id: 6, unit_of_measure: '90kg Bag', item_type: ItemTypeInv.CONSUMABLE, current_price: 5000, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), category_name: 'Foodstuff' },
  { id: 'INV032', name: 'Rice', category_id: 6, unit_of_measure: '50kg Bag', item_type: ItemTypeInv.CONSUMABLE, current_price: 4500, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), category_name: 'Foodstuff' },
  { id: 'INV033', name: 'Cooking Oil', category_id: 6, unit_of_measure: '20 Liter Container', item_type: ItemTypeInv.CONSUMABLE, current_price: 3200, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), category_name: 'Foodstuff' },
  { id: 'INV034', name: 'Sugar', category_id: 6, unit_of_measure: '50kg Bag', item_type: ItemTypeInv.CONSUMABLE, current_price: 6500, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), category_name: 'Foodstuff' },
  { id: 'INV035', name: 'Tea Leaves', category_id: 6, unit_of_measure: '5kg Pack', item_type: ItemTypeInv.CONSUMABLE, current_price: 1800, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), category_name: 'Foodstuff' }
];

export const initialMockFixedAssets: FixedAsset[] = [
  { id: 'FA001', item_id: 'INV021', asset_tag: 'DESK001', serial_number: 'SN-DESK-001', purchase_date: '2023-01-15', purchase_cost: 3500, current_value: 3200, depreciation_method: DepreciationMethod.STRAIGHT_LINE, depreciation_rate_pa: 10, item_name: 'Student Desk', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'FA002', item_id: 'INV022', asset_tag: 'STOOL001', serial_number: 'SN-STOOL-001', purchase_date: '2023-01-15', purchase_cost: 1500, current_value: 1350, depreciation_method: DepreciationMethod.STRAIGHT_LINE, depreciation_rate_pa: 10, item_name: 'Lab Stool', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'FA003', item_id: 'INV018', asset_tag: 'MICRO001', serial_number: 'SN-MICRO-001', purchase_date: '2023-02-20', purchase_cost: 45000, current_value: 40500, depreciation_method: DepreciationMethod.STRAIGHT_LINE, depreciation_rate_pa: 10, item_name: 'Microscope Student Grade', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'FA004', item_id: 'INV019', asset_tag: 'SCALE001', serial_number: 'SN-SCALE-001', purchase_date: '2023-02-20', purchase_cost: 8500, current_value: 7650, depreciation_method: DepreciationMethod.STRAIGHT_LINE, depreciation_rate_pa: 10, item_name: 'Digital Scale 0.1g', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'FA005', item_id: 'INV023', asset_tag: 'CHAIR001', serial_number: 'SN-CHAIR-001', purchase_date: '2023-03-10', purchase_cost: 4500, current_value: 4050, depreciation_method: DepreciationMethod.STRAIGHT_LINE, depreciation_rate_pa: 10, item_name: 'Teacher Chair', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'FA006', item_id: 'INV024', asset_tag: 'TABLE001', serial_number: 'SN-TABLE-001', purchase_date: '2023-03-10', purchase_cost: 8500, current_value: 7650, depreciation_method: DepreciationMethod.STRAIGHT_LINE, depreciation_rate_pa: 10, item_name: 'Office Table', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'FA007', item_id: 'INV025', asset_tag: 'CABINET001', serial_number: 'SN-CABINET-001', purchase_date: '2023-04-05', purchase_cost: 12000, current_value: 10800, depreciation_method: DepreciationMethod.STRAIGHT_LINE, depreciation_rate_pa: 10, item_name: 'Filing Cabinet', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'FA008', item_id: 'INV026', asset_tag: 'BOARD001', serial_number: 'SN-BOARD-001', purchase_date: '2023-04-05', purchase_cost: 6500, current_value: 5850, depreciation_method: DepreciationMethod.STRAIGHT_LINE, depreciation_rate_pa: 10, item_name: 'Whiteboard 4x6 ft', created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
];

export const initialMockAssetDepreciationLogs: AssetDepreciationLog[] = [
    { id: 'ADL001', asset_id: 'FA001', depreciation_date: '2023-12-31', amount_depreciated: 350, book_value_after: 3150 },
    { id: 'ADL002', asset_id: 'FA002', depreciation_date: '2023-12-31', amount_depreciated: 150, book_value_after: 1350 },
    { id: 'ADL003', asset_id: 'FA003', depreciation_date: '2023-12-31', amount_depreciated: 3750, book_value_after: 41250 },
    { id: 'ADL004', asset_id: 'FA004', depreciation_date: '2023-12-31', amount_depreciated: 708, book_value_after: 7792 },
    { id: 'ADL005', asset_id: 'FA005', depreciation_date: '2023-12-31', amount_depreciated: 337, book_value_after: 4163 },
    { id: 'ADL006', asset_id: 'FA006', depreciation_date: '2023-12-31', amount_depreciated: 637, book_value_after: 7863 },
    { id: 'ADL007', asset_id: 'FA007', depreciation_date: '2023-12-31', amount_depreciated: 900, book_value_after: 11100 },
    { id: 'ADL008', asset_id: 'FA008', depreciation_date: '2023-12-31', amount_depreciated: 487, book_value_after: 6013 }
];

export const initialMockStockLevels: StockLevel[] = [
  // Main Store Stock Levels
  { compositeId: 'INV001-1', item_id: 'INV001', warehouse_id: 1, quantity: 50, item_name: 'A4 Ream Paper', warehouse_name: 'Main Store', category_name: 'Stationery' },
  { compositeId: 'INV002-1', item_id: 'INV002', warehouse_id: 1, quantity: 25, item_name: 'Blue Bic Pen', warehouse_name: 'Main Store', category_name: 'Stationery' },
  { compositeId: 'INV003-1', item_id: 'INV003', warehouse_id: 1, quantity: 30, item_name: 'Red Bic Pen', warehouse_name: 'Main Store', category_name: 'Stationery' },
  { compositeId: 'INV004-1', item_id: 'INV004', warehouse_id: 1, quantity: 40, item_name: 'HB Pencils', warehouse_name: 'Main Store', category_name: 'Stationery' },
  { compositeId: 'INV005-1', item_id: 'INV005', warehouse_id: 1, quantity: 60, item_name: 'Mathematical Set', warehouse_name: 'Main Store', category_name: 'Stationery' },
  { compositeId: 'INV006-1', item_id: 'INV006', warehouse_id: 1, quantity: 15, item_name: 'Exercise Books 40 Pages', warehouse_name: 'Main Store', category_name: 'Stationery' },
  { compositeId: 'INV007-1', item_id: 'INV007', warehouse_id: 1, quantity: 12, item_name: 'Graph Books', warehouse_name: 'Main Store', category_name: 'Stationery' },
  { compositeId: 'INV008-1', item_id: 'INV008', warehouse_id: 1, quantity: 35, item_name: 'Whiteboard Markers', warehouse_name: 'Main Store', category_name: 'Stationery' },
  { compositeId: 'INV009-1', item_id: 'INV009', warehouse_id: 1, quantity: 8, item_name: 'Manila Paper Sheets', warehouse_name: 'Main Store', category_name: 'Stationery' },
  { compositeId: 'INV010-1', item_id: 'INV010', warehouse_id: 1, quantity: 18, item_name: 'Stapler', warehouse_name: 'Main Store', category_name: 'Stationery' },
  { compositeId: 'INV011-1', item_id: 'INV011', warehouse_id: 1, quantity: 45, item_name: 'English Form 1 Student Book', warehouse_name: 'Main Store', category_name: 'Textbooks' },
  { compositeId: 'INV012-1', item_id: 'INV012', warehouse_id: 1, quantity: 38, item_name: 'Mathematics Form 1 Student Book', warehouse_name: 'Main Store', category_name: 'Textbooks' },
  { compositeId: 'INV013-1', item_id: 'INV013', warehouse_id: 1, quantity: 22, item_name: 'Biology Form 3 Student Book', warehouse_name: 'Main Store', category_name: 'Textbooks' },
  { compositeId: 'INV014-1', item_id: 'INV014', warehouse_id: 1, quantity: 18, item_name: 'Chemistry Form 4 Student Book', warehouse_name: 'Main Store', category_name: 'Textbooks' },
  { compositeId: 'INV015-1', item_id: 'INV015', warehouse_id: 1, quantity: 32, item_name: 'History Form 2 Student Book', warehouse_name: 'Main Store', category_name: 'Textbooks' },
  { compositeId: 'INV027-1', item_id: 'INV027', warehouse_id: 1, quantity: 25, item_name: 'Toilet Paper Roll', warehouse_name: 'Main Store', category_name: 'Cleaning Supplies' },
  { compositeId: 'INV028-1', item_id: 'INV028', warehouse_id: 1, quantity: 8, item_name: 'Hand Soap Liquid', warehouse_name: 'Main Store', category_name: 'Cleaning Supplies' },
  { compositeId: 'INV029-1', item_id: 'INV029', warehouse_id: 1, quantity: 6, item_name: 'Floor Disinfectant', warehouse_name: 'Main Store', category_name: 'Cleaning Supplies' },
  { compositeId: 'INV030-1', item_id: 'INV030', warehouse_id: 1, quantity: 20, item_name: 'Cleaning Cloths', warehouse_name: 'Main Store', category_name: 'Cleaning Supplies' },
  // Science Lab Store Stock Levels
  { compositeId: 'INV016-2', item_id: 'INV016', warehouse_id: 2, quantity: 15, item_name: 'Test Tubes', warehouse_name: 'Science Lab Store', category_name: 'Lab Equipment' },
  { compositeId: 'INV017-2', item_id: 'INV017', warehouse_id: 2, quantity: 12, item_name: 'Beakers 250ml', warehouse_name: 'Science Lab Store', category_name: 'Lab Equipment' },
  { compositeId: 'INV020-2', item_id: 'INV020', warehouse_id: 2, quantity: 8, item_name: 'Burette 50ml', warehouse_name: 'Science Lab Store', category_name: 'Lab Equipment' },
  // Kitchen Store Stock Levels
  { compositeId: 'INV031-3', item_id: 'INV031', warehouse_id: 3, quantity: 10, item_name: 'Maize Flour', warehouse_name: 'Kitchen Store', category_name: 'Foodstuff' },
  { compositeId: 'INV032-3', item_id: 'INV032', warehouse_id: 3, quantity: 8, item_name: 'Rice', warehouse_name: 'Kitchen Store', category_name: 'Foodstuff' },
  { compositeId: 'INV033-3', item_id: 'INV033', warehouse_id: 3, quantity: 5, item_name: 'Cooking Oil', warehouse_name: 'Kitchen Store', category_name: 'Foodstuff' },
  { compositeId: 'INV034-3', item_id: 'INV034', warehouse_id: 3, quantity: 6, item_name: 'Sugar', warehouse_name: 'Kitchen Store', category_name: 'Foodstuff' },
  { compositeId: 'INV035-3', item_id: 'INV035', warehouse_id: 3, quantity: 12, item_name: 'Tea Leaves', warehouse_name: 'Kitchen Store', category_name: 'Foodstuff' }
];

export const initialMockStockTransactions: StockTransaction[] = [
    // Stock Receipts
    { id: 'STK-T001', item_id: 'INV001', warehouse_id: 1, transaction_type: StockTransactionType.RECEIPT, quantity: 100, transaction_date: '2024-01-10', notes: 'Initial stock from Text Book Centre', item_name: 'A4 Ream Paper', warehouse_name: 'Main Store' },
    { id: 'STK-T002', item_id: 'INV002', warehouse_id: 1, transaction_type: StockTransactionType.RECEIPT, quantity: 50, transaction_date: '2024-01-10', notes: 'Initial stock from Office Depot', item_name: 'Blue Bic Pen', warehouse_name: 'Main Store' },
    { id: 'STK-T003', item_id: 'INV011', warehouse_id: 1, transaction_type: StockTransactionType.RECEIPT, quantity: 50, transaction_date: '2024-01-15', notes: 'Form 1 textbooks from KLB', item_name: 'English Form 1 Student Book', warehouse_name: 'Main Store' },
    { id: 'STK-T004', item_id: 'INV012', warehouse_id: 1, transaction_type: StockTransactionType.RECEIPT, quantity: 45, transaction_date: '2024-01-15', notes: 'Mathematics books from Longhorn', item_name: 'Mathematics Form 1 Student Book', warehouse_name: 'Main Store' },
    { id: 'STK-T005', item_id: 'INV031', warehouse_id: 3, transaction_type: StockTransactionType.RECEIPT, quantity: 20, transaction_date: '2024-01-20', notes: 'Maize flour for kitchen', item_name: 'Maize Flour', warehouse_name: 'Kitchen Store' },
    { id: 'STK-T006', item_id: 'INV032', warehouse_id: 3, transaction_type: StockTransactionType.RECEIPT, quantity: 15, transaction_date: '2024-01-20', notes: 'Rice for kitchen', item_name: 'Rice', warehouse_name: 'Kitchen Store' },
    { id: 'STK-T007', item_id: 'INV016', warehouse_id: 2, transaction_type: StockTransactionType.RECEIPT, quantity: 20, transaction_date: '2024-01-25', notes: 'Lab equipment from Scientific Equipment Ltd', item_name: 'Test Tubes', warehouse_name: 'Science Lab Store' },
    { id: 'STK-T008', item_id: 'INV017', warehouse_id: 2, transaction_type: StockTransactionType.RECEIPT, quantity: 15, transaction_date: '2024-01-25', notes: 'Beakers for chemistry lab', item_name: 'Beakers 250ml', warehouse_name: 'Science Lab Store' },
    // Stock Issues
    { id: 'STK-T009', item_id: 'INV001', warehouse_id: 1, transaction_type: StockTransactionType.ISSUE, quantity: -50, transaction_date: '2024-02-05', notes: 'Issued to Admin Department', item_name: 'A4 Ream Paper', warehouse_name: 'Main Store' },
    { id: 'STK-T010', item_id: 'INV002', warehouse_id: 1, transaction_type: StockTransactionType.ISSUE, quantity: -25, transaction_date: '2024-02-08', notes: 'Issued to Teaching Staff', item_name: 'Blue Bic Pen', warehouse_name: 'Main Store' },
    { id: 'STK-T011', item_id: 'INV011', warehouse_id: 1, transaction_type: StockTransactionType.ISSUE, quantity: -5, transaction_date: '2024-02-10', notes: 'Distributed to Form 1A students', item_name: 'English Form 1 Student Book', warehouse_name: 'Main Store' },
    { id: 'STK-T012', item_id: 'INV012', warehouse_id: 1, transaction_type: StockTransactionType.ISSUE, quantity: -7, transaction_date: '2024-02-10', notes: 'Distributed to Form 1A students', item_name: 'Mathematics Form 1 Student Book', warehouse_name: 'Main Store' },
    { id: 'STK-T013', item_id: 'INV031', warehouse_id: 3, transaction_type: StockTransactionType.ISSUE, quantity: -10, transaction_date: '2024-02-15', notes: 'Kitchen consumption - Term 1', item_name: 'Maize Flour', warehouse_name: 'Kitchen Store' },
    { id: 'STK-T014', item_id: 'INV032', warehouse_id: 3, transaction_type: StockTransactionType.ISSUE, quantity: -7, transaction_date: '2024-02-15', notes: 'Kitchen consumption - Term 1', item_name: 'Rice', warehouse_name: 'Kitchen Store' },
    { id: 'STK-T015', item_id: 'INV016', warehouse_id: 2, transaction_type: StockTransactionType.ISSUE, quantity: -5, transaction_date: '2024-02-20', notes: 'Chemistry practical classes', item_name: 'Test Tubes', warehouse_name: 'Science Lab Store' },
    { id: 'STK-T016', item_id: 'INV017', warehouse_id: 2, transaction_type: StockTransactionType.ISSUE, quantity: -3, transaction_date: '2024-02-20', notes: 'Biology practical classes', item_name: 'Beakers 250ml', warehouse_name: 'Science Lab Store' },
    // Stock Adjustments
    { id: 'STK-T017', item_id: 'INV006', warehouse_id: 1, transaction_type: StockTransactionType.STOCK_ADJUSTMENT, quantity: -2, transaction_date: '2024-03-01', notes: 'Damaged exercise books - write off', item_name: 'Exercise Books 40 Pages', warehouse_name: 'Main Store' },
    { id: 'STK-T018', item_id: 'INV027', warehouse_id: 1, transaction_type: StockTransactionType.STOCK_ADJUSTMENT, quantity: 5, transaction_date: '2024-03-05', notes: 'Stock count adjustment - found extra', item_name: 'Toilet Paper Roll', warehouse_name: 'Main Store' }
];

export const initialMockRequisitions: Requisition[] = [
  { id: 'REQ001', requesting_staff_id: 'STF004', request_date: '2024-07-01', status: RequisitionStatus.PENDING_APPROVAL, notes: 'Stationery for Term 3', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), requesting_staff_name: 'Pam Beesly', department_name: 'Administration' },
  { id: 'REQ002', requesting_staff_id: 'STF005', request_date: '2024-07-05', status: RequisitionStatus.APPROVED, notes: 'Lab supplies for Chemistry practical', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), requesting_staff_name: 'Ryan Howard', department_name: 'Sciences' },
  { id: 'REQ003', requesting_staff_id: 'STF008', request_date: '2024-07-08', status: RequisitionStatus.FULFILLED, notes: 'Cleaning supplies for maintenance', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), requesting_staff_name: 'Phyllis Vance', department_name: 'Maintenance' },
  { id: 'REQ004', requesting_staff_id: 'STF011', request_date: '2024-07-12', status: RequisitionStatus.PENDING_APPROVAL, notes: 'Form 2 textbooks for new admissions', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), requesting_staff_name: 'Angela Martin', department_name: 'Academics' }
];

export const initialMockRequisitionItems: RequisitionItem[] = [
    // REQ001 Items (Pam's Stationery Request)
    { id: 'RI001', requisition_id: 'REQ001', item_id: 'INV001', quantity_requested: 10, item_name: 'A4 Ream Paper' },
    { id: 'RI002', requisition_id: 'REQ001', item_id: 'INV002', quantity_requested: 5, item_name: 'Blue Bic Pen' },
    { id: 'RI003', requisition_id: 'REQ001', item_id: 'INV006', quantity_requested: 3, item_name: 'Exercise Books 40 Pages' },
    { id: 'RI004', requisition_id: 'REQ001', item_id: 'INV008', quantity_requested: 8, item_name: 'Whiteboard Markers' },
    // REQ002 Items (Ryan's Lab Supplies Request)
    { id: 'RI005', requisition_id: 'REQ002', item_id: 'INV016', quantity_requested: 2, item_name: 'Test Tubes' },
    { id: 'RI006', requisition_id: 'REQ002', item_id: 'INV017', quantity_requested: 3, item_name: 'Beakers 250ml' },
    { id: 'RI007', requisition_id: 'REQ002', item_id: 'INV020', quantity_requested: 2, item_name: 'Burette 50ml' },
    // REQ003 Items (Phyllis's Cleaning Supplies Request)
    { id: 'RI008', requisition_id: 'REQ003', item_id: 'INV027', quantity_requested: 5, item_name: 'Toilet Paper Roll' },
    { id: 'RI009', requisition_id: 'REQ003', item_id: 'INV028', quantity_requested: 2, item_name: 'Hand Soap Liquid' },
    { id: 'RI010', requisition_id: 'REQ003', item_id: 'INV029', quantity_requested: 2, item_name: 'Floor Disinfectant' },
    { id: 'RI011', requisition_id: 'REQ003', item_id: 'INV030', quantity_requested: 5, item_name: 'Cleaning Cloths' },
    // REQ004 Items (Angela's Textbooks Request)
    { id: 'RI012', requisition_id: 'REQ004', item_id: 'INV015', quantity_requested: 10, item_name: 'History Form 2 Student Book' },
    { id: 'RI013', requisition_id: 'REQ004', item_id: 'INV012', quantity_requested: 8, item_name: 'Mathematics Form 1 Student Book' }
];

export const initialMockPurchaseOrders: PurchaseOrder[] = [
    { id: 'PO001', supplier_id: 1, order_date: '2024-06-20', status: PurchaseOrderStatus.FULLY_RECEIVED, notes: 'Q3 Stationery Restock', requested_by: 'STF003', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), supplier_name: 'Text Book Centre' },
    { id: 'PO002', supplier_id: 7, order_date: '2024-06-25', status: PurchaseOrderStatus.PARTIALLY_RECEIVED, notes: 'Laboratory equipment upgrade', requested_by: 'STF002', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), supplier_name: 'Scientific Equipment Ltd' },
    { id: 'PO003', supplier_id: 10, order_date: '2024-07-01', status: PurchaseOrderStatus.PENDING, notes: 'Kitchen supplies for Term 3', requested_by: 'STF008', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), supplier_name: 'Fresh Foods Catering' },
    { id: 'PO004', supplier_id: 5, order_date: '2024-07-05', status: PurchaseOrderStatus.APPROVED, notes: 'Office furniture and supplies', requested_by: 'STF001', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), supplier_name: 'Office Depot Kenya' }
];

export const initialMockPurchaseOrderItems: PurchaseOrderItem[] = [
    // PO001 Items (Text Book Centre - Stationery)
    { id: 'POI001', purchase_order_id: 'PO001', item_id: 'INV001', quantity_ordered: 50, unit_price: 480, quantity_received: 50, item_name: 'A4 Ream Paper' },
    { id: 'POI002', purchase_order_id: 'PO001', item_id: 'INV002', quantity_ordered: 30, unit_price: 580, quantity_received: 30, item_name: 'Blue Bic Pen' },
    { id: 'POI003', purchase_order_id: 'PO001', item_id: 'INV006', quantity_ordered: 20, unit_price: 780, quantity_received: 20, item_name: 'Exercise Books 40 Pages' },
    { id: 'POI004', purchase_order_id: 'PO001', item_id: 'INV008', quantity_ordered: 25, unit_price: 300, quantity_received: 25, item_name: 'Whiteboard Markers' },
    // PO002 Items (Scientific Equipment Ltd - Lab Equipment)
    { id: 'POI005', purchase_order_id: 'PO002', item_id: 'INV018', quantity_ordered: 2, unit_price: 43000, quantity_received: 1, item_name: 'Microscope Student Grade' },
    { id: 'POI006', purchase_order_id: 'PO002', item_id: 'INV019', quantity_ordered: 1, unit_price: 8200, quantity_received: 1, item_name: 'Digital Scale 0.1g' },
    { id: 'POI007', purchase_order_id: 'PO002', item_id: 'INV016', quantity_ordered: 10, unit_price: 2400, quantity_received: 10, item_name: 'Test Tubes' },
    { id: 'POI008', purchase_order_id: 'PO002', item_id: 'INV017', quantity_ordered: 8, unit_price: 1750, quantity_received: 8, item_name: 'Beakers 250ml' },
    // PO003 Items (Fresh Foods Catering - Kitchen Supplies)
    { id: 'POI009', purchase_order_id: 'PO003', item_id: 'INV031', quantity_ordered: 15, unit_price: 4800, quantity_received: 0, item_name: 'Maize Flour' },
    { id: 'POI010', purchase_order_id: 'PO003', item_id: 'INV032', quantity_ordered: 10, unit_price: 4350, quantity_received: 0, item_name: 'Rice' },
    { id: 'POI011', purchase_order_id: 'PO003', item_id: 'INV033', quantity_ordered: 5, unit_price: 3100, quantity_received: 0, item_name: 'Cooking Oil' },
    { id: 'POI012', purchase_order_id: 'PO003', item_id: 'INV034', quantity_ordered: 8, unit_price: 6300, quantity_received: 0, item_name: 'Sugar' },
    // PO004 Items (Office Depot - Office Supplies)
    { id: 'POI013', purchase_order_id: 'PO004', item_id: 'INV023', quantity_ordered: 3, unit_price: 4350, quantity_received: 0, item_name: 'Teacher Chair' },
    { id: 'POI014', purchase_order_id: 'PO004', item_id: 'INV024', quantity_ordered: 2, unit_price: 8200, quantity_received: 0, item_name: 'Office Table' },
    { id: 'POI015', purchase_order_id: 'PO004', item_id: 'INV025', quantity_ordered: 1, unit_price: 11500, quantity_received: 0, item_name: 'Filing Cabinet' }
];

export const initialMockRFQs: RFQ[] = [
  { id: 'RFQ001', title: 'Laboratory Equipment Procurement', description: 'Request for quotations for chemistry and biology laboratory equipment', issue_date: '2024-06-01', closing_date: '2024-06-15', status: RFQStatus.CLOSED, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'RFQ002', title: 'Office Furniture Supply', description: 'Procurement of desks, chairs, and filing cabinets for administrative offices', issue_date: '2024-06-10', closing_date: '2024-06-25', status: RFQStatus.AWARDED, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'RFQ003', title: 'Textbook Supply for Academic Year 2024/2025', description: 'Supply of textbooks for all forms and subjects', issue_date: '2024-07-01', closing_date: '2024-07-20', status: RFQStatus.OPEN, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'RFQ004', title: 'Kitchen Equipment Upgrade', description: 'Procurement of modern kitchen equipment and appliances', issue_date: '2024-07-05', closing_date: '2024-07-25', status: RFQStatus.OPEN, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'RFQ005', title: 'ICT Infrastructure Enhancement', description: 'Supply and installation of computers, projectors, and networking equipment', issue_date: '2024-05-15', closing_date: '2024-05-30', status: RFQStatus.CANCELLED, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
];

export const initialMockSupplierContracts: InvSupplierContractType[] = [
  {
    id: 'SC001',
    supplier_id: 1,
    supplier_name: 'Text Book Centre',
    contract_number: 'TBC-2024-001',
    title: 'Core textbooks supply agreement',
    description: 'Annual supply contract for curriculum textbooks and classroom stationery.',
    start_date: '2024-01-01',
    end_date: '2024-12-31',
    status: InvContractStatusEnum.ACTIVE,
    contract_value: 125000,
    renewal_notice_days: 45,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'SC002',
    supplier_id: 7,
    supplier_name: 'Scientific Equipment Ltd',
    contract_number: 'SEL-2024-002',
    title: 'Laboratory consumables and equipment contract',
    description: 'Provides science lab consumables, calibrated instruments, and warranty support.',
    start_date: '2024-02-01',
    end_date: '2025-01-31',
    status: InvContractStatusEnum.PENDING_RENEWAL,
    contract_value: 210000,
    renewal_notice_days: 30,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

// Ensure all AppDataType keys for inventory are exported
export const warehouses = initialMockWarehouses;
export const itemCategoriesInv = initialMockItemCategoriesInv;
export const itemsInv = initialMockItemsInv;
export const fixedAssets = initialMockFixedAssets;
export const requisitions = initialMockRequisitions;
export const requisitionItems = initialMockRequisitionItems;
export const purchaseOrders = initialMockPurchaseOrders;
export const purchaseOrderItems = initialMockPurchaseOrderItems;
export const stockLevels = initialMockStockLevels;
export const stockTransactions = initialMockStockTransactions;
export const assetDepreciationLogs = initialMockAssetDepreciationLogs;
export const rfqs = initialMockRFQs;
export const supplierContracts = initialMockSupplierContracts;

// Source: StationeryPage.tsx
export const stationeryItems: StationeryItem[] = [
  { id: 'stn-1', name: 'A4 Paper Ream', category: 'Paper', description: '500 sheets per ream, 80 GSM', unit: 'Reams', quantity: 50, min_stock_level: 20, allocated_to: 'Administration', department: 'Administration', status: 'Available', last_restocked: '2024-01-15', created_at: '2024-01-01' },
  { id: 'stn-2', name: 'Blue Ballpoint Pens', category: 'Pens', description: 'Pack of 10 blue ballpoint pens', unit: 'Packs', quantity: 15, min_stock_level: 10, allocated_to: 'Academics', department: 'Academics', status: 'Available', last_restocked: '2024-01-10', created_at: '2024-01-01' },
  { id: 'stn-3', name: 'Spiral Notebooks', category: 'Notebooks', description: '200 pages, ruled, A4 size', unit: 'Pieces', quantity: 8, min_stock_level: 20, allocated_to: 'Students', department: 'Academics', status: 'Low Stock', last_restocked: '2024-01-05', created_at: '2024-01-01' },
  { id: 'stn-4', name: 'File Folders', category: 'Files', description: 'Plastic file folders, assorted colors', unit: 'Pieces', quantity: 100, min_stock_level: 30, allocated_to: 'Administration', department: 'Administration', status: 'Available', last_restocked: '2024-01-12', created_at: '2024-01-01' },
  { id: 'stn-5', name: 'Watercolor Set', category: 'Art Supplies', description: '12 color watercolor set with brushes', unit: 'Sets', quantity: 0, min_stock_level: 5, allocated_to: 'Art Department', department: 'Academics', status: 'Out of Stock', last_restocked: '2023-12-20', created_at: '2024-01-01' },
  { id: 'stn-6', name: 'Stapler Machine', category: 'Office Supplies', description: 'Heavy duty stapler', unit: 'Pieces', quantity: 25, min_stock_level: 10, allocated_to: 'All Departments', department: 'Administration', status: 'Allocated', last_restocked: '2024-01-08', created_at: '2024-01-01' }
];
