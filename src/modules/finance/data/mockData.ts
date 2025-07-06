// src/modules/finance/data/mockData.ts
import {
  FinancialYear, ExpenseCategory, ChartOfAccount, Bank, Supplier, FeeTemplate, FeeTemplateItem,
  ExpenseClaim, StudentOpeningBalance, FeeAdjustment, TransportRoute, StudentTransportAssignment,
  StudentInvoice, StudentInvoiceItem, StudentPayment, InvoicePaymentApplication, CustomerInvoice,
  SupplierInvoice, GeneralPayment, GeneralLedgerEntry,
  FinancialYearStatus, AccountType, AccountTemplateType, ExpenseClaimantType, OpeningBalanceType,
  FeeAdjustmentType, TransportAssignmentStatus, InvoiceStatus, CustomerInvoiceStatus, SupplierInvoiceStatus, GeneralPayerType
} from '../../../core/types';
import { suppliers, supplierInvoices } from '../../../globalMockData';

const generateId = (prefix: string = 'id') => `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

export const initialMockFinancialYears: FinancialYear[] = [ 
    { id: 1, name: 'FY 2023', start_date: '2023-07-01', end_date: '2024-06-30', status: FinancialYearStatus.CLOSED, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 2, name: 'FY 2024', start_date: '2024-07-01', end_date: '2025-06-30', status: FinancialYearStatus.OPEN, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 3, name: 'FY 2025', start_date: '2025-07-01', end_date: '2026-06-30', status: FinancialYearStatus.OPEN, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
];

export const initialMockExpenseCategories: ExpenseCategory[] = [
    {id: 1, name: 'Stationery'},
    {id: 2, name: 'Repairs & Maintenance'},
    {id: 3, name: 'Utilities'},
    {id: 4, name: 'Travel'},
    {id: 5, name: 'Staff Welfare'},
    {id: 6, name: 'Teaching Materials'},
    {id: 7, name: 'Laboratory Supplies'},
    {id: 8, name: 'Sports & Recreation'},
    {id: 9, name: 'Transport & Fuel'},
    {id: 10, name: 'Professional Services'},
    {id: 11, name: 'Insurance'},
    {id: 12, name: 'Marketing & Advertising'},
    {id: 13, name: 'Security Services'},
    {id: 14, name: 'Communication'},
    {id: 15, name: 'Food & Catering'}
];

export const initialMockChartOfAccounts: ChartOfAccount[] = [
    // Assets
    { id: 101, account_code: '1001', name: 'School Bank Account - KCB', type: AccountType.ASSET, template_type: AccountTemplateType.CORE, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 102, account_code: '1002', name: 'Petty Cash', type: AccountType.ASSET, template_type: AccountTemplateType.CORE, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 103, account_code: '1003', name: 'School Bank Account - Equity', type: AccountType.ASSET, template_type: AccountTemplateType.CORE, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 104, account_code: '1004', name: 'Accounts Receivable - Students', type: AccountType.ASSET, template_type: AccountTemplateType.CORE, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 105, account_code: '1005', name: 'Inventory - Teaching Materials', type: AccountType.ASSET, template_type: AccountTemplateType.CUSTOM, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 106, account_code: '1006', name: 'Fixed Assets - Furniture & Equipment', type: AccountType.ASSET, template_type: AccountTemplateType.CORE, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 107, account_code: '1007', name: 'Fixed Assets - Buildings', type: AccountType.ASSET, template_type: AccountTemplateType.CORE, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    // Liabilities
    { id: 201, account_code: '2001', name: 'Accounts Payable - Suppliers', type: AccountType.LIABILITY, template_type: AccountTemplateType.CORE, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 202, account_code: '2002', name: 'Accrued Salaries Payable', type: AccountType.LIABILITY, template_type: AccountTemplateType.CORE, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 203, account_code: '2003', name: 'Student Advance Payments', type: AccountType.LIABILITY, template_type: AccountTemplateType.CUSTOM, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 204, account_code: '2004', name: 'PAYE Tax Payable', type: AccountType.LIABILITY, template_type: AccountTemplateType.CORE, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 205, account_code: '2005', name: 'NHIF Contributions Payable', type: AccountType.LIABILITY, template_type: AccountTemplateType.CORE, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 206, account_code: '2006', name: 'NSSF Contributions Payable', type: AccountType.LIABILITY, template_type: AccountTemplateType.CORE, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    // Equity
    { id: 301, account_code: '3001', name: 'Retained Earnings', type: AccountType.EQUITY, template_type: AccountTemplateType.CORE, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 302, account_code: '3002', name: 'Capital Reserves', type: AccountType.EQUITY, template_type: AccountTemplateType.CORE, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    // Revenue
    { id: 401, account_code: '4001', name: 'Tuition Fees Revenue', type: AccountType.REVENUE, template_type: AccountTemplateType.CORE, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 402, account_code: '4002', name: 'Transport Fees Revenue', type: AccountType.REVENUE, template_type: AccountTemplateType.CUSTOM, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 403, account_code: '4003', name: 'Boarding Fees Revenue', type: AccountType.REVENUE, template_type: AccountTemplateType.CUSTOM, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 404, account_code: '4004', name: 'Extra-Curricular Fees Revenue', type: AccountType.REVENUE, template_type: AccountTemplateType.CUSTOM, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 405, account_code: '4005', name: 'Examination Fees Revenue', type: AccountType.REVENUE, template_type: AccountTemplateType.CUSTOM, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 406, account_code: '4006', name: 'Uniform & Books Sales Revenue', type: AccountType.REVENUE, template_type: AccountTemplateType.CUSTOM, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 407, account_code: '4007', name: 'Donations & Grants Revenue', type: AccountType.REVENUE, template_type: AccountTemplateType.CUSTOM, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 408, account_code: '4008', name: 'Interest Income', type: AccountType.REVENUE, template_type: AccountTemplateType.CORE, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    // Nutrition & Canteen Revenue Accounts
    { id: 409, account_code: '4009', name: 'Meal Plan Fees Revenue', type: AccountType.REVENUE, template_type: AccountTemplateType.CUSTOM, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 410, account_code: '4010', name: 'Canteen Sales Revenue', type: AccountType.REVENUE, template_type: AccountTemplateType.CUSTOM, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 411, account_code: '4011', name: 'Uniform Shop Sales Revenue', type: AccountType.REVENUE, template_type: AccountTemplateType.CUSTOM, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 412, account_code: '4012', name: 'Tuck Shop Sales Revenue', type: AccountType.REVENUE, template_type: AccountTemplateType.CUSTOM, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 413, account_code: '4013', name: 'Stationery Sales Revenue', type: AccountType.REVENUE, template_type: AccountTemplateType.CUSTOM, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 414, account_code: '4014', name: 'Sports Equipment Sales Revenue', type: AccountType.REVENUE, template_type: AccountTemplateType.CUSTOM, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    // Library Revenue
    { id: 415, account_code: '4015', name: 'Library Fines Revenue', type: AccountType.REVENUE, template_type: AccountTemplateType.CUSTOM, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 416, account_code: '4016', name: 'Library Book Replacement Revenue', type: AccountType.REVENUE, template_type: AccountTemplateType.CUSTOM, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    // Expenses
    { id: 501, account_code: '5001', name: 'Salaries & Wages', type: AccountType.EXPENSE, template_type: AccountTemplateType.CORE, is_active: true, expense_category_id: 5, expense_category_name: 'Staff Welfare', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 502, account_code: '5002', name: 'Teaching Staff Allowances', type: AccountType.EXPENSE, template_type: AccountTemplateType.CORE, is_active: true, expense_category_id: 5, expense_category_name: 'Staff Welfare', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 503, account_code: '5003', name: 'Stationery & Office Supplies', type: AccountType.EXPENSE, template_type: AccountTemplateType.CUSTOM, is_active: true, expense_category_id: 1, expense_category_name: 'Stationery', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 504, account_code: '5004', name: 'Teaching Materials & Resources', type: AccountType.EXPENSE, template_type: AccountTemplateType.CUSTOM, is_active: true, expense_category_id: 6, expense_category_name: 'Teaching Materials', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 505, account_code: '5005', name: 'Laboratory Supplies & Equipment', type: AccountType.EXPENSE, template_type: AccountTemplateType.CUSTOM, is_active: true, expense_category_id: 7, expense_category_name: 'Laboratory Supplies', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 506, account_code: '5006', name: 'Utilities - Electricity', type: AccountType.EXPENSE, template_type: AccountTemplateType.CORE, is_active: true, expense_category_id: 3, expense_category_name: 'Utilities', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 507, account_code: '5007', name: 'Utilities - Water', type: AccountType.EXPENSE, template_type: AccountTemplateType.CORE, is_active: true, expense_category_id: 3, expense_category_name: 'Utilities', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 508, account_code: '5008', name: 'Internet & Communication', type: AccountType.EXPENSE, template_type: AccountTemplateType.CORE, is_active: true, expense_category_id: 14, expense_category_name: 'Communication', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 509, account_code: '5009', name: 'Building Maintenance & Repairs', type: AccountType.EXPENSE, template_type: AccountTemplateType.CORE, is_active: true, expense_category_id: 2, expense_category_name: 'Repairs & Maintenance', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 510, account_code: '5010', name: 'Vehicle Maintenance & Fuel', type: AccountType.EXPENSE, template_type: AccountTemplateType.CUSTOM, is_active: true, expense_category_id: 9, expense_category_name: 'Transport & Fuel', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 511, account_code: '5011', name: 'Staff Training & Development', type: AccountType.EXPENSE, template_type: AccountTemplateType.CUSTOM, is_active: true, expense_category_id: 5, expense_category_name: 'Staff Welfare', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 512, account_code: '5012', name: 'Travel & Accommodation', type: AccountType.EXPENSE, template_type: AccountTemplateType.CORE, is_active: true, expense_category_id: 4, expense_category_name: 'Travel', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 513, account_code: '5013', name: 'Sports & Recreation Equipment', type: AccountType.EXPENSE, template_type: AccountTemplateType.CUSTOM, is_active: true, expense_category_id: 8, expense_category_name: 'Sports & Recreation', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 514, account_code: '5014', name: 'Security Services', type: AccountType.EXPENSE, template_type: AccountTemplateType.CUSTOM, is_active: true, expense_category_id: 13, expense_category_name: 'Security Services', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 515, account_code: '5015', name: 'Insurance Premiums', type: AccountType.EXPENSE, template_type: AccountTemplateType.CORE, is_active: true, expense_category_id: 11, expense_category_name: 'Insurance', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 516, account_code: '5016', name: 'Professional & Legal Services', type: AccountType.EXPENSE, template_type: AccountTemplateType.CUSTOM, is_active: true, expense_category_id: 10, expense_category_name: 'Professional Services', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 517, account_code: '5017', name: 'Marketing & Student Recruitment', type: AccountType.EXPENSE, template_type: AccountTemplateType.CUSTOM, is_active: true, expense_category_id: 12, expense_category_name: 'Marketing & Advertising', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 518, account_code: '5018', name: 'Food & Catering Services', type: AccountType.EXPENSE, template_type: AccountTemplateType.CUSTOM, is_active: true, expense_category_id: 15, expense_category_name: 'Food & Catering', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 519, account_code: '5019', name: 'Depreciation Expense', type: AccountType.EXPENSE, template_type: AccountTemplateType.CORE, is_active: true, expense_category_id: 2, expense_category_name: 'Repairs & Maintenance', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 520, account_code: '5020', name: 'Bank Charges & Interest', type: AccountType.EXPENSE, template_type: AccountTemplateType.CORE, is_active: true, expense_category_id: 10, expense_category_name: 'Professional Services', created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
];

export const initialMockBanks: Bank[] = [
    { id: 1, name: 'KCB Bank', account_no: '1234567890', gl_account_id: 101, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), gl_account_name: 'School Bank Account - KCB' },
    { id: 2, name: 'Equity Bank', account_no: '0987654321', gl_account_id: 103, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), gl_account_name: 'School Bank Account - Equity' },
    { id: 3, name: 'Co-operative Bank', account_no: '5432109876', gl_account_id: 101, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), gl_account_name: 'School Bank Account - KCB' },
    { id: 4, name: 'NCBA Bank', account_no: '6789012345', gl_account_id: 103, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), gl_account_name: 'School Bank Account - Equity' }
];

export const initialMockFeeTemplateItems: FeeTemplateItem[] = [
    { id: 'fti1', fee_template_id: 1, description: 'Tuition Fee', amount: 50000, revenue_account_id: 201, revenue_account_name: 'Tuition Fees Revenue' },
    { id: 'fti2', fee_template_id: 1, description: 'Transport Fee', amount: 10000, revenue_account_id: 202, revenue_account_name: 'Transport Fees Revenue' },
    { id: 'fti3', fee_template_id: 1, description: 'Lunch Program', amount: 7500, revenue_account_id: 201, revenue_account_name: 'Tuition Fees Revenue' }, 
    { id: 'fti4', fee_template_id: 2, description: 'Boarding Fee', amount: 25000, revenue_account_id: 201, revenue_account_name: 'Tuition Fees Revenue' },
];

export const initialMockFeeTemplates: FeeTemplate[] = [
    { id: 1, name: 'Day Scholars - Term 1 (2024)', school_period_id: 2, student_category_id: 2, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), school_period_name: 'Term 2 - AY 2023/2024', student_category_name: 'Day Scholar', items: initialMockFeeTemplateItems.filter(item => item.fee_template_id === 1) },
    { id: 2, name: 'Boarders - Term 1 (2024)', school_period_id: 2, student_category_id: 1, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), school_period_name: 'Term 2 - AY 2023/2024', student_category_name: 'Boarder', items: initialMockFeeTemplateItems.filter(item => item.fee_template_id === 2) },
];

export const initialMockExpenseClaims: ExpenseClaim[] = [
    { id: 'EXP001', claimant_type: ExpenseClaimantType.STAFF, claimant_id: 'STF001', claim_date: '2024-07-15', description: 'Travel allowance for workshop', amount: 5000, expense_category_id: 4, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), claimant_name: 'Michael Scott', expense_category_name: 'Travel' },
    { id: 'EXP002', claimant_type: ExpenseClaimantType.STAFF, claimant_id: 'STF002', claim_date: '2024-07-20', description: 'Purchase of office stationery', amount: 1500, expense_category_id: 1, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), claimant_name: 'Dwight Schrute', expense_category_name: 'Stationery' },
];

export const initialMockStudentOpeningBalances: StudentOpeningBalance[] = [
    { id: generateId(), student_id: 'S001', balance_type: OpeningBalanceType.DEBIT, amount: 10000, as_of_date: '2023-08-31', is_billed: true, student_name: 'Jim Halpert', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
];

export const initialMockFeeAdjustments: FeeAdjustment[] = [
    { id: generateId(), student_id: 'S001', school_period_id: 1, adjustment_type: FeeAdjustmentType.SCHOLARSHIP, amount: -5000, reason: 'Merit Scholarship', student_name: 'Jim Halpert', school_period_name: 'Term 1 - AY 2023/2024', created_at: new Date().toISOString() },
];

export const initialMockTransportRoutes: TransportRoute[] = [
    { id: 1, name: 'Route A - Westlands', cost_per_period: 12000, gl_revenue_account_id: 202, gl_revenue_account_name: 'Transport Fees Revenue', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
];

export const initialMockStudentTransportAssignments: StudentTransportAssignment[] = [
    { id: generateId(), student_id: 'S002', route_id: 1, school_period_id: 1, status: TransportAssignmentStatus.ACTIVE, student_name: 'Michael Scofield', route_name: 'Route A - Westlands', school_period_name: 'Term 1 - AY 2023/2024', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
];

export const initialMockStudentInvoiceItems: StudentInvoiceItem[] = [
    {id: 'sii_001', invoice_id: 'SINV001', description: 'Tuition Fee - Term 1', amount: 50000},
    {id: 'sii_002', invoice_id: 'SINV001', description: 'Transport Fee - Term 1', amount: 10000},
];

export const initialMockStudentInvoices: StudentInvoice[] = [
    {id: 'SINV001', student_id: 'S001', invoice_number: 'INV/2023/001', school_period_id: 1, issue_date: '2023-09-01', due_date: '2023-09-15', total_amount_billed: 60000, status: InvoiceStatus.PAID, student_name: 'Jim Halpert', school_period_name: 'Term 1 - AY 2023/2024', items: initialMockStudentInvoiceItems.filter(i => i.invoice_id === 'SINV001'), created_at: new Date().toISOString(), updated_at: new Date().toISOString(), amount_paid: 60000 }
];

export const initialMockStudentPayments: StudentPayment[] = [
    {id: 'SPAY001', student_id: 'S001', receipt_no: 'RCPT/2023/001', total_amount_paid: 60000, payment_method: 'Bank Transfer', transaction_date: '2023-09-05', reference_no: 'BANKTRN001', student_name: 'Jim Halpert', created_at: new Date().toISOString(), updated_at: new Date().toISOString()}
];

export const initialMockInvoicePaymentApplications: InvoicePaymentApplication[] = [
    {id: 'IPA001', payment_id: 'SPAY001', invoice_item_id: 'sii_001', amount_applied: 50000},
    {id: 'IPA002', payment_id: 'SPAY001', invoice_item_id: 'sii_002', amount_applied: 10000},
];

export const initialMockCustomerInvoices: CustomerInvoice[] = [
    {id: 'CINV001', customer_name: 'Parent Teachers Association', invoice_number: 'CI/2024/001', issue_date: '2024-07-15', due_date: '2024-08-15', total_amount: 25000, status: CustomerInvoiceStatus.PAID, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), customer_id: 1},
    {id: 'CINV002', customer_name: 'Local Community Centre', invoice_number: 'CI/2024/002', issue_date: '2024-07-20', due_date: '2024-08-20', total_amount: 15000, status: CustomerInvoiceStatus.DUE, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), customer_id: 2},
];

export const initialMockGeneralPayments: GeneralPayment[] = [
    {id: 'GPAY001', payment_date: '2024-07-28', total_amount_paid: 45000, payment_method: 'Bank Transfer', description: 'Monthly security services - July 2024', payer_type: GeneralPayerType.EXTERNAL, gl_expense_account_id: 514, gl_expense_account_name: 'Security Services', bank_account_id: 1, bank_account_name: 'KCB Bank', created_at: new Date().toISOString(), updated_at: new Date().toISOString()},
    {id: 'GPAY002', payment_date: '2024-07-30', total_amount_paid: 12000, payment_method: 'Mobile Money', description: 'Internet and communication services - July 2024', payer_type: GeneralPayerType.EXTERNAL, gl_expense_account_id: 508, gl_expense_account_name: 'Internet & Communication', bank_account_id: 2, bank_account_name: 'Equity Bank', created_at: new Date().toISOString(), updated_at: new Date().toISOString()},
    {id: 'GPAY003', payment_date: '2024-07-25', total_amount_paid: 8500, payment_method: 'Cheque', description: 'Water charges - July 2024', payer_type: GeneralPayerType.EXTERNAL, gl_expense_account_id: 507, gl_expense_account_name: 'Utilities - Water', bank_account_id: 1, bank_account_name: 'KCB Bank', created_at: new Date().toISOString(), updated_at: new Date().toISOString()}
];

export const initialMockGeneralLedgerEntries: GeneralLedgerEntry[] = [
     // Opening balance - Debit Bank Account
     {id: 'GLE001', transaction_date: '2024-07-01', effective_date: '2024-07-01', financial_year_id: 1, account_id: 101, debit: 500000, description: 'Opening balance - July 2024', created_at: new Date().toISOString(), updated_at: new Date().toISOString()},
     // Opening balance - Credit Retained Earnings
     {id: 'GLE002', transaction_date: '2024-07-01', effective_date: '2024-07-01', financial_year_id: 1, account_id: 301, credit: 500000, description: 'Opening balance - July 2024', created_at: new Date().toISOString(), updated_at: new Date().toISOString()},
     
     // Student fees collection - Debit Bank Account
     {id: 'GLE003', transaction_date: '2024-07-05', effective_date: '2024-07-05', financial_year_id: 1, account_id: 101, debit: 250000, description: 'Student fees collection - Term 3', created_at: new Date().toISOString(), updated_at: new Date().toISOString()},
     // Student fees collection - Credit Revenue
     {id: 'GLE004', transaction_date: '2024-07-05', effective_date: '2024-07-05', financial_year_id: 1, account_id: 401, credit: 250000, description: 'Student fees collection - Term 3', created_at: new Date().toISOString(), updated_at: new Date().toISOString()},
     
     // Payment to Text Book Centre - Debit Expense
     {id: 'GLE005', transaction_date: '2024-07-10', effective_date: '2024-07-10', financial_year_id: 1, account_id: 504, debit: 85000, description: 'Payment to Text Book Centre', created_at: new Date().toISOString(), updated_at: new Date().toISOString()},
     // Payment to Text Book Centre - Credit Bank Account
     {id: 'GLE006', transaction_date: '2024-07-10', effective_date: '2024-07-10', financial_year_id: 1, account_id: 101, credit: 85000, description: 'Payment to Text Book Centre', created_at: new Date().toISOString(), updated_at: new Date().toISOString()},
     
     // Monthly salaries payment - Debit Expense
     {id: 'GLE007', transaction_date: '2024-07-15', effective_date: '2024-07-15', financial_year_id: 1, account_id: 501, debit: 180000, description: 'Monthly salaries payment', created_at: new Date().toISOString(), updated_at: new Date().toISOString()},
     // Monthly salaries payment - Credit Bank Account
     {id: 'GLE008', transaction_date: '2024-07-15', effective_date: '2024-07-15', financial_year_id: 1, account_id: 103, credit: 180000, description: 'Monthly salaries payment', created_at: new Date().toISOString(), updated_at: new Date().toISOString()},
     
     // Transport fees collection - Debit Bank Account
     {id: 'GLE009', transaction_date: '2024-07-20', effective_date: '2024-07-20', financial_year_id: 1, account_id: 103, debit: 75000, description: 'Transport fees collection', created_at: new Date().toISOString(), updated_at: new Date().toISOString()},
     // Transport fees collection - Credit Revenue
     {id: 'GLE010', transaction_date: '2024-07-20', effective_date: '2024-07-20', financial_year_id: 1, account_id: 402, credit: 75000, description: 'Transport fees collection', created_at: new Date().toISOString(), updated_at: new Date().toISOString()},
     
     // Water utility payment - Debit Expense
     {id: 'GLE011', transaction_date: '2024-07-25', effective_date: '2024-07-25', financial_year_id: 1, account_id: 507, debit: 8500, description: 'Water utility payment', created_at: new Date().toISOString(), updated_at: new Date().toISOString()},
     // Water utility payment - Credit Bank Account
     {id: 'GLE012', transaction_date: '2024-07-25', effective_date: '2024-07-25', financial_year_id: 1, account_id: 101, credit: 8500, description: 'Water utility payment', created_at: new Date().toISOString(), updated_at: new Date().toISOString()},
     
     // Security services payment - Debit Expense
     {id: 'GLE013', transaction_date: '2024-07-28', effective_date: '2024-07-28', financial_year_id: 1, account_id: 514, debit: 45000, description: 'Security services payment', created_at: new Date().toISOString(), updated_at: new Date().toISOString()},
     // Security services payment - Credit Bank Account
     {id: 'GLE014', transaction_date: '2024-07-28', effective_date: '2024-07-28', financial_year_id: 1, account_id: 101, credit: 45000, description: 'Security services payment', created_at: new Date().toISOString(), updated_at: new Date().toISOString()},
     
     // Communication services payment - Debit Expense
     {id: 'GLE015', transaction_date: '2024-07-30', effective_date: '2024-07-30', financial_year_id: 1, account_id: 508, debit: 12000, description: 'Communication services payment', created_at: new Date().toISOString(), updated_at: new Date().toISOString()},
     // Communication services payment - Credit Bank Account
     {id: 'GLE016', transaction_date: '2024-07-30', effective_date: '2024-07-30', financial_year_id: 1, account_id: 103, credit: 12000, description: 'Communication services payment', created_at: new Date().toISOString(), updated_at: new Date().toISOString()},
     
     // CROSS-MODULE INTEGRATIONS
     
     // Nutrition Module Integrations
     // Student wallet deposit - Debit Bank Account
     {id: 'GLE017', transaction_date: '2024-07-28', effective_date: '2024-07-28', financial_year_id: 1, account_id: 101, debit: 2000, description: 'Student wallet deposit - Jim Halpert', created_at: new Date().toISOString(), updated_at: new Date().toISOString()},
     // Student wallet deposit - Credit Student Advance Payments
     {id: 'GLE018', transaction_date: '2024-07-28', effective_date: '2024-07-28', financial_year_id: 1, account_id: 203, credit: 2000, description: 'Student wallet deposit - Jim Halpert', created_at: new Date().toISOString(), updated_at: new Date().toISOString()},
     
     // Canteen sales - Debit Student Advance Payments
     {id: 'GLE019', transaction_date: '2024-07-29', effective_date: '2024-07-29', financial_year_id: 1, account_id: 203, debit: 500, description: 'Canteen sales - Jim Halpert snacks purchase', created_at: new Date().toISOString(), updated_at: new Date().toISOString()},
     // Canteen sales - Credit Revenue
     {id: 'GLE020', transaction_date: '2024-07-29', effective_date: '2024-07-29', financial_year_id: 1, account_id: 410, credit: 500, description: 'Canteen sales - Jim Halpert snacks purchase', created_at: new Date().toISOString(), updated_at: new Date().toISOString()},
     
     // Meal Plan Revenue - Debit Bank Account
     {id: 'GLE021', transaction_date: '2024-07-01', effective_date: '2024-07-01', financial_year_id: 1, account_id: 101, debit: 15000, description: 'Meal plan fees collection - Kevin Malone (Full Board)', created_at: new Date().toISOString(), updated_at: new Date().toISOString()},
     // Meal Plan Revenue - Credit Revenue
     {id: 'GLE022', transaction_date: '2024-07-01', effective_date: '2024-07-01', financial_year_id: 1, account_id: 409, credit: 15000, description: 'Meal plan fees collection - Kevin Malone (Full Board)', created_at: new Date().toISOString(), updated_at: new Date().toISOString()},
     
     // Library Module Integrations
     // Library fine - Debit Accounts Receivable
     {id: 'GLE023', transaction_date: '2024-06-25', effective_date: '2024-06-25', financial_year_id: 1, account_id: 104, debit: 50, description: 'Library fine - Jim Halpert overdue book', created_at: new Date().toISOString(), updated_at: new Date().toISOString()},
     // Library fine - Credit Revenue
     {id: 'GLE024', transaction_date: '2024-06-25', effective_date: '2024-06-25', financial_year_id: 1, account_id: 415, credit: 50, description: 'Library fine - Jim Halpert overdue book', created_at: new Date().toISOString(), updated_at: new Date().toISOString()},
     
     // HR/Payroll Module Integrations
     // Salary payment - Debit Expense
     {id: 'GLE025', transaction_date: '2024-06-30', effective_date: '2024-06-30', financial_year_id: 1, account_id: 501, debit: 142940, description: 'June payroll - Michael Scott net salary', created_at: new Date().toISOString(), updated_at: new Date().toISOString()},
     // Salary payment - Credit Bank Account
     {id: 'GLE026', transaction_date: '2024-06-30', effective_date: '2024-06-30', financial_year_id: 1, account_id: 103, credit: 142940, description: 'June payroll - Michael Scott net salary', created_at: new Date().toISOString(), updated_at: new Date().toISOString()},
     
     // Additional Merchant Sales - Debit Bank Account
     {id: 'GLE027', transaction_date: '2024-07-22', effective_date: '2024-07-22', financial_year_id: 1, account_id: 101, debit: 3500, description: 'Uniform shop sales', created_at: new Date().toISOString(), updated_at: new Date().toISOString()},
     // Additional Merchant Sales - Credit Revenue
     {id: 'GLE028', transaction_date: '2024-07-22', effective_date: '2024-07-22', financial_year_id: 1, account_id: 411, credit: 3500, description: 'Uniform shop sales', created_at: new Date().toISOString(), updated_at: new Date().toISOString()}
 ];

// Ensure all AppDataType keys for finance are exported
export { suppliers, supplierInvoices };
export const banks = initialMockBanks;
export const expenseCategories = initialMockExpenseCategories;
export const chartOfAccounts = initialMockChartOfAccounts;
export const expenseClaims = initialMockExpenseClaims;
export const studentOpeningBalances = initialMockStudentOpeningBalances;
export const feeAdjustments = initialMockFeeAdjustments;
export const transportRoutes = initialMockTransportRoutes;
export const studentTransportAssignments = initialMockStudentTransportAssignments;
export const studentInvoices = initialMockStudentInvoices;
export const studentInvoiceItems = initialMockStudentInvoiceItems;
export const studentPayments = initialMockStudentPayments;
export const invoicePaymentApplications = initialMockInvoicePaymentApplications;
export const customerInvoices = initialMockCustomerInvoices;
export const generalPayments = initialMockGeneralPayments;
export const generalLedgerEntries = initialMockGeneralLedgerEntries;
