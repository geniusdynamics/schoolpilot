// ABOUTME: Inventory module types - single source of truth for all inventory entities
// ABOUTME: Consolidated from core/types/inventory.ts - removed Inv* prefixes where appropriate

// Enums
export enum ItemTypeInv {
  CONSUMABLE = 'Consumable',
  FIXED_ASSET = 'Fixed Asset'
}

export enum DepreciationMethod {
  STRAIGHT_LINE = 'Straight Line',
  REDUCING_BALANCE = 'Reducing Balance'
}

export enum StockTransactionType {
  RECEIPT = 'Receipt',
  ISSUE = 'Issue',
  RETURN_TO_STORE = 'Return to Store',
  RETURN_TO_SUPPLIER = 'Return to Supplier',
  STOCK_ADJUSTMENT = 'Stock Adjustment'
}

export enum RequisitionStatus {
  PENDING_APPROVAL = 'Pending Approval',
  APPROVED = 'Approved',
  REJECTED = 'Rejected',
  ORDERED = 'Ordered',
  FULFILLED = 'Fulfilled',
  CANCELLED = 'Cancelled'
}

export enum PurchaseOrderStatus {
  DRAFT = 'Draft',
  PENDING_APPROVAL = 'Pending Approval',
  APPROVED = 'Approved',
  SENT_TO_SUPPLIER = 'Sent to Supplier',
  PARTIALLY_RECEIVED = 'Partially Received',
  FULLY_RECEIVED = 'Fully Received',
  INVOICED = 'Invoiced',
  CANCELLED = 'Cancelled'
}

// Types
export interface Warehouse {
  id: number;
  name: string;
}

export interface ItemCategoryInv {
  id: number;
  name: string;
}

export interface ItemInv {
  id: string;
  name: string;
  description?: string | null;
  category_id?: number | null;
  unit_of_measure?: string | null;
  item_type: ItemTypeInv;
  current_price?: number | null;
  created_at: string;
  updated_at: string;
  category_name?: string | null;
}

export enum InvRequisitionStatusEnum {
    PENDING_APPROVAL = 'Pending Approval',
    APPROVED = 'Approved',
    REJECTED = 'Rejected',
    ORDERED = 'Ordered',
    FULFILLED = 'Fulfilled',
    CANCELLED = 'Cancelled'
}

export enum InvPurchaseOrderStatusEnum {
    DRAFT = 'Draft',
    PENDING_APPROVAL = 'Pending Approval',
    APPROVED = 'Approved',
    SENT_TO_SUPPLIER = 'Sent to Supplier',
    PARTIALLY_RECEIVED = 'Partially Received',
    FULLY_RECEIVED = 'Fully Received',
    INVOICED = 'Invoiced',
    CANCELLED = 'Cancelled'
}

export enum InvStockTransactionType {
    RECEIPT = 'Receipt',
    ISSUE = 'Issue',
    RETURN_TO_STORE = 'Return to Store',
    RETURN_TO_SUPPLIER = 'Return to Supplier',
    STOCK_ADJUSTMENT = 'Stock Adjustment'
}

export enum InvDepreciationMethod {
    STRAIGHT_LINE = 'Straight Line',
    REDUCING_BALANCE = 'Reducing Balance'
}

export enum InvRFQStatusEnum {
    OPEN = 'Open',
    CLOSED = 'Closed',
    AWARDED = 'Awarded',
    CANCELLED = 'Cancelled'
}

export enum InvSupplierStatusEnum {
    ACTIVE = 'Active',
    INACTIVE = 'Inactive',
    BLACKLISTED = 'Blacklisted',
    PENDING_APPROVAL = 'Pending Approval'
}

export enum InvContractStatusEnum {
    ACTIVE = 'Active',
    EXPIRED = 'Expired',
    PENDING_RENEWAL = 'Pending Renewal',
    TERMINATED = 'Terminated'
}

// Core types (moved from core/types/inventory.ts)
export interface FixedAsset {
  id: string;
  item_id: string;
  asset_tag: string;
  serial_number?: string | null;
  purchase_date?: string | null;
  purchase_cost?: number | null;
  current_value?: number | null;
  depreciation_method?: DepreciationMethod | null;
  depreciation_rate_pa?: number | null;
  assigned_to_staff_id?: string | null;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
  item_name?: string | null;
  assigned_to_staff_name?: string | null;
}

export interface AssetDepreciationLog {
  id: string;
  asset_id: string;
  depreciation_date: string;
  amount_depreciated: number;
  book_value_after: number;
}

export interface StockLevel {
  compositeId: string; // item_id|warehouse_id
  item_id: string;
  warehouse_id: number;
  quantity: number;
  item_name?: string | null;
  warehouse_name?: string | null;
  category_name?: string | null;
}

export interface StockTransaction {
  id: string;
  item_id: string;
  warehouse_id: number;
  transaction_type: StockTransactionType;
  quantity: number;
  source_table?: string | null;
  source_id?: string | null;
  transaction_date?: string | null;
  notes?: string | null;
  item_name?: string | null;
  warehouse_name?: string | null;
}

export interface RequisitionItem {
  id: string;
  requisition_id: string;
  item_id: string;
  quantity_requested: number;
  unit_price?: number | null;
  quantity_issued?: number | null;
  fulfillment_stock_transaction_id?: string | null;
  item_name?: string | null;
  line_total?: number | null;
}

export interface Requisition {
  id: string;
  requesting_staff_id: string;
  request_date: string;
  status: RequisitionStatus;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  items?: RequisitionItem[];
  requesting_staff_name?: string | null;
  department_name?: string | null;
  total_requested_value?: number | null;
}

export interface PurchaseOrderItem {
  id: string;
  purchase_order_id: string;
  item_id: string;
  quantity_ordered: number;
  unit_price: number;
  quantity_received?: number | null;
  item_name?: string | null;
  line_total?: number | null;
}

export interface PurchaseOrder {
  id: string;
  supplier_id: number;
  order_date: string;
  status: PurchaseOrderStatus;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  items?: PurchaseOrderItem[];
  supplier_name?: string | null;
  total_value?: number | null;
}

// Additional inventory-specific types (with Inv* prefix for backward compatibility)
export interface InvRFQType {
  id: string;
  title: string;
  description?: string;
  issue_date: string;
  closing_date: string;
  status: InvRFQStatusEnum;
  created_at: string;
  updated_at: string;
}

export interface InvSupplierType {
  id: number;
  name: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  address?: string;
  tax_id?: string;
  registration_number?: string;
  status: InvSupplierStatusEnum;
  payment_terms?: string;
  credit_limit?: number;
  performance_rating?: number;
  created_at: string;
  updated_at: string;
}

export interface InvSupplierContractType {
  id: string;
  supplier_id: number;
  contract_number: string;
  title: string;
  description?: string;
  start_date: string;
  end_date: string;
  status: InvContractStatusEnum;
  contract_value?: number;
  renewal_notice_days?: number;
  created_at: string;
  updated_at: string;
  supplier_name?: string;
}

export interface InvStockAlertType {
  id: string;
  item_id: string;
  warehouse_id: number;
  alert_type: 'LOW_STOCK' | 'OVERSTOCK' | 'EXPIRY_WARNING' | 'EXPIRED';
  current_quantity: number;
  threshold_value?: number;
  expiry_date?: string;
  created_at: string;
  acknowledged_at?: string;
  acknowledged_by?: string;
  item_name?: string;
  warehouse_name?: string;
}

// Backward compatibility type aliases
export type InvWarehouseType = Warehouse;
export type InvItemCategoryType = ItemCategoryInv;
export type InvItemType = ItemInv;
export type InvFixedAssetType = FixedAsset;
export type InvAssetDepreciationLogType = AssetDepreciationLog;
export type InvStockLevelType = StockLevel;
export type InvStockTransactionTypeCompat = StockTransaction;
export type InvRequisitionItemType = RequisitionItem;
export type InvRequisitionType = Requisition;
export type InvPurchaseOrderItemType = PurchaseOrderItem;
export type InvPurchaseOrderType = PurchaseOrder;

// Source: StationeryPage.tsx
export type StationeryCategory = 'Paper' | 'Pens' | 'Notebooks' | 'Files' | 'Art Supplies' | 'Office Supplies' | 'Other';
export type AllocationStatus = 'Available' | 'Allocated' | 'Low Stock' | 'Out of Stock';

export interface StationeryItem {
  id: string;
  name: string;
  category: StationeryCategory;
  description: string;
  unit: string;
  quantity: number;
  min_stock_level: number;
  allocated_to?: string;
  department?: string;
  status: AllocationStatus;
  last_restocked: string;
  created_at: string;
}
