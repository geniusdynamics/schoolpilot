// ABOUTME: Defines RxDB JSON schemas for entities specific to the Inventory module.
// ABOUTME: These schemas are used by rxdbService.ts to create collections.

import { RxJsonSchema } from 'rxdb';
import * as types from './types';
import { createEntitySchema } from '../../../utils/schemaUtils';

export const warehouseSchema: RxJsonSchema<types.InvWarehouseType> = createEntitySchema<types.InvWarehouseType>(
    'warehouse',
    {
        id: { type: 'string', final: true },
        name: { type: 'string', maxLength: 100 },
        location: { type: ['string', 'null'], maxLength: 200 },
    },
    'id',
    ['id', 'name'],
    ['name']
);

export const itemCategoryInvSchema: RxJsonSchema<types.InvItemCategoryType> = createEntitySchema<types.InvItemCategoryType>(
    'item_category_inv',
    {
        id: { type: 'string', final: true },
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
        description: { type: ['string', 'null'], maxLength: 500 },
        category_id: { type: ['string', 'null'], ref: 'item_categories_inv' },
        unit_of_measure: { type: 'string', maxLength: 50 },
        item_type: { type: 'string', enum: Object.values(types.InvItemTypeEnum), maxLength: 50 },
        current_price: { type: ['number', 'null'], multipleOf: 0.01, minimum: 0, maximum: 999999.99 },
        reorder_level: { type: ['number', 'null'], multipleOf: 1, minimum: 0, maximum: 999999999 },
        reorder_point: { type: ['number', 'null'], multipleOf: 1, minimum: 0, maximum: 999999999 },
        reorder_quantity: { type: ['number', 'null'], multipleOf: 1, minimum: 0, maximum: 999999999 },
        max_stock_level: { type: ['number', 'null'], multipleOf: 1, minimum: 0, maximum: 999999999 },
        barcode: { type: ['string', 'null'], maxLength: 100 },
        batch_tracking_enabled: { type: ['boolean', 'null'], default: false },
        expiry_tracking_enabled: { type: ['boolean', 'null'], default: false },
        created_at: { type: 'string', format: 'date-time', maxLength: 50 },
        updated_at: { type: 'string', format: 'date-time', maxLength: 50 },
        category_name: { type: ['string', 'null'], maxLength: 100 },
    },
    'id',
    ['id', 'name', 'item_type', 'created_at', 'updated_at'],
    ['name', 'category_id', 'item_type', 'barcode']
);

export const fixedAssetSchema: RxJsonSchema<types.InvFixedAssetType> = createEntitySchema<types.InvFixedAssetType>(
    'fixed_asset',
    {
        id: { type: 'string', maxLength: 100, final: true },
        item_id: { type: 'string', ref: 'items_inv', maxLength: 100 },
        asset_tag: { type: 'string', maxLength: 50, final: true },
        serial_number: { type: ['string', 'null'], maxLength: 100 },
        purchase_date: { type: ['string', 'null'], format: 'date', maxLength: 20 },
        purchase_cost: { type: ['number', 'null'], multipleOf: 0.01, minimum: 0, maximum: 999999.99 },
        current_value: { type: ['number', 'null'], multipleOf: 0.01, minimum: 0, maximum: 999999.99 },
        depreciation_method: { type: ['string', 'null'], enum: [...Object.values(types.InvDepreciationMethod), null] as any[], maxLength: 50 },
        depreciation_rate_pa: { type: ['number', 'null'], multipleOf: 0.01, minimum: 0, maximum: 100 },
        useful_life_years: { type: ['number', 'null'], multipleOf: 1, minimum: 1, maximum: 100 },
        assigned_to_staff_id: { type: ['string', 'null'], ref: 'staff', maxLength: 100 },
        location: { type: ['string', 'null'], maxLength: 200 },
        created_at: { type: 'string', format: 'date-time', maxLength: 50 },
        updated_at: { type: 'string', format: 'date-time', maxLength: 50 },
        deleted_at: { type: ['string', 'null'], format: 'date-time', maxLength: 50 },
        item_name: { type: ['string', 'null'], maxLength: 200 },
        assigned_to_staff_name: { type: ['string', 'null'], maxLength: 200 },
    },
    'id',
    ['id', 'item_id', 'asset_tag', 'created_at', 'updated_at'],
    ['asset_tag', 'item_id', 'assigned_to_staff_id']
);

export const assetDepreciationLogSchema: RxJsonSchema<types.InvAssetDepreciationLogType> = createEntitySchema<types.InvAssetDepreciationLogType>(
    'asset_depreciation_log',
    {
        id: { type: 'string', maxLength: 100, final: true },
        asset_id: { type: 'string', ref: 'fixed_assets', maxLength: 100 },
        depreciation_date: { type: 'string', format: 'date', maxLength: 20 },
        amount_depreciated: { type: 'number', multipleOf: 0.01, minimum: 0, maximum: 999999.99 },
        book_value_after: { type: 'number', multipleOf: 0.01, minimum: 0, maximum: 999999.99 },
    },
    'id',
    ['id', 'asset_id', 'depreciation_date', 'amount_depreciated', 'book_value_after'],
    ['asset_id']
);

export const stockLevelSchema: RxJsonSchema<types.InvStockLevelType> = createEntitySchema<types.InvStockLevelType>(
    'stock_level',
    {
        compositeId: { type: 'string', final: true, maxLength: 200 }, // PK
        item_id: { type: 'string', ref: 'items_inv', maxLength: 100 },
        warehouse_id: { type: 'string', ref: 'warehouses' },
        quantity: { type: 'number', multipleOf: 1, minimum: 0, maximum: 999999999 },
        batch_number: { type: ['string', 'null'], maxLength: 100 },
        expiry_date: { type: ['string', 'null'], format: 'date', maxLength: 20 },
        last_updated: { type: ['string', 'null'], format: 'date-time', maxLength: 50 },
        item_name: { type: ['string', 'null'], maxLength: 200 },
        warehouse_name: { type: ['string', 'null'], maxLength: 100 },
        category_name: { type: ['string', 'null'], maxLength: 100 },
        reorder_level: { type: ['number', 'null'], multipleOf: 1, minimum: 0, maximum: 999999999 },
        max_stock_level: { type: ['number', 'null'], multipleOf: 1, minimum: 0, maximum: 999999999 },
    },
    'compositeId',
    ['compositeId', 'item_id', 'warehouse_id', 'quantity'],
    [['item_id', 'warehouse_id'], ['expiry_date'], ['batch_number']] // Enhanced indexes
);

export const stockTransactionSchema: RxJsonSchema<types.InvStockTransactionType> = createEntitySchema<types.InvStockTransactionType>(
    'stock_transaction',
    {
        id: { type: 'string', maxLength: 100, final: true },
        item_id: { type: 'string', ref: 'items_inv', maxLength: 100 },
        warehouse_id: { type: 'string', ref: 'warehouses' },
        transaction_type: { type: 'string', enum: Object.values(types.InvStockTransactionType), maxLength: 50 },
        quantity: { type: 'number', multipleOf: 1, minimum: -999999999, maximum: 999999999 },
        batch_number: { type: ['string', 'null'], maxLength: 100 },
        expiry_date: { type: ['string', 'null'], format: 'date', maxLength: 20 },
        source_table: { type: ['string', 'null'], maxLength: 100 },
        source_id: { type: ['string', 'null'], maxLength: 100 },
        transaction_date: { type: ['string', 'null'], format: 'date-time', maxLength: 50 },
        notes: { type: ['string', 'null'], maxLength: 500 },
        item_name: { type: ['string', 'null'], maxLength: 200 },
        warehouse_name: { type: ['string', 'null'], maxLength: 100 },
    },
    'id',
    ['id', 'item_id', 'warehouse_id', 'transaction_type', 'quantity'],
    ['item_id', 'warehouse_id', 'transaction_date', 'batch_number']
);

const requisitionItemProperties: RxJsonSchema<types.InvRequisitionItemType>['properties'] = {
    id: { type: 'string', maxLength: 100, final: true },
    requisition_id: { type: 'string', maxLength: 100 }, // No ref here, nested
    item_id: { type: 'string', ref: 'items_inv', maxLength: 100 },
    quantity_requested: { type: 'number', multipleOf: 1, minimum: 0, maximum: 999999999 },
    unit_price: { type: ['number', 'null'], multipleOf: 0.01, minimum: 0, maximum: 999999.99 },
    quantity_issued: { type: ['number', 'null'], multipleOf: 1, minimum: 0, maximum: 999999999, default: 0 },
    fulfillment_stock_transaction_id: { type: ['string', 'null'], maxLength: 100 },
    item_name: { type: ['string', 'null'], maxLength: 200 },
    line_total: { type: ['number', 'null'], multipleOf: 0.01, minimum: 0, maximum: 999999.99 },
};
export const requisitionSchema: RxJsonSchema<types.InvRequisitionType> = createEntitySchema<types.InvRequisitionType>(
    'requisition',
    {
        id: { type: 'string', maxLength: 100, final: true },
        requesting_staff_id: { type: 'string', ref: 'staff', maxLength: 100 },
        request_date: { type: 'string', format: 'date', maxLength: 20 },
        status: { type: 'string', enum: Object.values(types.InvRequisitionStatusEnum), maxLength: 50 },
        notes: { type: ['string', 'null'], maxLength: 500 },
        created_at: { type: 'string', format: 'date-time', maxLength: 50 },
        updated_at: { type: 'string', format: 'date-time', maxLength: 50 },
        items: { type: ['array', 'null'], default: [], items: { type: 'object', properties: requisitionItemProperties } },
        requesting_staff_name: { type: ['string', 'null'], maxLength: 200 },
        department_name: { type: ['string', 'null'], maxLength: 100 },
        total_requested_value: { type: ['number', 'null'], multipleOf: 0.01, minimum: 0, maximum: 999999.99 },
    },
    'id',
    ['id', 'requesting_staff_id', 'request_date', 'status', 'created_at', 'updated_at'],
    ['requesting_staff_id', 'status', 'request_date']
);

const purchaseOrderItemProperties: RxJsonSchema<types.InvPurchaseOrderItemType>['properties'] = {
    id: { type: 'string', maxLength: 100, final: true },
    purchase_order_id: { type: 'string', maxLength: 100 }, // No ref here, nested
    item_id: { type: 'string', ref: 'items_inv', maxLength: 100 },
    quantity_ordered: { type: 'number', multipleOf: 1, minimum: 0, maximum: 999999999 },
    unit_price: { type: 'number', multipleOf: 0.01, minimum: 0, maximum: 999999.99 },
    quantity_received: { type: ['number', 'null'], multipleOf: 1, minimum: 0, maximum: 999999999, default: 0 },
    item_name: { type: ['string', 'null'], maxLength: 200 },
    line_total: { type: ['number', 'null'], multipleOf: 0.01, minimum: 0, maximum: 999999.99 },
};
export const purchaseOrderSchema: RxJsonSchema<types.InvPurchaseOrderType> = createEntitySchema<types.InvPurchaseOrderType>(
    'purchase_order',
    {
        id: { type: 'string', maxLength: 100, final: true },
        supplier_id: { type: 'string', ref: 'suppliers' }, 
        order_date: { type: 'string', format: 'date', maxLength: 20 },
        expected_delivery_date: { type: ['string', 'null'], format: 'date', maxLength: 20 },
        status: { type: 'string', enum: Object.values(types.InvPurchaseOrderStatusEnum), maxLength: 50 },
        notes: { type: ['string', 'null'], maxLength: 500 },
        requisition_id: { type: ['string', 'null'], ref: 'requisitions', maxLength: 100 },
        created_at: { type: 'string', format: 'date-time', maxLength: 50 },
        updated_at: { type: 'string', format: 'date-time', maxLength: 50 },
        items: { type: ['array', 'null'], default: [], items: { type: 'object', properties: purchaseOrderItemProperties } },
        supplier_name: { type: ['string', 'null'], maxLength: 200 },
        total_value: { type: ['number', 'null'], multipleOf: 0.01, minimum: 0, maximum: 999999.99 },
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
        description: { type: ['string', 'null'], maxLength: 1000 },
        issue_date: { type: 'string', format: 'date', maxLength: 20 },
        closing_date: { type: 'string', format: 'date', maxLength: 20 },
        status: { type: 'string', enum: Object.values(types.InvRFQStatusEnum), maxLength: 50 },
        created_at: { type: 'string', format: 'date-time', maxLength: 50 },
        updated_at: { type: 'string', format: 'date-time', maxLength: 50 },
    },
    'id',
    ['id', 'title', 'issue_date', 'closing_date', 'status', 'created_at', 'updated_at'],
    ['status', 'closing_date']
);

export const supplierSchema: RxJsonSchema<types.InvSupplierType> = createEntitySchema<types.InvSupplierType>(
    'supplier',
    {
        id: { type: 'string', final: true },
        name: { type: 'string', maxLength: 200 },
        contact_person: { type: ['string', 'null'], maxLength: 100 },
        email: { type: ['string', 'null'], maxLength: 100 },
        phone: { type: ['string', 'null'], maxLength: 50 },
        address: { type: ['string', 'null'], maxLength: 500 },
        tax_id: { type: ['string', 'null'], maxLength: 50 },
        registration_number: { type: ['string', 'null'], maxLength: 50 },
        status: { type: 'string', enum: Object.values(types.InvSupplierStatusEnum), maxLength: 50 },
        payment_terms: { type: ['string', 'null'], maxLength: 100 },
        credit_limit: { type: ['number', 'null'], multipleOf: 0.01, minimum: 0, maximum: 999999.99 },
        performance_rating: { type: ['number', 'null'], multipleOf: 0.1, minimum: 1, maximum: 5 },
        created_at: { type: 'string', format: 'date-time', maxLength: 50 },
        updated_at: { type: 'string', format: 'date-time', maxLength: 50 },
    },
    'id',
    ['id', 'name', 'status', 'created_at', 'updated_at'],
    ['name', 'status', 'email']
);

export const supplierContractSchema: RxJsonSchema<types.InvSupplierContractType> = createEntitySchema<types.InvSupplierContractType>(
    'supplier_contract',
    {
        id: { type: 'string', maxLength: 100, final: true },
        supplier_id: { type: 'string', ref: 'suppliers' },
        contract_number: { type: 'string', maxLength: 100 },
        title: { type: 'string', maxLength: 255 },
        description: { type: ['string', 'null'], maxLength: 1000 },
        start_date: { type: 'string', format: 'date', maxLength: 20 },
        end_date: { type: 'string', format: 'date', maxLength: 20 },
        status: { type: 'string', enum: Object.values(types.InvContractStatusEnum), maxLength: 50 },
        contract_value: { type: ['number', 'null'], multipleOf: 0.01, minimum: 0, maximum: 999999.99 },
        renewal_notice_days: { type: ['number', 'null'], multipleOf: 1, minimum: 1, maximum: 365 },
        created_at: { type: 'string', format: 'date-time', maxLength: 50 },
        updated_at: { type: 'string', format: 'date-time', maxLength: 50 },
        supplier_name: { type: ['string', 'null'], maxLength: 200 },
    },
    'id',
    ['id', 'supplier_id', 'contract_number', 'start_date', 'end_date', 'status', 'created_at', 'updated_at'],
    ['supplier_id', 'status', 'end_date', 'contract_number']
);

export const stockAlertSchema: RxJsonSchema<types.InvStockAlertType> = createEntitySchema<types.InvStockAlertType>(
    'stock_alert',
    {
        id: { type: 'string', maxLength: 100, final: true },
        item_id: { type: 'string', ref: 'items_inv', maxLength: 100 },
        warehouse_id: { type: 'string', ref: 'warehouses' },
        alert_type: { type: 'string', enum: ['LOW_STOCK', 'OVERSTOCK', 'EXPIRY_WARNING', 'EXPIRED'], maxLength: 50 },
        current_quantity: { type: 'number', multipleOf: 1, minimum: 0, maximum: 999999999 },
        threshold_value: { type: ['number', 'null'], multipleOf: 1, minimum: 0, maximum: 999999999 },
        expiry_date: { type: ['string', 'null'], format: 'date', maxLength: 20 },
        created_at: { type: 'string', format: 'date-time', maxLength: 50 },
        acknowledged_at: { type: ['string', 'null'], format: 'date-time', maxLength: 50 },
        acknowledged_by: { type: ['string', 'null'], ref: 'staff', maxLength: 100 },
        item_name: { type: ['string', 'null'], maxLength: 200 },
        warehouse_name: { type: ['string', 'null'], maxLength: 100 },
    },
    'id',
    ['id', 'item_id', 'warehouse_id', 'alert_type', 'created_at'],
    ['item_id', 'warehouse_id', 'alert_type', 'acknowledged_at']
);
