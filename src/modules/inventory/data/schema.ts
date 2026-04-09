// ABOUTME: Defines database-agnostic schemas for entities specific to the Inventory module.
// ABOUTME: These schemas are used by database services to create collections.

import * as types from './types';
import { createDatabaseSchema, SchemaHelpers } from '@/utils/databaseAgnosticSchema';
import type { DatabaseSchema, DatabaseProperty } from '@/utils/databaseAgnosticSchema';

export const warehouseSchema: DatabaseSchema = createDatabaseSchema({
    name: 'warehouse',
    primaryKey: 'id',
    properties: {
        id: SchemaHelpers.id('Unique identifier for the warehouse'),
        name: SchemaHelpers.string('Warehouse name', { maxLength: 100 }),
        location: SchemaHelpers.string('Warehouse location', { maxLength: 200, nullable: true }),
        created_at: SchemaHelpers.timestamp('Record creation timestamp'),
        updated_at: SchemaHelpers.timestamp('Record last update timestamp')
    },
    required: ['id', 'name'],
    indexes: ['name']
});

export const itemCategoryInvSchema: DatabaseSchema = createDatabaseSchema({
    name: 'item_category_inv',
    primaryKey: 'id',
    properties: {
        id: SchemaHelpers.id('Unique identifier for the item category'),
        name: SchemaHelpers.string('Category name', { maxLength: 100 }),
        created_at: SchemaHelpers.timestamp('Record creation timestamp'),
        updated_at: SchemaHelpers.timestamp('Record last update timestamp')
    },
    required: ['id', 'name'],
    indexes: ['name']
});

export const itemInvSchema: DatabaseSchema = createDatabaseSchema({
    name: 'item_inv',
    primaryKey: 'id',
    properties: {
        id: SchemaHelpers.id('Unique identifier for the item'),
        name: SchemaHelpers.string('Item name', { maxLength: 200 }),
        description: SchemaHelpers.string('Item description', { maxLength: 500, nullable: true }),
        category_id: SchemaHelpers.string('Reference to item category', { maxLength: 100 }),
        unit_of_measure: SchemaHelpers.string('Unit of measure', { maxLength: 50 }),
        item_type: SchemaHelpers.string('Type of item', { maxLength: 50, enum: Object.values(types.ItemTypeInv) }),
        current_price: SchemaHelpers.number('Current price', { nullable: true, minimum: 0, maximum: 999999.99 }),
        reorder_level: SchemaHelpers.number('Reorder level', { nullable: true, minimum: 0, maximum: 999999999, integer: true }),
        reorder_point: SchemaHelpers.number('Reorder point', { nullable: true, minimum: 0, maximum: 999999999, integer: true }),
        reorder_quantity: SchemaHelpers.number('Reorder quantity', { nullable: true, minimum: 0, maximum: 999999999, integer: true }),
        max_stock_level: SchemaHelpers.number('Maximum stock level', { nullable: true, minimum: 0, maximum: 999999999, integer: true }),
        barcode: SchemaHelpers.string('Item barcode', { maxLength: 100 }),
        batch_tracking_enabled: SchemaHelpers.boolean('Whether batch tracking is enabled', { nullable: true, default: false }),
        expiry_tracking_enabled: SchemaHelpers.boolean('Whether expiry tracking is enabled', { nullable: true, default: false }),
        created_at: SchemaHelpers.timestamp('Record creation timestamp'),
        updated_at: SchemaHelpers.timestamp('Record last update timestamp'),
        category_name: SchemaHelpers.string('Category name (computed)', { maxLength: 100, nullable: true })
    },
    required: ['id', 'name', 'item_type', 'created_at', 'updated_at'],
    indexes: ['name', 'category_id', 'item_type', 'barcode']
});

export const fixedAssetSchema: DatabaseSchema = createDatabaseSchema({
    name: 'fixed_asset',
    primaryKey: 'id',
    properties: {
        id: SchemaHelpers.id('Unique identifier for the fixed asset'),
        item_id: SchemaHelpers.string('Reference to inventory item', { maxLength: 100 }),
        asset_tag: SchemaHelpers.string('Asset tag identifier', { maxLength: 50 }),
        serial_number: SchemaHelpers.string('Serial number', { maxLength: 100, nullable: true }),
        purchase_date: SchemaHelpers.string('Purchase date', { nullable: true, format: 'date' }),
        purchase_cost: SchemaHelpers.number('Purchase cost', { nullable: true, minimum: 0, maximum: 999999.99 }),
        current_value: SchemaHelpers.number('Current value', { nullable: true, minimum: 0, maximum: 999999.99 }),
        depreciation_method: SchemaHelpers.string('Depreciation method', { maxLength: 50, nullable: true, enum: Object.values(types.DepreciationMethod) }),
        depreciation_rate_pa: SchemaHelpers.number('Depreciation rate per annum', { nullable: true, minimum: 0, maximum: 100 }),
        useful_life_years: SchemaHelpers.number('Useful life in years', { nullable: true, minimum: 1, maximum: 100, integer: true }),
        assigned_to_staff_id: SchemaHelpers.string('Staff member assigned to', { maxLength: 100 }),
        location: SchemaHelpers.string('Asset location', { maxLength: 200, nullable: true }),
        created_at: SchemaHelpers.timestamp('Record creation timestamp'),
        updated_at: SchemaHelpers.timestamp('Record last update timestamp'),
        deleted_at: SchemaHelpers.timestamp('Record deletion timestamp', { nullable: true }),
        item_name: SchemaHelpers.string('Item name (computed)', { maxLength: 200, nullable: true }),
        assigned_to_staff_name: SchemaHelpers.string('Assigned staff name (computed)', { maxLength: 200, nullable: true })
    },
    required: ['id', 'item_id', 'asset_tag', 'created_at', 'updated_at'],
    indexes: ['asset_tag', 'item_id', 'assigned_to_staff_id']
});

export const assetDepreciationLogSchema: DatabaseSchema = createDatabaseSchema({
    name: 'asset_depreciation_log',
    primaryKey: 'id',
    properties: {
        id: SchemaHelpers.id('Unique identifier for the depreciation log entry'),
        asset_id: SchemaHelpers.string('Reference to fixed asset', { maxLength: 100 }),
        depreciation_date: SchemaHelpers.string('Date of depreciation', { format: 'date' }),
        amount_depreciated: SchemaHelpers.number('Amount depreciated', { minimum: 0, maximum: 999999.99 }),
        book_value_after: SchemaHelpers.number('Book value after depreciation', { minimum: 0, maximum: 999999.99 })
    },
    required: ['id', 'asset_id', 'depreciation_date', 'amount_depreciated', 'book_value_after'],
    indexes: ['asset_id']
});

export const stockLevelSchema: DatabaseSchema = createDatabaseSchema({
    name: 'stock_level',
    primaryKey: 'compositeId',
    properties: {
        compositeId: SchemaHelpers.id('Composite primary key for stock level'),
        item_id: SchemaHelpers.string('Reference to inventory item', { maxLength: 100 }),
        warehouse_id: SchemaHelpers.string('Reference to warehouse', { maxLength: 100 }),
        quantity: SchemaHelpers.number('Current stock quantity', { minimum: 0, maximum: 999999999, integer: true }),
        batch_number: SchemaHelpers.string('Batch number', { maxLength: 100 }),
        expiry_date: SchemaHelpers.string('Expiry date', { format: 'date' }),
        last_updated: SchemaHelpers.timestamp('Last update timestamp', { nullable: true }),
        item_name: SchemaHelpers.string('Item name (computed)', { maxLength: 200, nullable: true }),
        warehouse_name: SchemaHelpers.string('Warehouse name (computed)', { maxLength: 100, nullable: true }),
        category_name: SchemaHelpers.string('Category name (computed)', { maxLength: 100, nullable: true }),
        reorder_level: SchemaHelpers.number('Reorder level (computed)', { nullable: true, minimum: 0, maximum: 999999999, integer: true }),
        max_stock_level: SchemaHelpers.number('Maximum stock level (computed)', { nullable: true, minimum: 0, maximum: 999999999, integer: true })
    },
    required: ['compositeId', 'item_id', 'warehouse_id', 'quantity'],
    indexes: [['item_id', 'warehouse_id'], ['expiry_date'], ['batch_number']]
});

export const stockTransactionSchema: DatabaseSchema = createDatabaseSchema({
    name: 'stock_transaction',
    primaryKey: 'id',
    properties: {
        id: SchemaHelpers.id('Unique identifier for the stock transaction'),
        item_id: SchemaHelpers.string('Reference to inventory item', { maxLength: 100 }),
        warehouse_id: SchemaHelpers.string('Reference to warehouse', { maxLength: 100 }),
        transaction_type: SchemaHelpers.string('Type of transaction', { maxLength: 50, enum: Object.values(types.StockTransactionType) }),
        quantity: SchemaHelpers.number('Transaction quantity', { minimum: -999999999, maximum: 999999999, integer: true }),
        batch_number: SchemaHelpers.string('Batch number', { maxLength: 100 }),
        expiry_date: SchemaHelpers.string('Expiry date', { format: 'date' }),
        source_table: SchemaHelpers.string('Source table reference', { maxLength: 100, nullable: true }),
        source_id: SchemaHelpers.string('Source record ID', { maxLength: 100, nullable: true }),
        transaction_date: SchemaHelpers.timestamp('Transaction date and time'),
        notes: SchemaHelpers.string('Transaction notes', { maxLength: 500, nullable: true }),
        item_name: SchemaHelpers.string('Item name (computed)', { maxLength: 200, nullable: true }),
        warehouse_name: SchemaHelpers.string('Warehouse name (computed)', { maxLength: 100, nullable: true })
    },
    required: ['id', 'item_id', 'warehouse_id', 'transaction_type', 'quantity'],
    indexes: ['item_id', 'warehouse_id', 'transaction_date', 'batch_number']
});

const requisitionItemProperties: Record<string, DatabaseProperty> = {
    id: SchemaHelpers.id('Unique identifier for the requisition item'),
    requisition_id: SchemaHelpers.string('Reference to requisition', { maxLength: 100 }),
    item_id: SchemaHelpers.string('Reference to inventory item', { maxLength: 100 }),
    quantity_requested: SchemaHelpers.number('Quantity requested', { minimum: 0, maximum: 999999999, integer: true }),
    unit_price: SchemaHelpers.number('Unit price', { nullable: true, minimum: 0, maximum: 999999.99 }),
    quantity_issued: SchemaHelpers.number('Quantity issued', { nullable: true, minimum: 0, maximum: 999999999, integer: true, default: 0 }),
    fulfillment_stock_transaction_id: SchemaHelpers.string('Fulfillment transaction ID', { maxLength: 100, nullable: true }),
    item_name: SchemaHelpers.string('Item name (computed)', { maxLength: 200, nullable: true }),
    line_total: SchemaHelpers.number('Line total (computed)', { nullable: true, minimum: 0, maximum: 999999.99 })
};
export const requisitionSchema: DatabaseSchema = createDatabaseSchema({
    name: 'requisition',
    primaryKey: 'id',
    properties: {
        id: SchemaHelpers.id('Unique identifier for the requisition'),
        requesting_staff_id: SchemaHelpers.string('Reference to requesting staff', { maxLength: 100 }),
        request_date: SchemaHelpers.string('Request date', { format: 'date' }),
        status: SchemaHelpers.string('Requisition status', { maxLength: 50, enum: Object.values(types.RequisitionStatus) }),
        notes: SchemaHelpers.string('Requisition notes', { maxLength: 500, nullable: true }),
        created_at: SchemaHelpers.timestamp('Record creation timestamp'),
        updated_at: SchemaHelpers.timestamp('Record last update timestamp'),
        items: SchemaHelpers.array('Requisition items', { nullable: true, default: [], items: SchemaHelpers.object('Requisition item', { properties: requisitionItemProperties }) }),
        requesting_staff_name: SchemaHelpers.string('Requesting staff name (computed)', { maxLength: 200, nullable: true }),
        department_name: SchemaHelpers.string('Department name (computed)', { maxLength: 100, nullable: true }),
        total_requested_value: SchemaHelpers.number('Total requested value (computed)', { nullable: true, minimum: 0, maximum: 999999.99 })
    },
    required: ['id', 'requesting_staff_id', 'request_date', 'status', 'created_at', 'updated_at'],
    indexes: ['requesting_staff_id', 'status', 'request_date']
});

const purchaseOrderItemProperties: Record<string, DatabaseProperty> = {
    id: SchemaHelpers.id('Unique identifier for the purchase order item'),
    purchase_order_id: SchemaHelpers.string('Reference to purchase order', { maxLength: 100 }),
    item_id: SchemaHelpers.string('Reference to inventory item', { maxLength: 100 }),
    quantity_ordered: SchemaHelpers.number('Quantity ordered', { minimum: 0, maximum: 999999999, integer: true }),
    unit_price: SchemaHelpers.number('Unit price', { minimum: 0, maximum: 999999.99 }),
    quantity_received: SchemaHelpers.number('Quantity received', { nullable: true, minimum: 0, maximum: 999999999, integer: true, default: 0 }),
    item_name: SchemaHelpers.string('Item name (computed)', { maxLength: 200, nullable: true }),
    line_total: SchemaHelpers.number('Line total (computed)', { nullable: true, minimum: 0, maximum: 999999.99 })
};
export const purchaseOrderSchema: DatabaseSchema = createDatabaseSchema({
    name: 'purchase_order',
    primaryKey: 'id',
    properties: {
        id: SchemaHelpers.id('Unique identifier for the purchase order'),
        supplier_id: SchemaHelpers.string('Reference to supplier', { maxLength: 100 }),
        order_date: SchemaHelpers.string('Order date', { format: 'date' }),
        expected_delivery_date: SchemaHelpers.string('Expected delivery date', { nullable: true, format: 'date' }),
        status: SchemaHelpers.string('Purchase order status', { maxLength: 50, enum: Object.values(types.PurchaseOrderStatus) }),
        notes: SchemaHelpers.string('Purchase order notes', { maxLength: 500, nullable: true }),
        requisition_id: SchemaHelpers.string('Reference to requisition', { maxLength: 100, nullable: true }),
        created_at: SchemaHelpers.timestamp('Record creation timestamp'),
        updated_at: SchemaHelpers.timestamp('Record last update timestamp'),
        items: SchemaHelpers.array('Purchase order items', { nullable: true, default: [], items: SchemaHelpers.object('Purchase order item', { properties: purchaseOrderItemProperties }) }),
        supplier_name: SchemaHelpers.string('Supplier name (computed)', { maxLength: 200, nullable: true }),
        total_value: SchemaHelpers.number('Total value (computed)', { nullable: true, minimum: 0, maximum: 999999.99 })
    },
    required: ['id', 'supplier_id', 'order_date', 'status', 'created_at', 'updated_at'],
    indexes: ['supplier_id', 'status', 'order_date']
});

export const rfqSchema: DatabaseSchema = createDatabaseSchema({
    name: 'rfq',
    primaryKey: 'id',
    properties: {
        id: SchemaHelpers.id('Unique identifier for the RFQ'),
        title: SchemaHelpers.string('RFQ title', { maxLength: 255 }),
        description: SchemaHelpers.string('RFQ description', { maxLength: 1000, nullable: true }),
        issue_date: SchemaHelpers.string('Issue date', { format: 'date' }),
        closing_date: SchemaHelpers.string('Closing date', { format: 'date' }),
        status: SchemaHelpers.string('RFQ status', { maxLength: 50, enum: Object.values(types.InvRFQStatusEnum) }),
        created_at: SchemaHelpers.timestamp('Record creation timestamp'),
        updated_at: SchemaHelpers.timestamp('Record last update timestamp')
    },
    required: ['id', 'title', 'issue_date', 'closing_date', 'status', 'created_at', 'updated_at'],
    indexes: ['status', 'closing_date']
});

export const supplierSchema: DatabaseSchema = createDatabaseSchema({
    name: 'supplier',
    primaryKey: 'id',
    properties: {
        id: SchemaHelpers.id('Unique identifier for the supplier'),
        name: SchemaHelpers.string('Supplier name', { maxLength: 200 }),
        contact_person: SchemaHelpers.string('Contact person', { maxLength: 100, nullable: true }),
        email: SchemaHelpers.string('Email address', { maxLength: 100, nullable: true }),
        phone: SchemaHelpers.string('Phone number', { maxLength: 50, nullable: true }),
        address: SchemaHelpers.string('Address', { maxLength: 500, nullable: true }),
        tax_id: SchemaHelpers.string('Tax ID', { maxLength: 50, nullable: true }),
        registration_number: SchemaHelpers.string('Registration number', { maxLength: 50, nullable: true }),
        status: SchemaHelpers.string('Supplier status', { maxLength: 50, enum: Object.values(types.InvSupplierStatusEnum) }),
        payment_terms: SchemaHelpers.string('Payment terms', { maxLength: 100, nullable: true }),
        credit_limit: SchemaHelpers.number('Credit limit', { nullable: true, minimum: 0, maximum: 999999.99 }),
        performance_rating: SchemaHelpers.number('Performance rating', { nullable: true, minimum: 1, maximum: 5 }),
        created_at: SchemaHelpers.timestamp('Record creation timestamp'),
        updated_at: SchemaHelpers.timestamp('Record last update timestamp')
    },
    required: ['id', 'name', 'status', 'created_at', 'updated_at'],
    indexes: ['name', 'status', 'email']
});

export const supplierContractSchema: DatabaseSchema = createDatabaseSchema({
    name: 'supplier_contract',
    primaryKey: 'id',
    properties: {
        id: SchemaHelpers.id('Unique identifier for the supplier contract'),
        supplier_id: SchemaHelpers.string('Reference to supplier', { maxLength: 100 }),
        contract_number: SchemaHelpers.string('Contract number', { maxLength: 100 }),
        title: SchemaHelpers.string('Contract title', { maxLength: 255 }),
        description: SchemaHelpers.string('Contract description', { maxLength: 1000, nullable: true }),
        start_date: SchemaHelpers.string('Start date', { format: 'date' }),
        end_date: SchemaHelpers.string('End date', { format: 'date' }),
        status: SchemaHelpers.string('Contract status', { maxLength: 50, enum: Object.values(types.InvContractStatusEnum) }),
        contract_value: SchemaHelpers.number('Contract value', { nullable: true, minimum: 0, maximum: 999999.99 }),
        renewal_notice_days: SchemaHelpers.number('Renewal notice days', { nullable: true, minimum: 1, maximum: 365, integer: true }),
        created_at: SchemaHelpers.timestamp('Record creation timestamp'),
        updated_at: SchemaHelpers.timestamp('Record last update timestamp'),
        supplier_name: SchemaHelpers.string('Supplier name (computed)', { maxLength: 200, nullable: true })
    },
    required: ['id', 'supplier_id', 'contract_number', 'start_date', 'end_date', 'status', 'created_at', 'updated_at'],
    indexes: ['supplier_id', 'status', 'end_date', 'contract_number']
});

export const stockAlertSchema: DatabaseSchema = createDatabaseSchema({
    name: 'stock_alert',
    primaryKey: 'id',
    properties: {
        id: SchemaHelpers.id('Unique identifier for the stock alert'),
        item_id: SchemaHelpers.string('Reference to inventory item', { maxLength: 100 }),
        warehouse_id: SchemaHelpers.string('Reference to warehouse', { maxLength: 100 }),
        alert_type: SchemaHelpers.string('Type of alert', { maxLength: 50, enum: ['LOW_STOCK', 'OVERSTOCK', 'EXPIRY_WARNING', 'EXPIRED'] }),
        current_quantity: SchemaHelpers.number('Current quantity', { minimum: 0, maximum: 999999999, integer: true }),
        threshold_value: SchemaHelpers.number('Threshold value', { nullable: true, minimum: 0, maximum: 999999999, integer: true }),
        expiry_date: SchemaHelpers.string('Expiry date', { nullable: true, format: 'date' }),
        created_at: SchemaHelpers.timestamp('Record creation timestamp'),
        acknowledged_at: SchemaHelpers.timestamp('Acknowledgment timestamp'),
        acknowledged_by: SchemaHelpers.string('Acknowledged by staff member', { maxLength: 100, nullable: true }),
        item_name: SchemaHelpers.string('Item name (computed)', { maxLength: 200, nullable: true }),
        warehouse_name: SchemaHelpers.string('Warehouse name (computed)', { maxLength: 100, nullable: true })
    },
    required: ['id', 'item_id', 'warehouse_id', 'alert_type', 'created_at'],
    indexes: ['item_id', 'warehouse_id', 'alert_type', 'acknowledged_at']
});
