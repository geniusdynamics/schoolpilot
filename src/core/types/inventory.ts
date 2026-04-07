// src/core/types/inventory.ts
// ABOUTME: Inventory-related types (assets, stock, requisitions, purchase orders, etc.)

import type {
  ItemTypeInv,
  DepreciationMethod,
  StockTransactionType,
  RequisitionStatus,
  PurchaseOrderStatus,
} from './enums';

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
