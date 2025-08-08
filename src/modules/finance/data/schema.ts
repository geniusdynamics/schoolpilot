// ABOUTME: Defines database-agnostic schemas for entities specific to the Finance module.
// ABOUTME: These schemas are used by database services to create collections.

import { createDatabaseSchema, DatabaseSchema, SchemaHelpers } from '../../../utils/databaseAgnosticSchema';
import * as FinTypes from './types'; // Use alias to avoid conflict
import { SchoolPeriod } from '../../../types'; // Import SchoolPeriod from core types

export const financialYearSchema: DatabaseSchema<FinTypes.FinFinancialYearType> = createDatabaseSchema<FinTypes.FinFinancialYearType>(
    'financial_year',
    {
        id: SchemaHelpers.stringField(100),
        name: SchemaHelpers.stringField(100),
        start_date: SchemaHelpers.dateField(),
        end_date: SchemaHelpers.dateField(),
        status: SchemaHelpers.enumField(Object.values(FinTypes.FinFinancialYearStatusEnum)),
        created_at: SchemaHelpers.dateTimeField(),
        updated_at: SchemaHelpers.dateTimeField(),
    },
    'id',
    ['id', 'name', 'start_date', 'end_date', 'status', 'created_at', 'updated_at']
);

export const schoolPeriodSchema: DatabaseSchema<SchoolPeriod> = createDatabaseSchema<SchoolPeriod>(
    'school_period',
    {
        id: SchemaHelpers.stringField(100),
        academic_year_id: SchemaHelpers.stringField(100),
        period_definition_id: SchemaHelpers.stringField(100),
        financial_year_id: SchemaHelpers.stringField(100),
        start_date: SchemaHelpers.dateField(),
        end_date: SchemaHelpers.dateField(),
        is_active: SchemaHelpers.booleanField(),
        mid_break_start: SchemaHelpers.optionalDateField(),
        mid_break_end: SchemaHelpers.optionalDateField(),
        name: SchemaHelpers.optionalStringField(100),
        academic_year_name: SchemaHelpers.optionalStringField(100),
        period_definition_name: SchemaHelpers.optionalStringField(100),
        financial_year_name: SchemaHelpers.optionalStringField(100),
        created_at: SchemaHelpers.dateTimeField(),
        updated_at: SchemaHelpers.dateTimeField(),
    },
    'id',
    ['id', 'academic_year_id', 'period_definition_id', 'financial_year_id', 'start_date', 'end_date', 'is_active', 'created_at', 'updated_at']
);


export const chartOfAccountsSchema: DatabaseSchema<FinTypes.FinChartOfAccountType> = createDatabaseSchema<FinTypes.FinChartOfAccountType>(
    'chart_of_account',
    {
        id: SchemaHelpers.stringField(100),
        account_code: SchemaHelpers.stringField(50),
        name: SchemaHelpers.stringField(150),
        type: SchemaHelpers.enumField(Object.values(FinTypes.FinAccountTypeEnum)),
        template_type: SchemaHelpers.enumField(Object.values(FinTypes.FinAccountTemplateTypeEnum)),
        is_active: SchemaHelpers.booleanField(),
        expense_category_id: SchemaHelpers.optionalStringField(100),
        created_at: SchemaHelpers.dateTimeField(),
        updated_at: SchemaHelpers.dateTimeField(),
        expense_category_name: SchemaHelpers.optionalStringField(100),
    },
    'id',
    ['id', 'account_code', 'name', 'type', 'template_type', 'is_active', 'created_at', 'updated_at']
);

export const expenseCategoriesSchema: DatabaseSchema<FinTypes.FinExpenseCategoryType> = createDatabaseSchema<FinTypes.FinExpenseCategoryType>(
    'expense_category',
    {
        id: SchemaHelpers.stringField(100),
        name: SchemaHelpers.stringField(100),
    },
    'id',
    ['id', 'name']
);

export const banksSchema: DatabaseSchema<FinTypes.FinBankType> = createDatabaseSchema<FinTypes.FinBankType>(
    'bank',
    {
        id: SchemaHelpers.stringField(100),
        name: SchemaHelpers.stringField(100),
        account_no: SchemaHelpers.optionalStringField(50),
        gl_account_id: SchemaHelpers.stringField(100),
        created_at: SchemaHelpers.dateTimeField(),
        updated_at: SchemaHelpers.dateTimeField(),
        gl_account_name: SchemaHelpers.optionalStringField(200),
    },
    'id',
    ['id', 'name', 'gl_account_id', 'created_at', 'updated_at']
);

export const suppliersSchema: DatabaseSchema<FinTypes.FinSupplierType> = createDatabaseSchema<FinTypes.FinSupplierType>(
    'supplier',
    {
        id: SchemaHelpers.stringField(100),
        name: SchemaHelpers.stringField(200),
        phone: SchemaHelpers.optionalStringField(20),
        email: SchemaHelpers.optionalEmailField(100),
        address: SchemaHelpers.optionalStringField(500),
        contact_person: SchemaHelpers.optionalStringField(200),
        kra_pin: SchemaHelpers.optionalStringField(20),
        contract_expiry_date: SchemaHelpers.optionalDateField(),
        created_at: SchemaHelpers.dateTimeField(),
        updated_at: SchemaHelpers.dateTimeField(),
    },
    'id',
    ['id', 'name', 'created_at', 'updated_at']
);

export const feeTemplateItemProperties = {
    id: SchemaHelpers.stringField(100),
    fee_template_id: SchemaHelpers.stringField(100),
    description: SchemaHelpers.stringField(500),
    amount: SchemaHelpers.numberField(0.01, 0, 999999.99),
    revenue_account_id: SchemaHelpers.stringField(100),
    linked_expense_category_id: SchemaHelpers.optionalStringField(100),
    linked_meal_plan_id: SchemaHelpers.optionalStringField(100),
    linked_transport_route_id: SchemaHelpers.optionalStringField(100),
    revenue_account_name: SchemaHelpers.optionalStringField(200),
    linked_expense_category_name: SchemaHelpers.optionalStringField(200),
};
export const feeTemplatesSchema: DatabaseSchema<FinTypes.FinFeeTemplateType> = createDatabaseSchema<FinTypes.FinFeeTemplateType>(
    'fee_template',
    {
        id: SchemaHelpers.stringField(100),
        name: SchemaHelpers.stringField(200),
        school_period_id: SchemaHelpers.stringField(100),
        student_category_id: SchemaHelpers.optionalStringField(100),
        school_period_name: SchemaHelpers.optionalStringField(100),
        student_category_name: SchemaHelpers.optionalStringField(100),
        items: SchemaHelpers.arrayField(feeTemplateItemProperties),
        created_at: SchemaHelpers.dateTimeField(),
        updated_at: SchemaHelpers.dateTimeField(),
    },
    'id',
    ['id', 'name', 'school_period_id', 'created_at', 'updated_at']
);
export const expenseClaimsSchema: DatabaseSchema<FinTypes.FinExpenseClaimType> = createDatabaseSchema<FinTypes.FinExpenseClaimType>(
    'expense_claim',
    {
        id: SchemaHelpers.stringField(100),
        claimant_type: SchemaHelpers.enumField(Object.values(FinTypes.FinExpenseClaimantTypeEnum)),
        claimant_id: SchemaHelpers.stringField(100),
        claim_date: SchemaHelpers.dateField(),
        description: SchemaHelpers.stringField(500),
        amount: SchemaHelpers.numberField(0.01, 0, 999999.99),
        expense_category_id: SchemaHelpers.stringField(100),
        workflow_state_id: SchemaHelpers.optionalStringField(100),
        workflow_status_name: SchemaHelpers.optionalStringField(100),
        approved_by: SchemaHelpers.optionalStringField(100),
        paid_date: SchemaHelpers.optionalDateField(),
        payment_reference: SchemaHelpers.optionalStringField(100),
        claimant_name: SchemaHelpers.optionalStringField(200),
        expense_category_name: SchemaHelpers.optionalStringField(100),
        created_at: SchemaHelpers.dateTimeField(),
        updated_at: SchemaHelpers.dateTimeField(),
    },
    'id',
    ['id', 'claimant_type', 'claimant_id', 'claim_date', 'description', 'amount', 'expense_category_id', 'created_at', 'updated_at']
);
export const studentOpeningBalancesSchema: DatabaseSchema<FinTypes.FinStudentOpeningBalanceType> = createDatabaseSchema<FinTypes.FinStudentOpeningBalanceType>(
    'student_opening_balance',
    {
        id: SchemaHelpers.stringField(100),
        student_id: SchemaHelpers.stringField(100),
        balance_type: SchemaHelpers.enumField(Object.values(FinTypes.FinOpeningBalanceTypeEnum)),
        amount: SchemaHelpers.numberField(0.01, -999999.99, 999999.99),
        as_of_date: SchemaHelpers.dateField(),
        is_billed: SchemaHelpers.booleanField(),
        student_name: SchemaHelpers.optionalStringField(200),
        created_at: SchemaHelpers.dateTimeField(),
        updated_at: SchemaHelpers.dateTimeField(),
    },
    'id',
    ['id', 'student_id', 'balance_type', 'amount', 'as_of_date', 'created_at', 'updated_at']
);
export const feeAdjustmentsSchema: DatabaseSchema<FinTypes.FinFeeAdjustmentType> = createDatabaseSchema<FinTypes.FinFeeAdjustmentType>(
    'fee_adjustment',
    {
        id: SchemaHelpers.stringField(100),
        student_id: SchemaHelpers.stringField(100),
        school_period_id: SchemaHelpers.stringField(100),
        adjustment_type: SchemaHelpers.enumField(Object.values(FinTypes.FinFeeAdjustmentTypeEnum)),
        amount: SchemaHelpers.numberField(0.01, -999999.99, 999999.99),
        reason: SchemaHelpers.optionalStringField(500),
        applied_invoice_id: SchemaHelpers.optionalStringField(100),
        student_name: SchemaHelpers.optionalStringField(200),
        school_period_name: SchemaHelpers.optionalStringField(100),
        created_at: SchemaHelpers.optionalDateTimeField(),
    },
    'id',
    ['id', 'student_id', 'school_period_id', 'adjustment_type', 'amount']
);
export const transportRoutesSchema: DatabaseSchema<FinTypes.FinTransportRouteType> = createDatabaseSchema<FinTypes.FinTransportRouteType>(
    'transport_route',
    {
        id: SchemaHelpers.stringField(100),
        route_name: SchemaHelpers.stringField(200),
        pickup_location: SchemaHelpers.stringField(300),
        dropoff_location: SchemaHelpers.stringField(300),
        monthly_fee: SchemaHelpers.numberField(0.01, 0, 999999.99),
        is_active: SchemaHelpers.booleanField(),
        created_at: SchemaHelpers.dateTimeField(),
        updated_at: SchemaHelpers.dateTimeField(),
    },
    'id',
    ['id', 'route_name', 'pickup_location', 'dropoff_location', 'monthly_fee', 'is_active', 'created_at', 'updated_at']
);
export const studentTransportAssignmentsSchema: DatabaseSchema<FinTypes.FinStudentTransportAssignmentType> = createDatabaseSchema<FinTypes.FinStudentTransportAssignmentType>(
    'student_transport_assignment',
    {
        id: SchemaHelpers.stringField(100),
        student_id: SchemaHelpers.stringField(100),
        route_id: SchemaHelpers.stringField(100),
        school_period_id: SchemaHelpers.stringField(100),
        status: SchemaHelpers.enumField(Object.values(FinTypes.FinTransportAssignmentStatusEnum)),
        invoice_id: SchemaHelpers.optionalStringField(100),
        cost_override: SchemaHelpers.optionalNumberField(0.01, 0, 999999.99),
        student_name: SchemaHelpers.optionalStringField(200),
        route_name: SchemaHelpers.optionalStringField(200),
        school_period_name: SchemaHelpers.optionalStringField(100),
        created_at: SchemaHelpers.dateTimeField(),
        updated_at: SchemaHelpers.dateTimeField(),
    },
    'id',
    ['id', 'student_id', 'route_id', 'school_period_id', 'status', 'created_at', 'updated_at']
);
const studentInvoiceItemProperties = {
    id: SchemaHelpers.stringField(100),
    invoice_id: SchemaHelpers.stringField(100),
    description: SchemaHelpers.stringField(500),
    amount: SchemaHelpers.numberField(0.01, 0, 999999.99),
    fee_template_item_id: SchemaHelpers.optionalStringField(100),
    student_transport_assignment_id: SchemaHelpers.optionalStringField(100),
    fine_id: SchemaHelpers.optionalStringField(100),
};
export const studentInvoicesSchema: DatabaseSchema<FinTypes.FinStudentInvoiceType> = createDatabaseSchema<FinTypes.FinStudentInvoiceType>(
    'student_invoice',
    {
        id: SchemaHelpers.stringField(100),
        student_id: SchemaHelpers.stringField(100),
        invoice_number: SchemaHelpers.stringField(50),
        school_period_id: SchemaHelpers.stringField(100),
        issue_date: SchemaHelpers.dateField(),
        due_date: SchemaHelpers.dateField(),
        total_amount_billed: SchemaHelpers.numberField(0.01, 0, 999999.99),
        amount_paid: SchemaHelpers.numberField(0.01, 0, 999999.99),
        status: SchemaHelpers.enumField(Object.values(FinTypes.FinInvoiceStatusEnum)),
        items: SchemaHelpers.arrayField(studentInvoiceItemProperties),
        student_name: SchemaHelpers.optionalStringField(200),
        school_period_name: SchemaHelpers.optionalStringField(100),
        deleted_at: SchemaHelpers.optionalDateTimeField(),
        created_at: SchemaHelpers.dateTimeField(),
        updated_at: SchemaHelpers.dateTimeField(),
    },
    'id',
    ['id', 'student_id', 'invoice_number', 'school_period_id', 'issue_date', 'status', 'created_at', 'updated_at']
);
export const studentPaymentsSchema: DatabaseSchema<FinTypes.FinStudentPaymentType> = createDatabaseSchema<FinTypes.FinStudentPaymentType>(
    'student_payment',
    {
        id: SchemaHelpers.stringField(100),
        student_id: SchemaHelpers.stringField(100),
        receipt_no: SchemaHelpers.stringField(50),
        total_amount_paid: SchemaHelpers.numberField(0.01, 0, 999999.99),
        payment_method: SchemaHelpers.optionalStringField(50),
        transaction_date: SchemaHelpers.dateTimeField(),
        reference_no: SchemaHelpers.optionalStringField(100),
        notes: SchemaHelpers.optionalStringField(500),
        student_name: SchemaHelpers.optionalStringField(200),
        created_at: SchemaHelpers.dateTimeField(),
        updated_at: SchemaHelpers.dateTimeField(),
    },
    'id',
    ['id', 'student_id', 'receipt_no', 'total_amount_paid', 'transaction_date', 'created_at', 'updated_at']
);
export const invoicePaymentApplicationsSchema: DatabaseSchema<FinTypes.FinInvoicePaymentApplicationType> = createDatabaseSchema<FinTypes.FinInvoicePaymentApplicationType>(
    'invoice_payment_application',
    {
        id: SchemaHelpers.stringField(100),
        payment_id: SchemaHelpers.stringField(100),
        invoice_item_id: SchemaHelpers.stringField(100),
        amount_applied: SchemaHelpers.numberField(0.01, 0, 999999.99),
    },
    'id',
    ['id', 'payment_id', 'invoice_item_id', 'amount_applied']
);
const customerInvoiceItemProperties = {
    id: SchemaHelpers.stringField(100),
    invoice_id: SchemaHelpers.stringField(100),
    description: SchemaHelpers.optionalStringField(500),
    quantity: SchemaHelpers.optionalNumberField(1, 0, 999999999),
    unit_price: SchemaHelpers.optionalNumberField(0.01, 0, 999999.99),
    amount: SchemaHelpers.optionalNumberField(0.01, 0, 999999.99),
    revenue_account_id: SchemaHelpers.optionalStringField(100),
    revenue_account_name: SchemaHelpers.optionalStringField(200),
};
export const customerInvoicesSchema: DatabaseSchema<FinTypes.FinCustomerInvoiceType> = createDatabaseSchema<FinTypes.FinCustomerInvoiceType>(
    'customer_invoice',
    {
        id: SchemaHelpers.stringField(100),
        customer_id: SchemaHelpers.stringField(100),
        invoice_number: SchemaHelpers.stringField(50),
        issue_date: SchemaHelpers.dateField(),
        due_date: SchemaHelpers.optionalDateField(),
        total_amount: SchemaHelpers.optionalNumberField(0.01, 0, 999999.99),
        status: SchemaHelpers.optionalEnumField(Object.values(FinTypes.FinCustomerInvoiceStatusEnum)),
        notes: SchemaHelpers.optionalStringField(500),
        items: SchemaHelpers.arrayField(customerInvoiceItemProperties),
        customer_name: SchemaHelpers.optionalStringField(200),
        created_at: SchemaHelpers.dateTimeField(),
        updated_at: SchemaHelpers.dateTimeField(),
    },
    'id',
    ['id', 'customer_id', 'invoice_number', 'issue_date', 'status', 'created_at', 'updated_at']
);
export const supplierInvoicesSchema: DatabaseSchema<FinTypes.FinSupplierInvoiceType> = createDatabaseSchema<FinTypes.FinSupplierInvoiceType>(
    'supplier_invoice',
    {
        id: SchemaHelpers.stringField(100),
        supplier_id: SchemaHelpers.stringField(100),
        invoice_number: SchemaHelpers.stringField(50),
        invoice_date: SchemaHelpers.dateField(),
        due_date: SchemaHelpers.optionalDateField(),
        total_amount: SchemaHelpers.numberField(0.01, 0, 999999.99),
        amount_paid: SchemaHelpers.optionalNumberField(0.01, 0, 999999.99),
        status: SchemaHelpers.optionalEnumField(Object.values(FinTypes.FinSupplierInvoiceStatusEnum)),
        purchase_order_id: SchemaHelpers.optionalStringField(100),
        notes: SchemaHelpers.optionalStringField(500),
        supplier_name: SchemaHelpers.optionalStringField(200),
        created_at: SchemaHelpers.dateTimeField(),
        updated_at: SchemaHelpers.dateTimeField(),
    },
    'id',
    ['id', 'supplier_id', 'invoice_number', 'invoice_date', 'total_amount', 'status', 'created_at', 'updated_at']
);
const generalPaymentItemProperties = {
    id: SchemaHelpers.stringField(100),
    general_payment_id: SchemaHelpers.stringField(100),
    description: SchemaHelpers.stringField(500),
    amount: SchemaHelpers.numberField(0.01, 0, 999999.99),
    revenue_account_id: SchemaHelpers.stringField(100),
    revenue_account_name: SchemaHelpers.optionalStringField(200),
};
export const generalPaymentsSchema: DatabaseSchema<FinTypes.FinGeneralPaymentType> = createDatabaseSchema<FinTypes.FinGeneralPaymentType>(
    'general_payment',
    {
        id: SchemaHelpers.stringField(100),
        payer_type: SchemaHelpers.enumField(Object.values(FinTypes.FinGeneralPayerTypeEnum)),
        payer_id: SchemaHelpers.optionalStringField(100),
        payer_name_external: SchemaHelpers.optionalStringField(200),
        payment_date: SchemaHelpers.dateTimeField(),
        total_amount_paid: SchemaHelpers.numberField(0.01, 0, 999999.99),
        payment_method: SchemaHelpers.optionalStringField(50),
        reference_no: SchemaHelpers.optionalStringField(100),
        notes: SchemaHelpers.optionalStringField(500),
        items: SchemaHelpers.arrayField(generalPaymentItemProperties),
        payer_name_resolved: SchemaHelpers.optionalStringField(200),
        created_at: SchemaHelpers.dateTimeField(),
        updated_at: SchemaHelpers.dateTimeField(),
    },
    'id',
    ['id', 'payer_type', 'payment_date', 'total_amount_paid', 'created_at', 'updated_at']
);

export const generalLedgerEntriesSchema: DatabaseSchema<FinTypes.FinGeneralLedgerEntryType> = createDatabaseSchema<FinTypes.FinGeneralLedgerEntryType>(
    'general_ledger_entry',
    {
        id: SchemaHelpers.stringField(100),
        transaction_date: SchemaHelpers.dateTimeField(),
        effective_date: SchemaHelpers.dateField(),
        financial_year_id: SchemaHelpers.stringField(100),
        account_id: SchemaHelpers.stringField(100),
        debit: SchemaHelpers.optionalNumberField(0.01, 0, 999999.99),
        credit: SchemaHelpers.optionalNumberField(0.01, 0, 999999.99),
        description: SchemaHelpers.stringField(500),
        source_table: SchemaHelpers.optionalStringField(100),
        source_id: SchemaHelpers.optionalStringField(100),
    },
    'id',
    ['id', 'transaction_date', 'effective_date', 'financial_year_id', 'account_id', 'description']
);
