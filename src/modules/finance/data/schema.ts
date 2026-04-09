// ABOUTME: Defines database-agnostic schemas for entities specific to the Finance module.
// ABOUTME: These schemas are used by both RxDB and PouchDB services to create collections.

import * as types from './types';
import {
  createDatabaseSchema,
  SchemaHelpers,
  type DatabaseSchema,
} from '@/utils/databaseAgnosticSchema';

export const financialYearsSchema: DatabaseSchema = createDatabaseSchema({
  title: 'financial_years',
  primaryKey: 'id',
  properties: {
    id: SchemaHelpers.string({ maxLength: 100 }),
    name: SchemaHelpers.string({ maxLength: 100 }),
    start_date: SchemaHelpers.date(),
    end_date: SchemaHelpers.date(),
    status: SchemaHelpers.string({ enum: Object.values(types.FinancialYearStatus) }),
    created_at: SchemaHelpers.timestamp(),
    updated_at: SchemaHelpers.timestamp(),
  },
  required: ['id', 'name', 'start_date', 'end_date', 'status', 'created_at', 'updated_at'],
});

export const schoolPeriodSchema: DatabaseSchema = createDatabaseSchema({
    title: 'school_period',
    primaryKey: 'id',
    properties: {
        id: SchemaHelpers.string({ maxLength: 100 }),
        academic_year_id: SchemaHelpers.string({ maxLength: 100 }),
        period_definition_id: SchemaHelpers.string({ maxLength: 100 }),
        financial_year_id: SchemaHelpers.string({ maxLength: 100 }),
        start_date: SchemaHelpers.date(),
        end_date: SchemaHelpers.date(),
        is_active: SchemaHelpers.boolean(),
        mid_break_start: SchemaHelpers.date(),
        mid_break_end: SchemaHelpers.date(),
        name: SchemaHelpers.string({ maxLength: 100 }),
        academic_year_name: SchemaHelpers.string({ maxLength: 100 }),
        period_definition_name: SchemaHelpers.string({ maxLength: 100 }),
        financial_year_name: SchemaHelpers.string({ maxLength: 100 }),
        created_at: SchemaHelpers.timestamp(),
        updated_at: SchemaHelpers.timestamp(),
    },
    required: ['id', 'academic_year_id', 'period_definition_id', 'financial_year_id', 'start_date', 'end_date', 'is_active', 'created_at', 'updated_at'],
});


export const chartOfAccountsSchema: DatabaseSchema = createDatabaseSchema({
    title: 'chart_of_account',
    primaryKey: 'id',
    properties: {
        id: SchemaHelpers.string({ maxLength: 100 }),
        account_code: SchemaHelpers.string({ maxLength: 50 }),
        name: SchemaHelpers.string({ maxLength: 150 }),
        type: SchemaHelpers.string({ enum: Object.values(types.AccountType) }),
        template_type: SchemaHelpers.string({ enum: Object.values(types.AccountTemplateType) }),
        is_active: SchemaHelpers.boolean(),
        expense_category_id: SchemaHelpers.string({ maxLength: 100 }),
        created_at: SchemaHelpers.timestamp(),
        updated_at: SchemaHelpers.timestamp(),
        expense_category_name: SchemaHelpers.string({ maxLength: 100 }),
    },
    required: ['id', 'account_code', 'name', 'type', 'template_type', 'is_active', 'created_at', 'updated_at'],
});

export const expenseCategoriesSchema: DatabaseSchema = createDatabaseSchema({
    title: 'expense_category',
    primaryKey: 'id',
    properties: {
        id: SchemaHelpers.string({ maxLength: 100 }),
        name: SchemaHelpers.string({ maxLength: 100 }),
    },
    required: ['id', 'name'],
});

export const banksSchema: DatabaseSchema = createDatabaseSchema({
    title: 'bank',
    primaryKey: 'id',
    properties: {
        id: SchemaHelpers.string({ maxLength: 100 }),
        name: SchemaHelpers.string({ maxLength: 100 }),
        account_no: SchemaHelpers.string({ maxLength: 50 }),
        gl_account_id: SchemaHelpers.string({ maxLength: 100 }),
        created_at: SchemaHelpers.timestamp(),
        updated_at: SchemaHelpers.timestamp(),
        gl_account_name: SchemaHelpers.string({ maxLength: 200 }),
    },
    required: ['id', 'name', 'gl_account_id', 'created_at', 'updated_at'],
});

export const suppliersSchema: DatabaseSchema = createDatabaseSchema({
    title: 'supplier',
    primaryKey: 'id',
    properties: {
        id: SchemaHelpers.string({ maxLength: 100 }),
        name: SchemaHelpers.string({ maxLength: 200 }),
        phone: SchemaHelpers.string({ maxLength: 20 }),
        email: SchemaHelpers.string({ maxLength: 100, format: 'email' }),
        address: SchemaHelpers.string({ maxLength: 500 }),
        contact_person: SchemaHelpers.string({ maxLength: 200 }),
        kra_pin: SchemaHelpers.string({ maxLength: 20 }),
        contract_expiry_date: SchemaHelpers.date(),
        created_at: SchemaHelpers.timestamp(),
        updated_at: SchemaHelpers.timestamp(),
    },
    required: ['id', 'name', 'created_at', 'updated_at'],
});

export const feeTemplateItemProperties = {
    id: SchemaHelpers.string({ maxLength: 100 }),
    fee_template_id: SchemaHelpers.string({ maxLength: 100 }),
    description: SchemaHelpers.string({ maxLength: 500 }),
    amount: SchemaHelpers.number({ minimum: 0.01, maximum: 999999.99 }),
    revenue_account_id: SchemaHelpers.string({ maxLength: 100 }),
    linked_expense_category_id: SchemaHelpers.string({ maxLength: 100 }),
    linked_meal_plan_id: SchemaHelpers.string({ maxLength: 100 }),
    linked_transport_route_id: SchemaHelpers.string({ maxLength: 100 }),
    revenue_account_name: SchemaHelpers.string({ maxLength: 200 }),
    linked_expense_category_name: SchemaHelpers.string({ maxLength: 200 }),
};
export const feeTemplatesSchema: DatabaseSchema = createDatabaseSchema({
    title: 'fee_template',
    primaryKey: 'id',
    properties: {
        id: SchemaHelpers.string({ maxLength: 100 }),
        name: SchemaHelpers.string({ maxLength: 200 }),
        school_period_id: SchemaHelpers.string({ maxLength: 100 }),
        student_category_id: SchemaHelpers.string({ maxLength: 100 }),
        school_period_name: SchemaHelpers.string({ maxLength: 100 }),
        student_category_name: SchemaHelpers.string({ maxLength: 100 }),
        items: SchemaHelpers.array(SchemaHelpers.object(feeTemplateItemProperties)),
        created_at: SchemaHelpers.timestamp(),
        updated_at: SchemaHelpers.timestamp(),
    },
    required: ['id', 'name', 'school_period_id', 'created_at', 'updated_at'],
});
export const expenseClaimsSchema: DatabaseSchema = createDatabaseSchema({
    title: 'expense_claim',
    primaryKey: 'id',
    properties: {
        id: SchemaHelpers.string({ maxLength: 100 }),
        claimant_type: SchemaHelpers.string({ enum: Object.values(types.ExpenseClaimantType) }),
        claimant_id: SchemaHelpers.string({ maxLength: 100 }),
        claim_date: SchemaHelpers.date(),
        description: SchemaHelpers.string({ maxLength: 500 }),
        amount: SchemaHelpers.number({ minimum: 0.01, maximum: 999999.99 }),
        expense_category_id: SchemaHelpers.string({ maxLength: 100 }),
        workflow_state_id: SchemaHelpers.string({ maxLength: 100 }),
        workflow_status_name: SchemaHelpers.string({ maxLength: 100 }),
        approved_by: SchemaHelpers.string({ maxLength: 100 }),
        paid_date: SchemaHelpers.date(),
        payment_reference: SchemaHelpers.string({ maxLength: 100 }),
        claimant_name: SchemaHelpers.string({ maxLength: 200 }),
        expense_category_name: SchemaHelpers.string({ maxLength: 100 }),
        created_at: SchemaHelpers.timestamp(),
        updated_at: SchemaHelpers.timestamp(),
    },
    required: ['id', 'claimant_type', 'claimant_id', 'claim_date', 'description', 'amount', 'expense_category_id', 'created_at', 'updated_at'],
});
export const studentOpeningBalancesSchema: DatabaseSchema = createDatabaseSchema({
    title: 'student_opening_balance',
    primaryKey: 'id',
    properties: {
        id: SchemaHelpers.string({ maxLength: 100 }),
        student_id: SchemaHelpers.string({ maxLength: 100 }),
        balance_type: SchemaHelpers.string({ enum: Object.values(types.OpeningBalanceType) }),
        amount: SchemaHelpers.number({ minimum: -999999.99, maximum: 999999.99 }),
        as_of_date: SchemaHelpers.date(),
        is_billed: SchemaHelpers.boolean(),
        student_name: SchemaHelpers.string({ maxLength: 200 }),
        created_at: SchemaHelpers.timestamp(),
        updated_at: SchemaHelpers.timestamp(),
    },
    required: ['id', 'student_id', 'balance_type', 'amount', 'as_of_date', 'created_at', 'updated_at'],
});
export const feeAdjustmentsSchema: DatabaseSchema = createDatabaseSchema({
    title: 'fee_adjustment',
    primaryKey: 'id',
    properties: {
        id: SchemaHelpers.string({ maxLength: 100 }),
        student_id: SchemaHelpers.string({ maxLength: 100 }),
        school_period_id: SchemaHelpers.string({ maxLength: 100 }),
        adjustment_type: SchemaHelpers.string({ enum: Object.values(types.FeeAdjustmentType) }),
        amount: SchemaHelpers.number({ minimum: -999999.99, maximum: 999999.99 }),
        reason: SchemaHelpers.string({ maxLength: 500 }),
        applied_invoice_id: SchemaHelpers.string({ maxLength: 100 }),
        student_name: SchemaHelpers.string({ maxLength: 200 }),
        school_period_name: SchemaHelpers.string({ maxLength: 100 }),
        created_at: SchemaHelpers.timestamp(),
    },
    required: ['id', 'student_id', 'school_period_id', 'adjustment_type', 'amount'],
});
export const transportRoutesSchema: DatabaseSchema = createDatabaseSchema({
    title: 'transport_route',
    primaryKey: 'id',
    properties: {
        id: SchemaHelpers.string({ maxLength: 100 }),
        route_name: SchemaHelpers.string({ maxLength: 200 }),
        pickup_location: SchemaHelpers.string({ maxLength: 300 }),
        dropoff_location: SchemaHelpers.string({ maxLength: 300 }),
        monthly_fee: SchemaHelpers.number({ minimum: 0.01, maximum: 999999.99 }),
        is_active: SchemaHelpers.boolean(),
        created_at: SchemaHelpers.timestamp(),
        updated_at: SchemaHelpers.timestamp(),
    },
    required: ['id', 'route_name', 'pickup_location', 'dropoff_location', 'monthly_fee', 'is_active', 'created_at', 'updated_at'],
});
export const studentTransportAssignmentsSchema: DatabaseSchema = createDatabaseSchema({
    title: 'student_transport_assignment',
    primaryKey: 'id',
    properties: {
        id: SchemaHelpers.string({ maxLength: 100 }),
        student_id: SchemaHelpers.string({ maxLength: 100 }),
        route_id: SchemaHelpers.string({ maxLength: 100 }),
        school_period_id: SchemaHelpers.string({ maxLength: 100 }),
        status: SchemaHelpers.string({ enum: Object.values(types.TransportAssignmentStatus) }),
        invoice_id: SchemaHelpers.string({ maxLength: 100 }),
        cost_override: SchemaHelpers.number({ minimum: 0.01, maximum: 999999.99 }),
        student_name: SchemaHelpers.string({ maxLength: 200 }),
        route_name: SchemaHelpers.string({ maxLength: 200 }),
        school_period_name: SchemaHelpers.string({ maxLength: 100 }),
        created_at: SchemaHelpers.timestamp(),
        updated_at: SchemaHelpers.timestamp(),
    },
    required: ['id', 'student_id', 'route_id', 'school_period_id', 'status', 'created_at', 'updated_at'],
});
const studentInvoiceItemProperties = {
    id: SchemaHelpers.string({ maxLength: 100 }),
    invoice_id: SchemaHelpers.string({ maxLength: 100 }),
    description: SchemaHelpers.string({ maxLength: 500 }),
    amount: SchemaHelpers.number({ minimum: 0.01, maximum: 999999.99 }),
    fee_template_item_id: SchemaHelpers.string({ maxLength: 100 }),
    student_transport_assignment_id: SchemaHelpers.string({ maxLength: 100 }),
    fine_id: SchemaHelpers.string({ maxLength: 100 }),
};
export const studentInvoicesSchema: DatabaseSchema = createDatabaseSchema({
    title: 'student_invoice',
    primaryKey: 'id',
    properties: {
        id: SchemaHelpers.string({ maxLength: 100 }),
        student_id: SchemaHelpers.string({ maxLength: 100 }),
        invoice_number: SchemaHelpers.string({ maxLength: 50 }),
        school_period_id: SchemaHelpers.string({ maxLength: 100 }),
        issue_date: SchemaHelpers.date(),
        due_date: SchemaHelpers.date(),
        total_amount_billed: SchemaHelpers.number({ minimum: 0.01, maximum: 999999.99 }),
        amount_paid: SchemaHelpers.number({ minimum: 0.01, maximum: 999999.99 }),
        status: SchemaHelpers.string({ enum: Object.values(types.InvoiceStatus) }),
        items: SchemaHelpers.array(SchemaHelpers.object(studentInvoiceItemProperties)),
        student_name: SchemaHelpers.string({ maxLength: 200 }),
        school_period_name: SchemaHelpers.string({ maxLength: 100 }),
        deleted_at: SchemaHelpers.timestamp(),
        created_at: SchemaHelpers.timestamp(),
        updated_at: SchemaHelpers.timestamp(),
    },
    required: ['id', 'student_id', 'invoice_number', 'school_period_id', 'issue_date', 'status', 'created_at', 'updated_at'],
});
export const studentPaymentsSchema: DatabaseSchema = createDatabaseSchema({
    title: 'student_payment',
    primaryKey: 'id',
    properties: {
        id: SchemaHelpers.string({ maxLength: 100 }),
        student_id: SchemaHelpers.string({ maxLength: 100 }),
        receipt_no: SchemaHelpers.string({ maxLength: 50 }),
        total_amount_paid: SchemaHelpers.number({ minimum: 0.01, maximum: 999999.99 }),
        payment_method: SchemaHelpers.string({ maxLength: 50 }),
        transaction_date: SchemaHelpers.timestamp(),
        reference_no: SchemaHelpers.string({ maxLength: 100 }),
        notes: SchemaHelpers.string({ maxLength: 500 }),
        student_name: SchemaHelpers.string({ maxLength: 200 }),
        created_at: SchemaHelpers.timestamp(),
        updated_at: SchemaHelpers.timestamp(),
    },
    required: ['id', 'student_id', 'receipt_no', 'total_amount_paid', 'transaction_date', 'created_at', 'updated_at'],
});
export const invoicePaymentApplicationsSchema: DatabaseSchema = createDatabaseSchema({
    title: 'invoice_payment_application',
    primaryKey: 'id',
    properties: {
        id: SchemaHelpers.string({ maxLength: 100 }),
        payment_id: SchemaHelpers.string({ maxLength: 100 }),
        invoice_item_id: SchemaHelpers.string({ maxLength: 100 }),
        amount_applied: SchemaHelpers.number({ minimum: 0.01, maximum: 999999.99 }),
    },
    required: ['id', 'payment_id', 'invoice_item_id', 'amount_applied'],
});
const customerInvoiceItemProperties = {
    id: SchemaHelpers.string({ maxLength: 100 }),
    invoice_id: SchemaHelpers.string({ maxLength: 100 }),
    description: SchemaHelpers.string({ maxLength: 500 }),
    quantity: SchemaHelpers.number({ minimum: 1, maximum: 999999999 }),
    unit_price: SchemaHelpers.number({ minimum: 0.01, maximum: 999999.99 }),
    amount: SchemaHelpers.number({ minimum: 0.01, maximum: 999999.99 }),
    revenue_account_id: SchemaHelpers.string({ maxLength: 100 }),
    revenue_account_name: SchemaHelpers.string({ maxLength: 200 }),
};
export const customerInvoicesSchema: DatabaseSchema = createDatabaseSchema({
    title: 'customer_invoice',
    primaryKey: 'id',
    properties: {
        id: SchemaHelpers.string({ maxLength: 100 }),
        customer_id: SchemaHelpers.string({ maxLength: 100 }),
        invoice_number: SchemaHelpers.string({ maxLength: 50 }),
        issue_date: SchemaHelpers.date(),
        due_date: SchemaHelpers.date(),
        total_amount: SchemaHelpers.number({ minimum: 0.01, maximum: 999999.99 }),
        status: SchemaHelpers.string({ enum: Object.values(types.CustomerInvoiceStatus) }),
        notes: SchemaHelpers.string({ maxLength: 500 }),
        items: SchemaHelpers.array(SchemaHelpers.object(customerInvoiceItemProperties)),
        customer_name: SchemaHelpers.string({ maxLength: 200 }),
        created_at: SchemaHelpers.timestamp(),
        updated_at: SchemaHelpers.timestamp(),
    },
    required: ['id', 'customer_id', 'invoice_number', 'issue_date', 'status', 'created_at', 'updated_at']
});
export const supplierInvoicesSchema: DatabaseSchema = createDatabaseSchema({
    title: 'supplier_invoice',
    primaryKey: 'id',
    properties: {
        id: SchemaHelpers.string({ maxLength: 100 }),
        supplier_id: SchemaHelpers.string({ maxLength: 100 }),
        invoice_number: SchemaHelpers.string({ maxLength: 50 }),
        invoice_date: SchemaHelpers.date(),
        due_date: SchemaHelpers.date(),
        total_amount: SchemaHelpers.number({ minimum: 0.01, maximum: 999999.99 }),
        amount_paid: SchemaHelpers.number({ minimum: 0.01, maximum: 999999.99 }),
        status: SchemaHelpers.string({ enum: Object.values(types.SupplierInvoiceStatus) }),
        purchase_order_id: SchemaHelpers.string({ maxLength: 100 }),
        notes: SchemaHelpers.string({ maxLength: 500 }),
        supplier_name: SchemaHelpers.string({ maxLength: 200 }),
        created_at: SchemaHelpers.timestamp(),
        updated_at: SchemaHelpers.timestamp(),
    },
    required: ['id', 'supplier_id', 'invoice_number', 'invoice_date', 'total_amount', 'status', 'created_at', 'updated_at']
});
const generalPaymentItemProperties = {
    id: SchemaHelpers.string({ maxLength: 100 }),
    general_payment_id: SchemaHelpers.string({ maxLength: 100 }),
    description: SchemaHelpers.string({ maxLength: 500 }),
    amount: SchemaHelpers.number({ minimum: 0.01, maximum: 999999.99 }),
    revenue_account_id: SchemaHelpers.string({ maxLength: 100 }),
    revenue_account_name: SchemaHelpers.string({ maxLength: 200 }),
};
export const generalPaymentsSchema: DatabaseSchema = createDatabaseSchema({
    title: 'general_payment',
    primaryKey: 'id',
    properties: {
        id: SchemaHelpers.string({ maxLength: 100 }),
        payer_type: SchemaHelpers.string({ enum: Object.values(types.GeneralPayerType) }),
        payer_id: SchemaHelpers.string({ maxLength: 100 }),
        payer_name_external: SchemaHelpers.string({ maxLength: 200 }),
        payment_date: SchemaHelpers.timestamp(),
        total_amount_paid: SchemaHelpers.number({ minimum: 0.01, maximum: 999999.99 }),
        payment_method: SchemaHelpers.string({ maxLength: 50 }),
        reference_no: SchemaHelpers.string({ maxLength: 100 }),
        notes: SchemaHelpers.string({ maxLength: 500 }),
        items: SchemaHelpers.array(SchemaHelpers.object(generalPaymentItemProperties)),
        payer_name_resolved: SchemaHelpers.string({ maxLength: 200 }),
        created_at: SchemaHelpers.timestamp(),
        updated_at: SchemaHelpers.timestamp(),
    },
    required: ['id', 'payer_type', 'payment_date', 'total_amount_paid', 'created_at', 'updated_at']
});

export const generalLedgerEntriesSchema: DatabaseSchema = createDatabaseSchema({
    title: 'general_ledger_entry',
    primaryKey: 'id',
    properties: {
        id: SchemaHelpers.string({ maxLength: 100 }),
        transaction_date: SchemaHelpers.timestamp(),
        effective_date: SchemaHelpers.date(),
        financial_year_id: SchemaHelpers.string({ maxLength: 100 }),
        account_id: SchemaHelpers.string({ maxLength: 100 }),
        debit: SchemaHelpers.number({ minimum: 0.01, maximum: 999999.99 }),
        credit: SchemaHelpers.number({ minimum: 0.01, maximum: 999999.99 }),
        description: SchemaHelpers.string({ maxLength: 500 }),
        source_table: SchemaHelpers.string({ maxLength: 100 }),
        source_id: SchemaHelpers.string({ maxLength: 100 }),
    },
    required: ['id', 'transaction_date', 'effective_date', 'financial_year_id', 'account_id', 'description']
});
