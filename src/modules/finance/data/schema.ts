// ABOUTME: Defines RxDB JSON schemas for entities specific to the Finance module.
// ABOUTME: These schemas are used by rxdbService.ts to create collections.

import { RxJsonSchema } from 'rxdb';
import * as FinTypes from './types'; // Use alias to avoid conflict
import { createEntitySchema } from '../../../utils/schemaUtils';
import { SchoolPeriod } from '../../../types'; // Import SchoolPeriod from core types

export const financialYearSchema: RxJsonSchema<FinTypes.FinFinancialYearType> = createEntitySchema<FinTypes.FinFinancialYearType>(
    'financial_year', 
    { 
        id: { type: 'string' }, 
        name: { type: 'string', maxLength: 100 }, 
        start_date: { type: 'string', format: 'date', maxLength: 20 }, 
        end_date: { type: 'string', format: 'date', maxLength: 20 }, 
        status: { type: 'string', enum: Object.values(FinTypes.FinFinancialYearStatusEnum), maxLength: 50 }, 
        created_at: { type: 'string', format: 'date-time', maxLength: 50 }, 
        updated_at: { type: 'string', format: 'date-time', maxLength: 50 }, 
    }, 
    { key: 'id', type: 'string', final: true, maxLength: 100 }, 
    ['id', 'name', 'start_date', 'end_date', 'status', 'created_at', 'updated_at'],
    ['id']
);

export const schoolPeriodSchema: RxJsonSchema<SchoolPeriod> = createEntitySchema<SchoolPeriod>(
    'school_period', 
    { 
        id: { type: 'string' }, 
        academic_year_id: { type: 'string', ref: 'academic_years' },
    period_definition_id: { type: 'string', ref: 'academic_period_definitions' },
    financial_year_id: { type: 'string', ref: 'financial_years' }, 
        start_date: { type: 'string', format: 'date', maxLength: 20 }, 
        end_date: { type: 'string', format: 'date', maxLength: 20 }, 
        is_active: { type: 'boolean' }, 
        mid_break_start: { type: ['string', 'null'], format: 'date', maxLength: 20 }, 
        mid_break_end: { type: ['string', 'null'], format: 'date', maxLength: 20 }, 
        name: { type: ['string', 'null'], maxLength: 100 }, 
        academic_year_name: { type: ['string', 'null'], maxLength: 100 }, 
        period_definition_name: { type: ['string', 'null'], maxLength: 100 }, 
        financial_year_name: { type: ['string', 'null'], maxLength: 100 }, 
        created_at: { type: 'string', format: 'date-time', maxLength: 50 }, 
        updated_at: { type: 'string', format: 'date-time', maxLength: 50 }, 
    }, 
    { key: 'id', type: 'string', final: true, maxLength: 100 }, 
    ['id', 'academic_year_id', 'period_definition_id', 'financial_year_id', 'start_date', 'end_date', 'is_active', 'created_at', 'updated_at'],
    ['id']
);


export const chartOfAccountsSchema: RxJsonSchema<FinTypes.FinChartOfAccountType> = createEntitySchema<FinTypes.FinChartOfAccountType>(
    'chart_of_account',
    {
        id: { type: 'string' },
        account_code: { type: 'string', maxLength: 50 },
        name: { type: 'string', maxLength: 150 },
        type: { type: 'string', enum: Object.values(FinTypes.FinAccountTypeEnum), maxLength: 50 },
        template_type: { type: 'string', enum: Object.values(FinTypes.FinAccountTemplateTypeEnum), maxLength: 50 },
        is_active: { type: 'boolean' },
        expense_category_id: { type: ['string', 'null'], ref: 'expense_categories' },
        created_at: { type: 'string', format: 'date-time', maxLength: 50 },
        updated_at: { type: 'string', format: 'date-time', maxLength: 50 },
        expense_category_name: { type: ['string', 'null'], maxLength: 100 },
    },
    { key: 'id', type: 'string', final: true, maxLength: 100 },
    ['id', 'account_code', 'name', 'type', 'template_type', 'is_active', 'created_at', 'updated_at'],
    ['id']
);

export const expenseCategoriesSchema: RxJsonSchema<FinTypes.FinExpenseCategoryType> = createEntitySchema<FinTypes.FinExpenseCategoryType>(
    'expense_category',
    {
        id: { type: 'string' },
        name: { type: 'string', maxLength: 100 },
    },
    { key: 'id', type: 'string', final: true, maxLength: 100 },
    ['id', 'name'],
    ['id']
);

export const banksSchema: RxJsonSchema<FinTypes.FinBankType> = createEntitySchema<FinTypes.FinBankType>(
    'bank',
    {
        id: { type: 'string' },
        name: { type: 'string', maxLength: 100 },
        account_no: { type: ['string', 'null'], maxLength: 50 },
        gl_account_id: { type: 'string', ref: 'chart_of_accounts' },
        created_at: { type: 'string', format: 'date-time', maxLength: 50 },
        updated_at: { type: 'string', format: 'date-time', maxLength: 50 },
        gl_account_name: { type: ['string', 'null'], maxLength: 200 },
    },
    { key: 'id', type: 'string', final: true, maxLength: 100 },
    ['id', 'name', 'gl_account_id', 'created_at', 'updated_at'],
    ['id']
);

export const suppliersSchema: RxJsonSchema<FinTypes.FinSupplierType> = createEntitySchema<FinTypes.FinSupplierType>(
    'supplier',
    {
        id: { type: 'string', final: true, maxLength: 100 },
        name: { type: 'string', maxLength: 200 },
        phone: { type: ['string', 'null'], maxLength: 20 },
        email: { type: ['string', 'null'], format: 'email', maxLength: 100 },
        address: { type: ['string', 'null'], maxLength: 500 },
        contact_person: { type: ['string', 'null'], maxLength: 200 },
        kra_pin: { type: ['string', 'null'], maxLength: 20 },
        contract_expiry_date: { type: ['string', 'null'], format: 'date', maxLength: 20 },
        created_at: { type: 'string', format: 'date-time', maxLength: 50 },
        updated_at: { type: 'string', format: 'date-time', maxLength: 50 },
    },
    { key: 'id', type: 'string' },
    ['id', 'name', 'created_at', 'updated_at'],
    ['id']
);

export const feeTemplateItemProperties: RxJsonSchema<FinTypes.FinFeeTemplateItemType>['properties'] = {
    id: { type: 'string', maxLength: 100 },
    fee_template_id: { type: 'string' },
    description: { type: 'string', maxLength: 500 },
    amount: { type: 'number', multipleOf: 0.01, minimum: 0, maximum: 999999.99 },
    revenue_account_id: { type: 'string' },
    linked_expense_category_id: { type: ['string', 'null'] },
    linked_meal_plan_id: { type: ['string', 'null'] },
    linked_transport_route_id: { type: ['string', 'null'] },
    revenue_account_name: { type: ['string', 'null'], maxLength: 200 },
    linked_expense_category_name: { type: ['string', 'null'], maxLength: 200 },
};
export const feeTemplatesSchema: RxJsonSchema<FinTypes.FinFeeTemplateType> = createEntitySchema<FinTypes.FinFeeTemplateType>('fee_template', { id: { type: 'string' }, name: { type: 'string', maxLength: 200 }, school_period_id: { type: 'string', ref: 'school_periods' }, student_category_id: { type: ['string', 'null'], ref: 'student_categories' }, school_period_name: { type: ['string', 'null'], maxLength: 100 }, student_category_name: { type: ['string', 'null'], maxLength: 100 }, items: { type: ['array', 'null'], default: [], items: { type: 'object', properties: feeTemplateItemProperties } }, created_at: { type: 'string', format: 'date-time', maxLength: 50 }, updated_at: { type: 'string', format: 'date-time', maxLength: 50 }, }, { key: 'id', type: 'string', final: true, maxLength: 100 }, ['id', 'name', 'school_period_id', 'created_at', 'updated_at'], ['id']);
export const expenseClaimsSchema: RxJsonSchema<FinTypes.FinExpenseClaimType> = createEntitySchema<FinTypes.FinExpenseClaimType>('expense_claim', { id: { type: 'string', final: true, maxLength: 100 }, claimant_type: { type: 'string', enum: Object.values(FinTypes.FinExpenseClaimantTypeEnum), maxLength: 50 }, claimant_id: { type: 'string', maxLength: 100 }, claim_date: { type: 'string', format: 'date', maxLength: 20 }, description: { type: 'string', maxLength: 500 }, amount: { type: 'number', multipleOf: 0.01, minimum: 0, maximum: 999999.99 }, expense_category_id: { type: 'string', ref: 'expense_categories' }, workflow_state_id: { type: ['string', 'null'], ref: 'workflow_states' }, workflow_status_name: { type: ['string', 'null'], maxLength: 100 }, approved_by: { type: ['string', 'null'], ref: 'users', maxLength: 100 }, paid_date: { type: ['string', 'null'], format: 'date', maxLength: 20 }, payment_reference: { type: ['string', 'null'], maxLength: 100 }, claimant_name: { type: ['string', 'null'], maxLength: 200 }, expense_category_name: { type: ['string', 'null'], maxLength: 100 }, created_at: { type: 'string', format: 'date-time', maxLength: 50 }, updated_at: { type: 'string', format: 'date-time', maxLength: 50 } }, { key: 'id', type: 'string' }, ['id', 'claimant_type', 'claimant_id', 'claim_date', 'description', 'amount', 'expense_category_id', 'created_at', 'updated_at'], ['id']);
export const studentOpeningBalancesSchema: RxJsonSchema<FinTypes.FinStudentOpeningBalanceType> = createEntitySchema<FinTypes.FinStudentOpeningBalanceType>('student_opening_balance', { id: { type: 'string', final: true, maxLength: 100 }, student_id: { type: 'string', ref: 'students', maxLength: 100 }, balance_type: { type: 'string', enum: Object.values(FinTypes.FinOpeningBalanceTypeEnum), maxLength: 50 }, amount: { type: 'number', multipleOf: 0.01, minimum: -999999.99, maximum: 999999.99 }, as_of_date: { type: 'string', format: 'date', maxLength: 20 }, is_billed: { type: 'boolean' }, student_name: { type: ['string', 'null'], maxLength: 200 }, created_at: { type: 'string', format: 'date-time', maxLength: 50 }, updated_at: { type: 'string', format: 'date-time', maxLength: 50 } }, { key: 'id', type: 'string' }, ['id', 'student_id', 'balance_type', 'amount', 'as_of_date', 'created_at', 'updated_at'], ['id']);
export const feeAdjustmentsSchema: RxJsonSchema<FinTypes.FinFeeAdjustmentType> = createEntitySchema<FinTypes.FinFeeAdjustmentType>('fee_adjustment', { id: { type: 'string', final: true, maxLength: 100 }, student_id: { type: 'string', ref: 'students', maxLength: 100 }, school_period_id: { type: 'string', ref: 'school_periods' }, adjustment_type: { type: 'string', enum: Object.values(FinTypes.FinFeeAdjustmentTypeEnum), maxLength: 50 }, amount: { type: 'number', multipleOf: 0.01, minimum: -999999.99, maximum: 999999.99 }, reason: { type: ['string', 'null'], maxLength: 500 }, applied_invoice_id: { type: ['string', 'null'], ref: 'student_invoices', maxLength: 100 }, student_name: { type: ['string', 'null'], maxLength: 200 }, school_period_name: { type: ['string', 'null'], maxLength: 100 }, created_at: { type: ['string', 'null'], format: 'date-time', maxLength: 50 } }, { key: 'id', type: 'string' }, ['id', 'student_id', 'school_period_id', 'adjustment_type', 'amount'], ['id']);
export const transportRoutesSchema: RxJsonSchema<FinTypes.FinTransportRouteType> = createEntitySchema<FinTypes.FinTransportRouteType>('transport_route', { id: { type: 'string' }, name: { type: 'string', maxLength: 200 }, cost_per_period: { type: 'number', multipleOf: 0.01, minimum: 0, maximum: 999999.99 }, gl_revenue_account_id: { type: 'string', ref: 'chart_of_accounts' }, gl_revenue_account_name: { type: ['string', 'null'], maxLength: 200 }, created_at: { type: 'string', format: 'date-time', maxLength: 50 }, updated_at: { type: 'string', format: 'date-time', maxLength: 50 } }, { key: 'id', type: 'string', final: true, maxLength: 100 }, ['id', 'name', 'cost_per_period', 'gl_revenue_account_id', 'created_at', 'updated_at'], ['id']);
export const studentTransportAssignmentsSchema: RxJsonSchema<FinTypes.FinStudentTransportAssignmentType> = createEntitySchema<FinTypes.FinStudentTransportAssignmentType>('student_transport_assignment', { id: { type: 'string', final: true, maxLength: 100 }, student_id: { type: 'string', ref: 'students', maxLength: 100 }, route_id: { type: 'string', ref: 'transport_routes' }, school_period_id: { type: 'string', ref: 'school_periods' }, status: { type: 'string', enum: Object.values(FinTypes.FinTransportAssignmentStatusEnum), maxLength: 50 }, invoice_id: { type: ['string', 'null'], ref: 'student_invoices', maxLength: 100 }, cost_override: { type: ['number', 'null'], multipleOf: 0.01, minimum: 0, maximum: 999999.99 }, student_name: { type: ['string', 'null'], maxLength: 200 }, route_name: { type: ['string', 'null'], maxLength: 200 }, school_period_name: { type: ['string', 'null'], maxLength: 100 }, created_at: { type: 'string', format: 'date-time', maxLength: 50 }, updated_at: { type: 'string', format: 'date-time', maxLength: 50 } }, { key: 'id', type: 'string' }, ['id', 'student_id', 'route_id', 'school_period_id', 'status', 'created_at', 'updated_at'], ['id']);
const studentInvoiceItemProperties: RxJsonSchema<FinTypes.FinStudentInvoiceItemType>['properties'] = { id: { type: 'string', maxLength: 100 }, invoice_id: { type: 'string', maxLength: 100 }, description: { type: 'string', maxLength: 500 }, amount: { type: 'number', multipleOf: 0.01, minimum: 0, maximum: 999999.99 }, fee_template_item_id: { type: ['string', 'null'], maxLength: 100 }, student_transport_assignment_id: { type: ['string', 'null'], maxLength: 100 }, fine_id: { type: ['string', 'null'], maxLength: 100 } };
export const studentInvoicesSchema: RxJsonSchema<FinTypes.FinStudentInvoiceType> = createEntitySchema<FinTypes.FinStudentInvoiceType>('student_invoice', { id: { type: 'string', final: true, maxLength: 100 }, student_id: { type: 'string', ref: 'students', maxLength: 100 }, invoice_number: { type: 'string', maxLength: 50 }, school_period_id: { type: 'string', ref: 'school_periods' }, issue_date: { type: 'string', format: 'date', maxLength: 20 }, due_date: { type: 'string', format: 'date', maxLength: 20 }, total_amount_billed: { type: 'number', multipleOf: 0.01, minimum: 0, maximum: 999999.99 }, amount_paid: { type: 'number', default: 0, multipleOf: 0.01, minimum: 0, maximum: 999999.99 }, status: { type: 'string', enum: Object.values(FinTypes.FinInvoiceStatusEnum), maxLength: 50 }, items: { type: ['array', 'null'], default: [], items: { type: 'object', properties: studentInvoiceItemProperties } }, student_name: { type: ['string', 'null'], maxLength: 200 }, school_period_name: { type: ['string', 'null'], maxLength: 100 }, deleted_at: { type: ['string', 'null'], format: 'date-time', maxLength: 50 }, created_at: { type: 'string', format: 'date-time', maxLength: 50 }, updated_at: { type: 'string', format: 'date-time', maxLength: 50 } }, { key: 'id', type: 'string' }, ['id', 'student_id', 'invoice_number', 'school_period_id', 'issue_date', 'status', 'created_at', 'updated_at']);
export const studentPaymentsSchema: RxJsonSchema<FinTypes.FinStudentPaymentType> = createEntitySchema<FinTypes.FinStudentPaymentType>('student_payment', { id: { type: 'string', final: true, maxLength: 100 }, student_id: { type: 'string', ref: 'students', maxLength: 100 }, receipt_no: { type: 'string', maxLength: 50 }, total_amount_paid: { type: 'number', multipleOf: 0.01, minimum: 0, maximum: 999999.99 }, payment_method: { type: ['string', 'null'], maxLength: 50 }, transaction_date: { type: 'string', format: 'date-time', maxLength: 50 }, reference_no: { type: ['string', 'null'], maxLength: 100 }, notes: { type: ['string', 'null'], maxLength: 500 }, student_name: { type: ['string', 'null'], maxLength: 200 }, created_at: { type: 'string', format: 'date-time', maxLength: 50 }, updated_at: { type: 'string', format: 'date-time', maxLength: 50 } }, { key: 'id', type: 'string' }, ['id', 'student_id', 'receipt_no', 'total_amount_paid', 'transaction_date', 'created_at', 'updated_at']);
export const invoicePaymentApplicationsSchema: RxJsonSchema<FinTypes.FinInvoicePaymentApplicationType> = createEntitySchema<FinTypes.FinInvoicePaymentApplicationType>('invoice_payment_application', { id: { type: 'string', final: true, maxLength: 100 }, payment_id: { type: 'string', ref: 'student_payments', maxLength: 100 }, invoice_item_id: { type: 'string', ref: 'student_invoice_items', maxLength: 100 }, amount_applied: { type: 'number', multipleOf: 0.01, minimum: 0, maximum: 999999.99 } }, { key: 'id', type: 'string' }, ['id', 'payment_id', 'invoice_item_id', 'amount_applied']);
const customerInvoiceItemProperties: RxJsonSchema<FinTypes.FinCustomerInvoiceItemType>['properties'] = { id: { type: 'string', maxLength: 100 }, invoice_id: { type: 'string', maxLength: 100 }, description: { type: ['string', 'null'], maxLength: 500 }, quantity: { type: ['number', 'null'], multipleOf: 1, minimum: 0, maximum: 999999999 }, unit_price: { type: ['number', 'null'], multipleOf: 0.01, minimum: 0, maximum: 999999.99 }, amount: { type: ['number', 'null'], multipleOf: 0.01, minimum: 0, maximum: 999999.99 }, revenue_account_id: { type: ['string', 'null'] }, revenue_account_name: { type: ['string', 'null'], maxLength: 200 } };
export const customerInvoicesSchema: RxJsonSchema<FinTypes.FinCustomerInvoiceType> = createEntitySchema<FinTypes.FinCustomerInvoiceType>('customer_invoice', { id: { type: 'string', final: true, maxLength: 100 }, customer_id: { type: 'string', ref: 'customers' }, invoice_number: { type: 'string', maxLength: 50 }, issue_date: { type: 'string', format: 'date', maxLength: 20 }, due_date: { type: ['string', 'null'], format: 'date', maxLength: 20 }, total_amount: { type: ['number', 'null'], multipleOf: 0.01, minimum: 0, maximum: 999999.99 }, status: { type: ['string', 'null'], enum: Object.values(FinTypes.FinCustomerInvoiceStatusEnum), maxLength: 50 }, notes: { type: ['string', 'null'], maxLength: 500 }, items: { type: ['array', 'null'], default: [], items: { type: 'object', properties: customerInvoiceItemProperties } }, customer_name: { type: ['string', 'null'], maxLength: 200 }, created_at: { type: 'string', format: 'date-time', maxLength: 50 }, updated_at: { type: 'string', format: 'date-time', maxLength: 50 } }, { key: 'id', type: 'string' }, ['id', 'customer_id', 'invoice_number', 'issue_date', 'status', 'created_at', 'updated_at']);
export const supplierInvoicesSchema: RxJsonSchema<FinTypes.FinSupplierInvoiceType> = createEntitySchema<FinTypes.FinSupplierInvoiceType>('supplier_invoice', { id: { type: 'string', final: true, maxLength: 100 }, supplier_id: { type: 'string', ref: 'suppliers', maxLength: 100 }, invoice_number: { type: 'string', maxLength: 50 }, invoice_date: { type: 'string', format: 'date', maxLength: 20 }, due_date: { type: ['string', 'null'], format: 'date', maxLength: 20 }, total_amount: { type: 'number', multipleOf: 0.01, minimum: 0, maximum: 999999.99 }, amount_paid: { type: ['number', 'null'], multipleOf: 0.01, minimum: 0, maximum: 999999.99 }, status: { type: ['string', 'null'], enum: Object.values(FinTypes.FinSupplierInvoiceStatusEnum), maxLength: 50 }, purchase_order_id: { type: ['string', 'null'], ref: 'purchase_orders', maxLength: 100 }, notes: { type: ['string', 'null'], maxLength: 500 }, supplier_name: { type: ['string', 'null'], maxLength: 200 }, created_at: { type: 'string', format: 'date-time', maxLength: 50 }, updated_at: { type: 'string', format: 'date-time', maxLength: 50 } }, { key: 'id', type: 'string' }, ['id', 'supplier_id', 'invoice_number', 'invoice_date', 'total_amount', 'status', 'created_at', 'updated_at']);
const generalPaymentItemProperties: RxJsonSchema<FinTypes.FinGeneralPaymentItemType>['properties'] = { id: { type: 'string', maxLength: 100 }, general_payment_id: { type: 'string', maxLength: 100 }, description: { type: 'string', maxLength: 500 }, amount: { type: 'number', multipleOf: 0.01, minimum: 0, maximum: 999999.99 }, revenue_account_id: { type: 'string' }, revenue_account_name: { type: ['string', 'null'], maxLength: 200 } };
export const generalPaymentsSchema: RxJsonSchema<FinTypes.FinGeneralPaymentType> = createEntitySchema<FinTypes.FinGeneralPaymentType>('general_payment', { id: { type: 'string', final: true, maxLength: 100 }, payer_type: { type: 'string', enum: Object.values(FinTypes.FinGeneralPayerTypeEnum), maxLength: 50 }, payer_id: { type: ['string', 'null'], maxLength: 100 }, payer_name_external: { type: ['string', 'null'], maxLength: 200 }, payment_date: { type: 'string', format: 'date-time', maxLength: 50 }, total_amount_paid: { type: 'number', multipleOf: 0.01, minimum: 0, maximum: 999999.99 }, payment_method: { type: ['string', 'null'], maxLength: 50 }, reference_no: { type: ['string', 'null'], maxLength: 100 }, notes: { type: ['string', 'null'], maxLength: 500 }, items: { type: 'array', default: [], items: { type: 'object', properties: generalPaymentItemProperties } }, payer_name_resolved: { type: ['string', 'null'], maxLength: 200 }, created_at: { type: 'string', format: 'date-time', maxLength: 50 }, updated_at: { type: 'string', format: 'date-time', maxLength: 50 } }, { key: 'id', type: 'string' }, ['id', 'payer_type', 'payment_date', 'total_amount_paid', 'created_at', 'updated_at'], ['id']);
export const generalLedgerEntriesSchema: RxJsonSchema<FinTypes.FinGeneralLedgerEntryType> = createEntitySchema<FinTypes.FinGeneralLedgerEntryType>(
  'general_ledger_entry', 
  { 
    id: { type: 'string', final: true, maxLength: 100 }, 
    transaction_date: { type: 'string', format: 'date-time', maxLength: 50 }, 
    effective_date: { type: 'string', format: 'date', maxLength: 20 },
    financial_year_id: { type: 'string', ref: 'financial_years' }, 
    account_id: { type: 'string', ref: 'chart_of_accounts' },
    debit: { type: ['number', 'null'], multipleOf: 0.01, minimum: 0, maximum: 999999.99 },
    credit: { type: ['number', 'null'], multipleOf: 0.01, minimum: 0, maximum: 999999.99 },
    description: { type: 'string', maxLength: 500 },
    source_table: { type: ['string', 'null'], maxLength: 100 },
    source_id: { type: ['string', 'null'], maxLength: 100 }
  }, 
  { key: 'id', type: 'string' }, 
  ['id', 'transaction_date', 'effective_date', 'financial_year_id', 'account_id', 'description'],
  ['id']
);
