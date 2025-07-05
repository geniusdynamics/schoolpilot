// ABOUTME: Defines RxDB JSON schemas for entities specific to the Finance module.
// ABOUTME: These schemas are used by rxdbService.ts to create collections.

import { RxJsonSchema } from 'rxdb';
import * as FinTypes from './types'; // Use alias to avoid conflict
import { createEntitySchema } from '../../../utils/schemaUtils';
import { SchoolPeriod } from '../../../types'; // Import SchoolPeriod from core types

export const financialYearSchema: RxJsonSchema<FinTypes.FinFinancialYearType> = createEntitySchema<FinTypes.FinFinancialYearType>(
    'financial_year', 
    { 
        id: { type: 'number' }, 
        name: { type: 'string' }, 
        start_date: { type: 'string', format: 'date' }, 
        end_date: { type: 'string', format: 'date' }, 
        status: { type: 'string', enum: Object.values(FinTypes.FinFinancialYearStatusEnum) }, 
        created_at: { type: 'string', format: 'date-time' }, 
        updated_at: { type: 'string', format: 'date-time' }, 
    }, 
    { key: 'id', type: 'number' }, 
    ['id', 'name', 'start_date', 'end_date', 'status', 'created_at', 'updated_at']
);

export const schoolPeriodSchema: RxJsonSchema<SchoolPeriod> = createEntitySchema<SchoolPeriod>(
    'school_period', 
    { 
        id: { type: 'number' }, 
        academic_year_id: { type: 'number', ref: 'academic_years' }, 
        period_definition_id: { type: 'number', ref: 'academic_period_definitions' }, 
        financial_year_id: { type: 'number', ref: 'financial_years' }, 
        start_date: { type: 'string', format: 'date' }, 
        end_date: { type: 'string', format: 'date' }, 
        is_active: { type: 'boolean' }, 
        mid_break_start: { type: ['string', 'null'], format: 'date' }, 
        mid_break_end: { type: ['string', 'null'], format: 'date' }, 
        name: { type: ['string', 'null'] }, 
        academic_year_name: { type: ['string', 'null'] }, 
        period_definition_name: { type: ['string', 'null'] }, 
        financial_year_name: { type: ['string', 'null'] }, 
        created_at: { type: 'string', format: 'date-time' }, 
        updated_at: { type: 'string', format: 'date-time' }, 
    }, 
    { key: 'id', type: 'number' }, 
    ['id', 'academic_year_id', 'period_definition_id', 'financial_year_id', 'start_date', 'end_date', 'is_active', 'created_at', 'updated_at']
);


export const chartOfAccountsSchema: RxJsonSchema<FinTypes.FinChartOfAccountType> = createEntitySchema<FinTypes.FinChartOfAccountType>(
    'chart_of_account',
    {
        id: { type: 'number' },
        account_code: { type: 'string', maxLength: 50 },
        name: { type: 'string', maxLength: 150 },
        type: { type: 'string', enum: Object.values(FinTypes.FinAccountTypeEnum) },
        template_type: { type: 'string', enum: Object.values(FinTypes.FinAccountTemplateTypeEnum) },
        is_active: { type: 'boolean' },
        expense_category_id: { type: ['number', 'null'], ref: 'expense_categories' },
        created_at: { type: 'string', format: 'date-time' },
        updated_at: { type: 'string', format: 'date-time' },
        expense_category_name: { type: ['string', 'null'] },
    },
    { key: 'id', type: 'number' },
    ['id', 'account_code', 'name', 'type', 'template_type', 'is_active', 'created_at', 'updated_at'],
    ['account_code', 'name', 'type']
);

export const expenseCategoriesSchema: RxJsonSchema<FinTypes.FinExpenseCategoryType> = createEntitySchema<FinTypes.FinExpenseCategoryType>(
    'expense_category',
    {
        id: { type: 'number' },
        name: { type: 'string', maxLength: 100 },
    },
    { key: 'id', type: 'number' },
    ['id', 'name'],
    ['name']
);

export const banksSchema: RxJsonSchema<FinTypes.FinBankType> = createEntitySchema<FinTypes.FinBankType>(
    'bank',
    {
        id: { type: 'number' },
        name: { type: 'string', maxLength: 100 },
        account_no: { type: ['string', 'null'] },
        gl_account_id: { type: 'number', ref: 'chart_of_accounts' },
        created_at: { type: 'string', format: 'date-time' },
        updated_at: { type: 'string', format: 'date-time' },
        gl_account_name: { type: ['string', 'null'] },
    },
    { key: 'id', type: 'number' },
    ['id', 'name', 'gl_account_id', 'created_at', 'updated_at'],
    ['name']
);

export const suppliersSchema: RxJsonSchema<FinTypes.FinSupplierType> = createEntitySchema<FinTypes.FinSupplierType>(
    'supplier',
    {
        id: { type: 'number' },
        name: { type: 'string', maxLength: 200 },
        phone: { type: ['string', 'null'] },
        email: { type: ['string', 'null'], format: 'email' },
        address: { type: ['string', 'null'] },
        contact_person: { type: ['string', 'null'] },
        kra_pin: { type: ['string', 'null'] },
        contract_expiry_date: { type: ['string', 'null'], format: 'date' },
        created_at: { type: 'string', format: 'date-time' },
        updated_at: { type: 'string', format: 'date-time' },
    },
    { key: 'id', type: 'number' },
    ['id', 'name', 'created_at', 'updated_at'],
    ['name']
);

export const feeTemplateItemProperties: RxJsonSchema<FinTypes.FinFeeTemplateItemType>['properties'] = {
    id: { type: 'string' },
    fee_template_id: { type: 'number' },
    description: { type: 'string' },
    amount: { type: 'number' },
    revenue_account_id: { type: 'number' },
    linked_expense_category_id: { type: ['number', 'null'] },
    linked_meal_plan_id: { type: ['number', 'null'] },
    linked_transport_route_id: { type: ['number', 'null'] },
    revenue_account_name: { type: ['string', 'null'] },
    linked_expense_category_name: { type: ['string', 'null'] },
};
export const feeTemplatesSchema: RxJsonSchema<FinTypes.FinFeeTemplateType> = createEntitySchema<FinTypes.FinFeeTemplateType>('fee_template', { id: { type: 'number' }, name: { type: 'string' }, school_period_id: { type: 'number', ref: 'school_periods' }, student_category_id: { type: ['number', 'null'], ref: 'student_categories' }, school_period_name: { type: ['string', 'null'] }, student_category_name: { type: ['string', 'null'] }, items: { type: ['array', 'null'], default: [], items: { type: 'object', properties: feeTemplateItemProperties } }, created_at: { type: 'string', format: 'date-time' }, updated_at: { type: 'string', format: 'date-time' }, }, { key: 'id', type: 'number' }, ['id', 'name', 'school_period_id', 'created_at', 'updated_at']);
export const expenseClaimsSchema: RxJsonSchema<FinTypes.FinExpenseClaimType> = createEntitySchema<FinTypes.FinExpenseClaimType>('expense_claim', { id: { type: 'string' }, claimant_type: { type: 'string', enum: Object.values(FinTypes.FinExpenseClaimantTypeEnum) }, claimant_id: { type: 'string' }, claim_date: { type: 'string', format: 'date' }, description: { type: 'string' }, amount: { type: 'number' }, expense_category_id: { type: 'number', ref: 'expense_categories' }, workflow_state_id: { type: ['number', 'null'], ref: 'workflow_states' }, workflow_status_name: { type: ['string', 'null'] }, approved_by: { type: ['string', 'null'], ref: 'users' }, paid_date: { type: ['string', 'null'], format: 'date' }, payment_reference: { type: ['string', 'null'] }, claimant_name: { type: ['string', 'null'] }, expense_category_name: { type: ['string', 'null'] }, created_at: { type: 'string', format: 'date-time' }, updated_at: { type: 'string', format: 'date-time' } }, { key: 'id', type: 'string', final: true, maxLength: 100 }, ['id', 'claimant_type', 'claimant_id', 'claim_date', 'description', 'amount', 'expense_category_id', 'created_at', 'updated_at']);
export const studentOpeningBalancesSchema: RxJsonSchema<FinTypes.FinStudentOpeningBalanceType> = createEntitySchema<FinTypes.FinStudentOpeningBalanceType>('student_opening_balance', { id: { type: 'string' }, student_id: { type: 'string', ref: 'students' }, balance_type: { type: 'string', enum: Object.values(FinTypes.FinOpeningBalanceTypeEnum) }, amount: { type: 'number' }, as_of_date: { type: 'string', format: 'date' }, is_billed: { type: 'boolean' }, student_name: { type: ['string', 'null'] }, created_at: { type: 'string', format: 'date-time' }, updated_at: { type: 'string', format: 'date-time' } }, { key: 'id', type: 'string', final: true, maxLength: 100 }, ['id', 'student_id', 'balance_type', 'amount', 'as_of_date', 'created_at', 'updated_at']);
export const feeAdjustmentsSchema: RxJsonSchema<FinTypes.FinFeeAdjustmentType> = createEntitySchema<FinTypes.FinFeeAdjustmentType>('fee_adjustment', { id: { type: 'string' }, student_id: { type: 'string', ref: 'students' }, school_period_id: { type: 'number', ref: 'school_periods' }, adjustment_type: { type: 'string', enum: Object.values(FinTypes.FinFeeAdjustmentTypeEnum) }, amount: { type: 'number' }, reason: { type: ['string', 'null'] }, applied_invoice_id: { type: ['string', 'null'], ref: 'student_invoices' }, student_name: { type: ['string', 'null'] }, school_period_name: { type: ['string', 'null'] }, created_at: { type: ['string', 'null'], format: 'date-time' } }, { key: 'id', type: 'string', final: true, maxLength: 100 }, ['id', 'student_id', 'school_period_id', 'adjustment_type', 'amount']);
export const transportRoutesSchema: RxJsonSchema<FinTypes.FinTransportRouteType> = createEntitySchema<FinTypes.FinTransportRouteType>('transport_route', { id: { type: 'number' }, name: { type: 'string' }, cost_per_period: { type: 'number' }, gl_revenue_account_id: { type: 'number', ref: 'chart_of_accounts' }, gl_revenue_account_name: { type: ['string', 'null'] }, created_at: { type: 'string', format: 'date-time' }, updated_at: { type: 'string', format: 'date-time' } }, { key: 'id', type: 'number' }, ['id', 'name', 'cost_per_period', 'gl_revenue_account_id', 'created_at', 'updated_at']);
export const studentTransportAssignmentsSchema: RxJsonSchema<FinTypes.FinStudentTransportAssignmentType> = createEntitySchema<FinTypes.FinStudentTransportAssignmentType>('student_transport_assignment', { id: { type: 'string' }, student_id: { type: 'string', ref: 'students' }, route_id: { type: 'number', ref: 'transport_routes' }, school_period_id: { type: 'number', ref: 'school_periods' }, status: { type: 'string', enum: Object.values(FinTypes.FinTransportAssignmentStatusEnum) }, invoice_id: { type: ['string', 'null'], ref: 'student_invoices' }, cost_override: { type: ['number', 'null'] }, student_name: { type: ['string', 'null'] }, route_name: { type: ['string', 'null'] }, school_period_name: { type: ['string', 'null'] }, created_at: { type: 'string', format: 'date-time' }, updated_at: { type: 'string', format: 'date-time' } }, { key: 'id', type: 'string', final: true, maxLength: 100 }, ['id', 'student_id', 'route_id', 'school_period_id', 'status', 'created_at', 'updated_at']);
const studentInvoiceItemProperties: RxJsonSchema<FinTypes.FinStudentInvoiceItemType>['properties'] = { id: { type: 'string' }, invoice_id: { type: 'string' }, description: { type: 'string' }, amount: { type: 'number' }, fee_template_item_id: { type: ['string', 'null'] }, student_transport_assignment_id: { type: ['string', 'null'] }, fine_id: { type: ['string', 'null'] } };
export const studentInvoicesSchema: RxJsonSchema<FinTypes.FinStudentInvoiceType> = createEntitySchema<FinTypes.FinStudentInvoiceType>('student_invoice', { id: { type: 'string' }, student_id: { type: 'string', ref: 'students' }, invoice_number: { type: 'string' }, school_period_id: { type: 'number', ref: 'school_periods' }, issue_date: { type: 'string', format: 'date' }, due_date: { type: 'string', format: 'date' }, total_amount_billed: { type: 'number' }, amount_paid: { type: 'number', default: 0 }, status: { type: 'string', enum: Object.values(FinTypes.FinInvoiceStatusEnum) }, items: { type: ['array', 'null'], default: [], items: { type: 'object', properties: studentInvoiceItemProperties } }, student_name: { type: ['string', 'null'] }, school_period_name: { type: ['string', 'null'] }, deleted_at: { type: ['string', 'null'], format: 'date-time' }, created_at: { type: 'string', format: 'date-time' }, updated_at: { type: 'string', format: 'date-time' } }, { key: 'id', type: 'string', final: true, maxLength: 100 }, ['id', 'student_id', 'invoice_number', 'school_period_id', 'issue_date', 'status', 'created_at', 'updated_at']);
export const studentPaymentsSchema: RxJsonSchema<FinTypes.FinStudentPaymentType> = createEntitySchema<FinTypes.FinStudentPaymentType>('student_payment', { id: { type: 'string' }, student_id: { type: 'string', ref: 'students' }, receipt_no: { type: 'string' }, total_amount_paid: { type: 'number' }, payment_method: { type: ['string', 'null'] }, transaction_date: { type: 'string', format: 'date-time' }, reference_no: { type: ['string', 'null'] }, notes: { type: ['string', 'null'] }, student_name: { type: ['string', 'null'] }, created_at: { type: 'string', format: 'date-time' }, updated_at: { type: 'string', format: 'date-time' } }, { key: 'id', type: 'string', final: true, maxLength: 100 }, ['id', 'student_id', 'receipt_no', 'total_amount_paid', 'transaction_date', 'created_at', 'updated_at']);
export const invoicePaymentApplicationsSchema: RxJsonSchema<FinTypes.FinInvoicePaymentApplicationType> = createEntitySchema<FinTypes.FinInvoicePaymentApplicationType>('invoice_payment_application', { id: { type: 'string' }, payment_id: { type: 'string', ref: 'student_payments' }, invoice_item_id: { type: 'string', ref: 'student_invoice_items' }, amount_applied: { type: 'number' } }, { key: 'id', type: 'string', final: true, maxLength: 100 }, ['id', 'payment_id', 'invoice_item_id', 'amount_applied']);
const customerInvoiceItemProperties: RxJsonSchema<FinTypes.FinCustomerInvoiceItemType>['properties'] = { id: { type: 'string' }, invoice_id: { type: 'string' }, description: { type: ['string', 'null'] }, quantity: { type: ['number', 'null'] }, unit_price: { type: ['number', 'null'] }, amount: { type: ['number', 'null'] }, revenue_account_id: { type: ['number', 'null'] }, revenue_account_name: { type: ['string', 'null'] } };
export const customerInvoicesSchema: RxJsonSchema<FinTypes.FinCustomerInvoiceType> = createEntitySchema<FinTypes.FinCustomerInvoiceType>('customer_invoice', { id: { type: 'string' }, customer_id: { type: 'number', ref: 'customers' }, invoice_number: { type: 'string' }, issue_date: { type: 'string', format: 'date' }, due_date: { type: ['string', 'null'], format: 'date' }, total_amount: { type: ['number', 'null'] }, status: { type: ['string', 'null'], enum: Object.values(FinTypes.FinCustomerInvoiceStatusEnum) }, notes: { type: ['string', 'null'] }, items: { type: ['array', 'null'], default: [], items: { type: 'object', properties: customerInvoiceItemProperties } }, customer_name: { type: ['string', 'null'] }, created_at: { type: 'string', format: 'date-time' }, updated_at: { type: 'string', format: 'date-time' } }, { key: 'id', type: 'string', final: true, maxLength: 100 }, ['id', 'customer_id', 'invoice_number', 'issue_date', 'status', 'created_at', 'updated_at']);
export const supplierInvoicesSchema: RxJsonSchema<FinTypes.FinSupplierInvoiceType> = createEntitySchema<FinTypes.FinSupplierInvoiceType>('supplier_invoice', { id: { type: 'string' }, supplier_id: { type: 'number', ref: 'suppliers' }, invoice_number: { type: 'string' }, invoice_date: { type: 'string', format: 'date' }, due_date: { type: ['string', 'null'], format: 'date' }, total_amount: { type: 'number' }, amount_paid: { type: ['number', 'null'] }, status: { type: ['string', 'null'], enum: Object.values(FinTypes.FinSupplierInvoiceStatusEnum) }, purchase_order_id: { type: ['string', 'null'], ref: 'purchase_orders' }, notes: { type: ['string', 'null'] }, supplier_name: { type: ['string', 'null'] }, created_at: { type: 'string', format: 'date-time' }, updated_at: { type: 'string', format: 'date-time' } }, { key: 'id', type: 'string', final: true, maxLength: 100 }, ['id', 'supplier_id', 'invoice_number', 'invoice_date', 'total_amount', 'status', 'created_at', 'updated_at']);
const generalPaymentItemProperties: RxJsonSchema<FinTypes.FinGeneralPaymentItemType>['properties'] = { id: { type: 'string' }, general_payment_id: { type: 'string' }, description: { type: 'string' }, amount: { type: 'number' }, revenue_account_id: { type: 'number' }, revenue_account_name: { type: ['string', 'null'] } };
export const generalPaymentsSchema: RxJsonSchema<FinTypes.FinGeneralPaymentType> = createEntitySchema<FinTypes.FinGeneralPaymentType>('general_payment', { id: { type: 'string' }, payer_type: { type: 'string', enum: Object.values(FinTypes.FinGeneralPayerTypeEnum) }, payer_id: { type: ['string', 'null'] }, payer_name_external: { type: ['string', 'null'] }, payment_date: { type: 'string', format: 'date-time' }, total_amount_paid: { type: 'number' }, payment_method: { type: ['string', 'null'] }, reference_no: { type: ['string', 'null'] }, notes: { type: ['string', 'null'] }, items: { type: 'array', default: [], items: { type: 'object', properties: generalPaymentItemProperties } }, payer_name_resolved: { type: ['string', 'null'] }, created_at: { type: 'string', format: 'date-time' }, updated_at: { type: 'string', format: 'date-time' } }, { key: 'id', type: 'string', final: true, maxLength: 100 }, ['id', 'payer_type', 'payment_date', 'total_amount_paid', 'created_at', 'updated_at']);
export const generalLedgerEntriesSchema: RxJsonSchema<FinTypes.FinGeneralLedgerEntryType> = createEntitySchema<FinTypes.FinGeneralLedgerEntryType>(
  'general_ledger_entry', 
  { 
    id: { type: 'string' }, 
    transaction_date: { type: 'string', format: 'date-time' }, 
    effective_date: { type: 'string', format: 'date' },
    financial_year_id: { type: 'number', ref: 'financial_years' }, 
    account_id: { type: 'number', ref: 'chart_of_accounts' },
    debit: { type: ['number', 'null'] },
    credit: { type: ['number', 'null'] },
    description: { type: 'string' },
    source_table: { type: ['string', 'null'] },
    source_id: { type: ['string', 'null'] }
  }, 
  { key: 'id', type: 'string', final: true, maxLength: 100 }, 
  ['id', 'transaction_date', 'effective_date', 'financial_year_id', 'account_id', 'description']
);
