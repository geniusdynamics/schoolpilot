// ABOUTME: This file defines TypeScript interfaces, enums, and type aliases for the Inventory module.
// ABOUTME: It ensures all inventory-related data structures are managed in one place.

import { Warehouse, StockTransaction, StockLevel, RequisitionItem, Requisition, PurchaseOrderItem, PurchaseOrder, ItemCategoryInv, ItemInv, FixedAsset, AssetDepreciationLog } from '../../core/types';

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
    payment_terms?: string; // e.g., "Net 30", "COD"
    credit_limit?: number;
    performance_rating?: number; // 1-5 scale
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
    renewal_notice_days?: number; // Days before expiry to send renewal alert
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
  reorder_point?: number; // Added for automated reorder alerts - triggers when stock falls below this level
  reorder_quantity?: number; // Added for automated reorder alerts - suggested quantity to reorder
  max_stock_level?: number; // Added for automated reorder alerts
  barcode?: string; // Added for barcode/QR code integration
  batch_tracking_enabled?: boolean; // Added for batch/lot tracking
  expiry_tracking_enabled?: boolean; // Added for expiry date management
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
    compositeId: string; // item_id + warehouse_id + batch_number (if applicable)
    item_id: string;
    warehouse_id: number;
    quantity: number;
    batch_number?: string; // Added for batch/lot tracking
    expiry_date?: string; // Added for expiry date management
    last_updated?: string;
    item_name?: string;
    warehouse_name?: string;
    category_name?: string;
    reorder_level?: number; // Denormalized from item for quick access
    max_stock_level?: number; // Denormalized from item for quick access
}

export interface InvStockTransactionType {
    id: string;
    item_id: string;
    warehouse_id: number;
    transaction_type: InvStockTransactionType;
    quantity: number; // Can be negative for issues/returns
    batch_number?: string; // Added for batch/lot tracking
    expiry_date?: string; // Added for expiry date management
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
    received_quantity?: number; // Added for partial delivery tracking
    batch_number?: string; // Added for batch/lot tracking
    expiry_date?: string; // Added for expiry date management
    warehouse_id?: number; // Added for direct warehouse assignment
    item_name?: string;
    warehouse_name?: string;
    line_total?: number;
}

export interface InvPurchaseOrderType {
    id: string;
    po_number: string;
    supplier_id?: number; // Added for supplier relationship
    vendor_name: string;
    order_date: string;
    expected_delivery_date?: string;
    actual_delivery_date?: string; // Added for delivery tracking
    status: InvPurchaseOrderStatusEnum;
    total_amount?: number;
    tax_amount?: number; // Added for tax tracking
    shipping_cost?: number; // Added for shipping cost tracking
    discount_amount?: number; // Added for discount tracking
    notes?: string;
    requisition_id?: string;
    items?: InvPurchaseOrderItemType[];
    created_at: string;
    updated_at: string;
    supplier_name?: string; // Denormalized for quick access
    total_value?: number;
}

// Note: Warehouse interface is now imported from core/types to avoid conflicts

// ItemCategoryInv interface is now imported from core/types to avoid conflicts

// ItemInv interface is now imported from core/types to avoid conflicts

// FixedAsset interface is now imported from core/types to avoid conflicts

// AssetDepreciationLog interface is now imported from core/types to avoid conflicts

// StockLevel interface is now imported from core/types to avoid conflicts

// Note: StockTransaction interface is now imported from core/types to avoid conflicts

// RequisitionItem interface is now imported from core/types to avoid conflicts

// Requisition interface is now imported from core/types to avoid conflicts

// PurchaseOrderItem interface is now imported from core/types to avoid conflicts

// PurchaseOrder interface is now imported from core/types to avoid conflicts
