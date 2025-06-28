// ABOUTME: Provides initial mock data for entities specific to the Finance module.
// ABOUTME: This data is used in "demo" mode and for seeding RxDB in "production" mode.

import * as types from './types';
import { generateId, generateNumericId } from '../../../hooks/useMockData'; // Assuming helpers are exported

export const initialMockFinancialYears: types.FinFinancialYearType[] = [ 
    { id: 1, name: 'FY 2023', start_date: '2023-07-01', end_date: '2024-06-30', status: types.FinFinancialYearStatusEnum.OPEN, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 2, name: 'FY 2024', start_date: '2024-07-01', end_date: '2025-06-30', status: types.FinFinancialYearStatusEnum.OPEN, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
];

export const initialMockExpenseCategories: types.FinExpenseCategoryType[] = [
    {id: 1, name: 'Stationery'},
    {id: 2, name: 'Repairs & Maintenance'},
    {id: 3, name: 'Utilities'},
    {id: 4, name: 'Travel'},
    {id: 5, name: 'Staff Welfare'},
];

export const initialMockChartOfAccounts: types.FinChartOfAccountType[] = [
    { id: 101, account_code: '1001', name: 'School Bank Account', type: types.FinAccountTypeEnum.ASSET, template_type: types.FinAccountTemplateTypeEnum.CORE, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 102, account_code: '1002', name: 'Petty Cash', type: types.FinAccountTypeEnum.ASSET, template_type: types.FinAccountTemplateTypeEnum.CORE, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 201, account_code: '2001', name: 'Tuition Fees Revenue', type: types.FinAccountTypeEnum.REVENUE, template_type: types.FinAccountTemplateTypeEnum.CORE, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 202, account_code: '2002', name: 'Transport Fees Revenue', type: types.FinAccountTypeEnum.REVENUE, template_type: types.FinAccountTemplateTypeEnum.CUSTOM, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 301, account_code: '3001', name: 'Salaries Expense', type: types.FinAccountTypeEnum.EXPENSE, template_type: types.FinAccountTemplateTypeEnum.CORE, is_active: true, expense_category_id: 5, expense_category_name: 'Staff Welfare', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 302, account_code: '3002', name: 'Stationery Expense', type: types.FinAccountTypeEnum.EXPENSE, template_type: types.FinAccountTemplateTypeEnum.CUSTOM, is_active: true, expense_category_id: 1, expense_category_name: 'Stationery', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
];

export const initialMockBanks: types.FinBankType[] = [
    { id: 1, name: 'KCB Bank', account_no: '1234567890', gl_account_id: 101, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), gl_account_name: 'School Bank Account' },
    { id: 2, name: 'Equity Bank', account_no: '0987654321', gl_account_id: 101, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), gl_account_name: 'School Bank Account' },
];

export const initialMockSuppliers: types.FinSupplierType[] = [
  {id: 1, name: 'Text Book Centre', phone: '0700111222', email: 'sales@textbookcentre.com', address: 'Kijabe Street, Nairobi', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  {id: 2, name: 'Savani\'s Bookshop', phone: '0722333444', email: 'info@savanis.co.ke', address: 'Moi Avenue, Nairobi', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
];

export const initialMockFeeTemplateItems: types.FinFeeTemplateItemType[] = [
    { id: 'fti1', fee_template_id: 1, description: 'Tuition Fee', amount: 50000, revenue_account_id: 201, revenue_account_name: 'Tuition Fees Revenue' },
    { id: 'fti2', fee_template_id: 1, description: 'Transport Fee', amount: 10000, revenue_account_id: 202, revenue_account_name: 'Transport Fees Revenue' },
    { id: 'fti3', fee_template_id: 1, description: 'Lunch Program', amount: 7500, revenue_account_id: 201, revenue_account_name: 'Tuition Fees Revenue' }, 
    { id: 'fti4', fee_template_id: 2, description: 'Boarding Fee', amount: 25000, revenue_account_id: 201, revenue_account_name: 'Tuition Fees Revenue' },
];

export const initialMockFeeTemplates: types.FinFeeTemplateType[] = [
    { id: 1, name: 'Day Scholars - Term 1 (2024)', school_period_id: 2, student_category_id: 2, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), school_period_name: 'Term 2 - AY 2023/2024', student_category_name: 'Day Scholar', items: initialMockFeeTemplateItems.filter(item => item.fee_template_id === 1) },
    { id: 2, name: 'Boarders - Term 1 (2024)', school_period_id: 2, student_category_id: 1, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), school_period_name: 'Term 2 - AY 2023/2024', student_category_name: 'Boarder', items: initialMockFeeTemplateItems.filter(item => item.fee_template_id === 2) },
];

export const initialMockExpenseClaims: types.FinExpenseClaimType[] = [
    { id: 'EXP001', claimant_type: types.FinExpenseClaimantTypeEnum.STAFF, claimant_id: 'STF001', claim_date: '2024-07-15', description: 'Travel allowance for workshop', amount: 5000, expense_category_id: 4, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), claimant_name: 'Michael Scott', expense_category_name: 'Travel' },
    { id: 'EXP002', claimant_type: types.FinExpenseClaimantTypeEnum.STAFF, claimant_id: 'STF002', claim_date: '2024-07-20', description: 'Purchase of office stationery', amount: 1500, expense_category_id: 1, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), claimant_name: 'Dwight Schrute', expense_category_name: 'Stationery' },
];

export const initialMockStudentOpeningBalances: types.FinStudentOpeningBalanceType[] = [
    { id: generateId(), student_id: 'S001', balance_type: types.FinOpeningBalanceTypeEnum.DEBIT, amount: 10000, as_of_date: '2023-08-31', is_billed: true, student_name: 'Jim Halpert', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
];

export const initialMockFeeAdjustments: types.FinFeeAdjustmentType[] = [
    { id: generateId(), student_id: 'S001', school_period_id: 1, adjustment_type: types.FinFeeAdjustmentTypeEnum.SCHOLARSHIP, amount: -5000, reason: 'Merit Scholarship', student_name: 'Jim Halpert', school_period_name: 'Term 1 - AY 2023/2024', created_at: new Date().toISOString() },
];

export const initialMockTransportRoutes: types.FinTransportRouteType[] = [
    { id: 1, name: 'Route A - Westlands', cost_per_period: 12000, gl_revenue_account_id: 202, gl_revenue_account_name: 'Transport Fees Revenue', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
];

export const initialMockStudentTransportAssignments: types.FinStudentTransportAssignmentType[] = [
    { id: generateId(), student_id: 'S002', route_id: 1, school_period_id: 1, status: types.FinTransportAssignmentStatusEnum.ACTIVE, student_name: 'Michael Scofield', route_name: 'Route A - Westlands', school_period_name: 'Term 1 - AY 2023/2024', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
];

export const initialMockStudentInvoiceItems: types.FinStudentInvoiceItemType[] = [
    {id: 'sii_001', invoice_id: 'SINV001', description: 'Tuition Fee - Term 1', amount: 50000, fee_template_item_id: 'fti1'},
    {id: 'sii_002', invoice_id: 'SINV001', description: 'Transport Fee - Term 1', amount: 10000, fee_template_item_id: 'fti2'},
];

export const initialMockStudentInvoices: types.FinStudentInvoiceType[] = [
    {id: 'SINV001', student_id: 'S001', invoice_number: 'INV/2023/001', school_period_id: 1, issue_date: '2023-09-01', due_date: '2023-09-15', total_amount_billed: 60000, amount_paid: 60000, status: types.FinInvoiceStatusEnum.PAID, student_name: 'Jim Halpert', school_period_name: 'Term 1 - AY 2023/2024', items: initialMockStudentInvoiceItems.filter(i => i.invoice_id === 'SINV001'), created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
];

export const initialMockStudentPayments: types.FinStudentPaymentType[] = [
    {id: 'SPAY001', student_id: 'S001', receipt_no: 'RCPT/2023/001', total_amount_paid: 60000, payment_method: 'Bank Transfer', transaction_date: '2023-09-05', reference_no: 'BANKTRN001', student_name: 'Jim Halpert', created_at: new Date().toISOString(), updated_at: new Date().toISOString()}
];

export const initialMockInvoicePaymentApplications: types.FinInvoicePaymentApplicationType[] = [
    {id: 'IPA001', payment_id: 'SPAY001', invoice_item_id: 'sii_001', amount_applied: 50000},
    {id: 'IPA002', payment_id: 'SPAY001', invoice_item_id: 'sii_002', amount_applied: 10000},
];

export const initialMockCustomerInvoices: types.FinCustomerInvoiceType[] = [];
export const initialMockSupplierInvoices: types.FinSupplierInvoiceType[] = [];
export const initialMockGeneralPayments: types.FinGeneralPaymentType[] = [];
export const initialMockGeneralLedgerEntries: types.FinGeneralLedgerEntryType[] = [];
