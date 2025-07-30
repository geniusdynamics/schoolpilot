// ABOUTME: Defines RxDB JSON schemas for entities specific to the Inventory module.
// ABOUTME: These schemas are used by rxdbService.ts to create collections.

import { RxJsonSchema } from 'rxdb';
import * as types from './types';
import { createEntitySchema } from '../../../utils/schemaUtils';

export const warehouseSchema: RxJsonSchema<types.InvWarehouseType> = createEntitySchema<types.InvWarehouseType>(
    'warehouse',
    {
        id: { type: 'number', final: true },
        name: { type: 'string', maxLength: 100 },
        location: { type: ['string', 'null'] },
    },
    'id',
    ['id', 'name'],
    ['name']
);

export const itemCategoryInvSchema: RxJsonSchema<types.InvItemCategoryType> = createEntitySchema<types.InvItemCategoryType>(
    'item_category_inv',
    {
        id: { type: 'number', final: true },
        name: { type: 'string', maxLength: 100 },
    },
    'id',
    ['id', 'name'],
    ['name']
);

export const itemInvSchema: RxJsonSchema<types.InvItemType> = createEntitySchema<types.InvItemType>(
    'item_inv',
    {
        id: { type: 'string', maxLength: 100, final: true },
        name: { type: 'string', maxLength: 200 },
        description: { type: ['string', 'null'] },
        category_id: { type: ['number', 'null'], ref: 'item_categories_inv' },
        unit_of_measure: { type: 'string', maxLength: 50 },
        item_type: { type: 'string', enum: Object.values(types.InvItemTypeEnum) },
        current_price: { type: ['number', 'null'] },
        reorder_level: { type: ['number', 'null'] },
        reorder_point: { type: ['number', 'null'] },
        reorder_quantity: { type: ['number', 'null'] },
        max_stock_level: { type: ['number', 'null'] },
        barcode: { type: ['string', 'null'], maxLength: 100 },
        batch_tracking_enabled: { type: ['boolean', 'null'], default: false },
        expiry_tracking_enabled: { type: ['boolean', 'null'], default: false },
        created_at: { type: 'string', format: 'date-time' },
        updated_at: { type: 'string', format: 'date-time' },
        category_name: { type: ['string', 'null'] },
    },
    'id',
    ['id', 'name', 'item_type', 'created_at', 'updated_at'],
    ['name', 'category_id', 'item_type', 'barcode']
);

export const fixedAssetSchema: RxJsonSchema<types.InvFixedAssetType> = createEntitySchema<types.InvFixedAssetType>(
    'fixed_asset',
    {
        id: { type: 'string', maxLength: 100, final: true },
        item_id: { type: 'string', ref: 'items_inv' },
        asset_tag: { type: 'string', maxLength: 50, final: true },
        serial_number: { type: ['string', 'null'] },
        purchase_date: { type: ['string', 'null'], format: 'date' },
        purchase_cost: { type: ['number', 'null'] },
        current_value: { type: ['number', 'null'] },
        depreciation_method: { type: ['string', 'null'], enum: [...Object.values(types.InvDepreciationMethod), null] as any[] },
        depreciation_rate_pa: { type: ['number', 'null'] },
        useful_life_years: { type: ['number', 'null'] },
        assigned_to_staff_id: { type: ['string', 'null'], ref: 'staff' },
        location: { type: ['string', 'null'] },
        created_at: { type: 'string', format: 'date-time' },
        updated_at: { type: 'string', format: 'date-time' },
        deleted_at: { type: ['string', 'null'], format: 'date-time' },
        item_name: { type: ['string', 'null'] },
        assigned_to_staff_name: { type: ['string', 'null'] },
    },
    'id',
    ['id', 'item_id', 'asset_tag', 'created_at', 'updated_at'],
    ['asset_tag', 'item_id', 'assigned_to_staff_id']
);

export const assetDepreciationLogSchema: RxJsonSchema<types.InvAssetDepreciationLogType> = createEntitySchema<types.InvAssetDepreciationLogType>(
    'asset_depreciation_log',
    {
        id: { type: 'string', maxLength: 100, final: true },
        asset_id: { type: 'string', ref: 'fixed_assets' },
        depreciation_date: { type: 'string', format: 'date' },
        amount_depreciated: { type: 'number' },
        book_value_after: { type: 'number' },
    },
    'id',
    ['id', 'asset_id', 'depreciation_date', 'amount_depreciated', 'book_value_after'],
    ['asset_id']
);

export const stockLevelSchema: RxJsonSchema<types.InvStockLevelType> = createEntitySchema<types.InvStockLevelType>(
    'stock_level',
    {
        compositeId: { type: 'string', final: true, maxLength: 200 }, // PK
        item_id: { type: 'string', ref: 'items_inv' },
        warehouse_id: { type: 'number', ref: 'warehouses' },
        quantity: { type: 'number' },
        batch_number: { type: ['string', 'null'], maxLength: 100 },
        expiry_date: { type: ['string', 'null'], format: 'date' },
        last_updated: { type: ['string', 'null'], format: 'date-time' },
        item_name: { type: ['string', 'null'] },
        warehouse_name: { type: ['string', 'null'] },
        category_name: { type: ['string', 'null'] },
        reorder_level: { type: ['number', 'null'] },
        max_stock_level: { type: ['number', 'null'] },
    },
    'compositeId',
    ['compositeId', 'item_id', 'warehouse_id', 'quantity'],
    [['item_id', 'warehouse_id'], ['expiry_date'], ['batch_number']] // Enhanced indexes
);

export const stockTransactionSchema: RxJsonSchema<types.InvStockTransactionType> = createEntitySchema<types.InvStockTransactionType>(
    'stock_transaction',
    {
        id: { type: 'string', maxLength: 100, final: true },
        item_id: { type: 'string', ref: 'items_inv' },
        warehouse_id: { type: 'number', ref: 'warehouses' },
        transaction_type: { type: 'string', enum: Object.values(types.InvStockTransactionType) },
        quantity: { type: 'number' },
        batch_number: { type: ['string', 'null'], maxLength: 100 },
        expiry_date: { type: ['string', 'null'], format: 'date' },
        source_table: { type: ['string', 'null'] },
        source_id: { type: ['string', 'null'] },
        transaction_date: { type: ['string', 'null'], format: 'date-time' },
        notes: { type: ['string', 'null'] },
        item_name: { type: ['string', 'null'] },
        warehouse_name: { type: ['string', 'null'] },
    },
    'id',
    ['id', 'item_id', 'warehouse_id', 'transaction_type', 'quantity'],
    ['item_id', 'warehouse_id', 'transaction_date', 'batch_number']
);

const requisitionItemProperties: RxJsonSchema<types.InvRequisitionItemType>['properties'] = {
    id: { type: 'string', maxLength: 100, final: true },
    requisition_id: { type: 'string' }, // No ref here, nested
    item_id: { type: 'string', ref: 'items_inv' },
    quantity_requested: { type: 'number' },
    unit_price: { type: ['number', 'null'] },
    quantity_issued: { type: ['number', 'null'], default: 0 },
    fulfillment_stock_transaction_id: { type: ['string', 'null'] },
    item_name: { type: ['string', 'null'] },
    line_total: { type: ['number', 'null'] },
};
export const requisitionSchema: RxJsonSchema<types.InvRequisitionType> = createEntitySchema<types.InvRequisitionType>(
    'requisition',
    {
        id: { type: 'string', maxLength: 100, final: true },
        requesting_staff_id: { type: 'string', ref: 'staff' },
        request_date: { type: 'string', format: 'date' },
        status: { type: 'string', enum: Object.values(types.InvRequisitionStatusEnum) },
        notes: { type: ['string', 'null'] },
        created_at: { type: 'string', format: 'date-time' },
        updated_at: { type: 'string', format: 'date-time' },
        items: { type: ['array', 'null'], default: [], items: { type: 'object', properties: requisitionItemProperties } },
        requesting_staff_name: { type: ['string', 'null'] },
        department_name: { type: ['string', 'null'] },
        total_requested_value: { type: ['number', 'null'] },
    },
    'id',
    ['id', 'requesting_staff_id', 'request_date', 'status', 'created_at', 'updated_at'],
    ['requesting_staff_id', 'status', 'request_date']
);

const purchaseOrderItemProperties: RxJsonSchema<types.InvPurchaseOrderItemType>['properties'] = {
    id: { type: 'string', maxLength: 100, final: true },
    purchase_order_id: { type: 'string' }, // No ref here, nested
    item_id: { type: 'string', ref: 'items_inv' },
    quantity_ordered: { type: 'number' },
    unit_price: { type: 'number' },
    quantity_received: { type: ['number', 'null'], default: 0 },
    item_name: { type: ['string', 'null'] },
    line_total: { type: ['number', 'null'] },
};
export const purchaseOrderSchema: RxJsonSchema<types.InvPurchaseOrderType> = createEntitySchema<types.InvPurchaseOrderType>(
    'purchase_order',
    {
        id: { type: 'string', maxLength: 100, final: true },
        supplier_id: { type: 'number', ref: 'suppliers' }, 
        order_date: { type: 'string', format: 'date' },
        expected_delivery_date: { type: ['string', 'null'], format: 'date' },
        status: { type: 'string', enum: Object.values(types.InvPurchaseOrderStatusEnum) },
        notes: { type: ['string', 'null'] },
        requisition_id: { type: ['string', 'null'], ref: 'requisitions' },
        created_at: { type: 'string', format: 'date-time' },
        updated_at: { type: 'string', format: 'date-time' },
        items: { type: ['array', 'null'], default: [], items: { type: 'object', properties: purchaseOrderItemProperties } },
        supplier_name: { type: ['string', 'null'] },
        total_value: { type: ['number', 'null'] },
    },
    'id',
    ['id', 'supplier_id', 'order_date', 'status', 'created_at', 'updated_at'],
    ['supplier_id', 'status', 'order_date']
);

export const rfqSchema: RxJsonSchema<types.InvRFQType> = createEntitySchema<types.InvRFQType>(
    'rfq',
    {
        id: { type: 'string', maxLength: 100, final: true },
        title: { type: 'string', maxLength: 255 },
        description: { type: ['string', 'null'] },
        issue_date: { type: 'string', format: 'date' },
        closing_date: { type: 'string', format: 'date' },
        status: { type: 'string', enum: Object.values(types.InvRFQStatusEnum) },
        created_at: { type: 'string', format: 'date-time' },
        updated_at: { type: 'string', format: 'date-time' },
    },
    'id',
    ['id', 'title', 'issue_date', 'closing_date', 'status', 'created_at', 'updated_at'],
    ['status', 'closing_date']
);

export const supplierSchema: RxJsonSchema<types.InvSupplierType> = createEntitySchema<types.InvSupplierType>(
    'supplier',
    {
        id: { type: 'number', final: true },
        name: { type: 'string', maxLength: 200 },
        contact_person: { type: ['string', 'null'], maxLength: 100 },
        email: { type: ['string', 'null'], maxLength: 100 },
        phone: { type: ['string', 'null'], maxLength: 50 },
        address: { type: ['string', 'null'] },
        tax_id: { type: ['string', 'null'], maxLength: 50 },
        registration_number: { type: ['string', 'null'], maxLength: 50 },
        status: { type: 'string', enum: Object.values(types.InvSupplierStatusEnum) },
        payment_terms: { type: ['string', 'null'], maxLength: 100 },
        credit_limit: { type: ['number', 'null'] },
        performance_rating: { type: ['number', 'null'], minimum: 1, maximum: 5 },
        created_at: { type: 'string', format: 'date-time' },
        updated_at: { type: 'string', format: 'date-time' },
    },
    'id',
    ['id', 'name', 'status', 'created_at', 'updated_at'],
    ['name', 'status', 'email']
);

export const supplierContractSchema: RxJsonSchema<types.InvSupplierContractType> = createEntitySchema<types.InvSupplierContractType>(
    'supplier_contract',
    {
        id: { type: 'string', maxLength: 100, final: true },
        supplier_id: { type: 'number', ref: 'suppliers' },
        contract_number: { type: 'string', maxLength: 100 },
        title: { type: 'string', maxLength: 255 },
        description: { type: ['string', 'null'] },
        start_date: { type: 'string', format: 'date' },
        end_date: { type: 'string', format: 'date' },
        status: { type: 'string', enum: Object.values(types.InvContractStatusEnum) },
        contract_value: { type: ['number', 'null'] },
        renewal_notice_days: { type: ['number', 'null'] },
        created_at: { type: 'string', format: 'date-time' },
        updated_at: { type: 'string', format: 'date-time' },
        supplier_name: { type: ['string', 'null'] },
    },
    'id',
    ['id', 'supplier_id', 'contract_number', 'start_date', 'end_date', 'status', 'created_at', 'updated_at'],
    ['supplier_id', 'status', 'end_date', 'contract_number']
);

export const stockAlertSchema: RxJsonSchema<types.InvStockAlertType> = createEntitySchema<types.InvStockAlertType>(
    'stock_alert',
    {
        id: { type: 'string', maxLength: 100, final: true },
        item_id: { type: 'string', ref: 'items_inv' },
        warehouse_id: { type: 'number', ref: 'warehouses' },
        alert_type: { type: 'string', enum: ['LOW_STOCK', 'OVERSTOCK', 'EXPIRY_WARNING', 'EXPIRED'] },
        current_quantity: { type: 'number' },
        threshold_value: { type: ['number', 'null'] },
        expiry_date: { type: ['string', 'null'], format: 'date' },
        created_at: { type: 'string', format: 'date-time' },
        acknowledged_at: { type: ['string', 'null'], format: 'date-time' },
        acknowledged_by: { type: ['string', 'null'], ref: 'staff' },
        item_name: { type: ['string', 'null'] },
        warehouse_name: { type: ['string', 'null'] },
    },
    'id',
    ['id', 'item_id', 'warehouse_id', 'alert_type', 'created_at'],
    ['item_id', 'warehouse_id', 'alert_type', 'acknowledged_at']
);
