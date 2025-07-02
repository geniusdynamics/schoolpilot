// ABOUTME: This file defines TypeScript interfaces, enums, and type aliases for the Inventory module.
// ABOUTME: It ensures all inventory-related data structures are managed in one place.

export enum InvItemTypeEnum {
    CONSUMABLE = 'Consumable',
    FIXED_ASSET = 'Fixed Asset'
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

export interface InvWarehouseType {
  id: number;
  name: string;
  location?: string;
}

export interface InvItemCategoryType {
  id: number;
  name: string;
}

export interface InvItemType {
  id: string;
  name: string;
  description?: string;
  category_id?: number;
  unit_of_measure: string;
  item_type: InvItemTypeEnum;
  current_price?: number;
  reorder_level?: number;
  created_at: string;
  updated_at: string;
  category_name?: string;
}

export interface InvFixedAssetType {
  id: string;
  item_id: string;
  asset_tag: string;
  serial_number?: string;
  purchase_date?: string;
  purchase_cost?: number;
  current_value?: number;
  depreciation_method?: InvDepreciationMethod;
  depreciation_rate_pa?: number;
  useful_life_years?: number;
  assigned_to_staff_id?: string;
  location?: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
  item_name?: string;
  assigned_to_staff_name?: string;
}

export interface InvAssetDepreciationLogType {
    id: string;
    asset_id: string;
    depreciation_date: string;
    amount_depreciated: number;
    book_value_after: number;
}

export interface InvStockLevelType {
    compositeId: string; // item_id + warehouse_id
    item_id: string;
    warehouse_id: number;
    quantity: number;
    last_updated?: string;
    item_name?: string;
    warehouse_name?: string;
    category_name?: string;
}

export interface InvStockTransactionType {
    id: string;
    item_id: string;
    warehouse_id: number;
    transaction_type: InvStockTransactionType;
    quantity: number; // Can be negative for issues/returns
    source_table?: string; // e.g., 'purchase_orders', 'requisitions'
    source_id?: string;
    transaction_date?: string;
    notes?: string;
    item_name?: string;
    warehouse_name?: string;
}

export interface InvRequisitionItemType {
    id: string;
    requisition_id: string;
    item_id: string;
    quantity_requested: number;
    unit_price?: number;
    quantity_issued?: number;
    fulfillment_stock_transaction_id?: string;
    item_name?: string;
    line_total?: number;
}

export interface InvRequisitionType {
    id: string;
    requesting_staff_id: string;
    request_date: string;
    status: InvRequisitionStatusEnum;
    notes?: string;
    items?: InvRequisitionItemType[];
    created_at: string;
    updated_at: string;
    requesting_staff_name?: string;
    department_name?: string;
    total_requested_value?: number;
}

export interface InvPurchaseOrderItemType {
    id: string;
    purchase_order_id: string;
    item_id: string;
    quantity_ordered: number;
    unit_price: number;
    quantity_received?: number;
    item_name?: string;
    line_total?: number;
}

export interface InvPurchaseOrderType {
    id: string;
    supplier_id: number;
    order_date: string;
    expected_delivery_date?: string;
    status: InvPurchaseOrderStatusEnum;
    notes?: string;
    requisition_id?: string;
    items?: InvPurchaseOrderItemType[];
    created_at: string;
    updated_at: string;
    supplier_name?: string;
    total_value?: number;
}

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
  // Denormalized
  category_name?: string | null;
}

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
  // Denormalized
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
  // Denormalized
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
  // Denormalized
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
  // Denormalized
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
  // Denormalized
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
  // Denormalized
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
  // Denormalized
  supplier_name?: string | null;
  total_value?: number | null;
}
