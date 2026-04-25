// src/modules/finance/data/mockData.ts
import {
  FinancialYear, ExpenseCategory, ChartOfAccount, Bank, Supplier, FeeTemplate, FeeTemplateItem,
  ExpenseClaim, StudentOpeningBalance, FeeAdjustment, TransportRoute, StudentTransportAssignment,
  StudentInvoice, StudentInvoiceItem, StudentPayment, InvoicePaymentApplication, CustomerInvoice,
  SupplierInvoice, GeneralPayment, GeneralLedgerEntry,
  FinancialYearStatus, AccountType, AccountTemplateType, ExpenseClaimantType, OpeningBalanceType,
  FeeAdjustmentType, TransportAssignmentStatus, InvoiceStatus, CustomerInvoiceStatus, SupplierInvoiceStatus, GeneralPayerType
} from '@/core/types';
import {
  FeeDueRecord, BalanceSheetItem, CashBookEntry, DayBookEntry, ReceiptTemplate,
  IncomeStatementItem, JournalEntry, PreviousSessionFee, StudentPaymentRecord, TrialBalanceItem
} from './types';
import { suppliers, supplierInvoices } from '@/globalMockData';

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
    {id: 'GPAY001', payment_date: '2024-07-28', total_amount_paid: 45000, payment_method: 'Bank Transfer', description: 'Monthly security services - July 2024', payer_type: GeneralPayerType.EXTERNAL, payer_name_resolved: 'SecureGuard Services Ltd', gl_expense_account_id: 514, gl_expense_account_name: 'Security Services', bank_account_id: 1, bank_account_name: 'KCB Bank', created_at: new Date().toISOString(), updated_at: new Date().toISOString()},
    {id: 'GPAY002', payment_date: '2024-07-30', total_amount_paid: 12000, payment_method: 'Mobile Money', description: 'Internet and communication services - July 2024', payer_type: GeneralPayerType.EXTERNAL, payer_name_resolved: 'Safaricom PLC', gl_expense_account_id: 508, gl_expense_account_name: 'Internet & Communication', bank_account_id: 2, bank_account_name: 'Equity Bank', created_at: new Date().toISOString(), updated_at: new Date().toISOString()},
    {id: 'GPAY003', payment_date: '2024-07-25', total_amount_paid: 8500, payment_method: 'Cheque', description: 'Water charges - July 2024', payer_type: GeneralPayerType.EXTERNAL, payer_name_resolved: 'Nairobi Water Company', gl_expense_account_id: 507, gl_expense_account_name: 'Utilities - Water', bank_account_id: 1, bank_account_name: 'KCB Bank', created_at: new Date().toISOString(), updated_at: new Date().toISOString()}
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

// === NEW MOCK DATA EXPORTS FOR FINANCE PAGES ===

// Source: FeesDueReportPage.tsx
export const initialMockFeeDueRecords: FeeDueRecord[] = [
  {
    id: 'due-1',
    student_id: '1',
    student_name: 'John Doe',
    admission_no: 'ADM-001',
    class_name: 'Grade 10 - A',
    guardian_name: 'Robert Doe',
    guardian_phone: '+254 712 345 678',
    total_amount_due: 50000,
    amount_paid: 0,
    balance_due: 50000,
    due_date: new Date(Date.now() - 15 * 86400000).toISOString().split('T')[0],
    days_overdue: 15,
    aging_category: '1-30 Days',
    school_period: 'Term 1 2024'
  },
  {
    id: 'due-2',
    student_id: '2',
    student_name: 'Jane Smith',
    admission_no: 'ADM-002',
    class_name: 'Grade 10 - B',
    guardian_name: 'Mary Smith',
    guardian_phone: '+254 723 456 789',
    total_amount_due: 45000,
    amount_paid: 20000,
    balance_due: 25000,
    due_date: new Date(Date.now() - 45 * 86400000).toISOString().split('T')[0],
    days_overdue: 45,
    aging_category: '31-60 Days',
    school_period: 'Term 1 2024'
  },
  {
    id: 'due-3',
    student_id: '3',
    student_name: 'Michael Johnson',
    admission_no: 'ADM-003',
    class_name: 'Grade 11 - A',
    guardian_name: 'James Johnson',
    guardian_phone: '+254 734 567 890',
    total_amount_due: 60000,
    amount_paid: 0,
    balance_due: 60000,
    due_date: new Date(Date.now() - 95 * 86400000).toISOString().split('T')[0],
    days_overdue: 95,
    aging_category: '90+ Days',
    school_period: 'Term 1 2024'
  },
  {
    id: 'due-4',
    student_id: '4',
    student_name: 'Emily Davis',
    admission_no: 'ADM-004',
    class_name: 'Grade 9 - A',
    guardian_name: 'David Davis',
    guardian_phone: '+254 745 678 901',
    total_amount_due: 55000,
    amount_paid: 55000,
    balance_due: 0,
    due_date: new Date(Date.now() + 10 * 86400000).toISOString().split('T')[0],
    days_overdue: -10,
    aging_category: 'Current',
    school_period: 'Term 1 2024'
  },
  {
    id: 'due-5',
    student_id: '5',
    student_name: 'Robert Wilson',
    admission_no: 'ADM-005',
    class_name: 'Grade 12 - A',
    guardian_name: 'Thomas Wilson',
    guardian_phone: '+254 756 789 012',
    total_amount_due: 70000,
    amount_paid: 30000,
    balance_due: 40000,
    due_date: new Date(Date.now() - 75 * 86400000).toISOString().split('T')[0],
    days_overdue: 75,
    aging_category: '61-90 Days',
    school_period: 'Term 1 2024'
  }
];

// Source: BalanceSheetPage.tsx
export const balanceSheetItems: BalanceSheetItem[] = [
  { id: 'bs-1', category: 'Asset', subcategory: 'Current Assets', account_name: 'Cash at Bank', amount: 2500000, percentage: 71.4 },
  { id: 'bs-2', category: 'Asset', subcategory: 'Current Assets', account_name: 'Petty Cash', amount: 50000, percentage: 1.4 },
  { id: 'bs-3', category: 'Asset', subcategory: 'Current Assets', account_name: 'Accounts Receivable', amount: 850000, percentage: 24.3 },
  { id: 'bs-4', category: 'Asset', subcategory: 'Current Assets', account_name: 'Prepaid Expenses', amount: 100000, percentage: 2.9 },
  { id: 'bs-5', category: 'Asset', subcategory: 'Non-Current Assets', account_name: 'Land and Buildings', amount: 15000000, percentage: 85.7 },
  { id: 'bs-6', category: 'Asset', subcategory: 'Non-Current Assets', account_name: 'Equipment and Furniture', amount: 2500000, percentage: 14.3 },
  { id: 'bs-7', category: 'Liability', subcategory: 'Current Liabilities', account_name: 'Accounts Payable', amount: 450000, percentage: 78.9 },
  { id: 'bs-8', category: 'Liability', subcategory: 'Current Liabilities', account_name: 'Accrued Expenses', amount: 120000, percentage: 21.1 },
  { id: 'bs-9', category: 'Liability', subcategory: 'Non-Current Liabilities', account_name: 'Long-term Loans', amount: 5000000, percentage: 100 },
  { id: 'bs-10', category: 'Equity', subcategory: 'Equity', account_name: "Capital / Owner's Equity", amount: 20000000, percentage: 100 },
  { id: 'bs-11', category: 'Equity', subcategory: 'Equity', account_name: 'Retained Earnings', amount: 930000, percentage: 4.7 }
];

// Source: CashBookPage.tsx
export const cashBookEntries: CashBookEntry[] = [
  { id: 'cash-1', transaction_date: new Date().toISOString().split('T')[0], description: 'Student Fee Payment - John Doe', reference_no: 'RCP-2024-001', payment_method: 'Cash', debit: 0, credit: 50000, balance: 50000, created_at: new Date().toISOString() },
  { id: 'cash-2', transaction_date: new Date().toISOString().split('T')[0], description: 'Office Supplies Purchase (Cash)', reference_no: 'EXP-2024-045', payment_method: 'Cash', debit: 5000, credit: 0, balance: 45000, created_at: new Date().toISOString() },
  { id: 'cash-3', transaction_date: new Date().toISOString().split('T')[0], description: 'Student Fee Payment - Jane Smith', reference_no: 'RCP-2024-002', payment_method: 'Cash', debit: 0, credit: 45000, balance: 90000, created_at: new Date().toISOString() },
  { id: 'cash-4', transaction_date: new Date().toISOString().split('T')[0], description: 'Petty Cash Replenishment', reference_no: 'CASH-2024-089', payment_method: 'Cash', debit: 20000, credit: 0, balance: 70000, created_at: new Date().toISOString() },
  { id: 'cash-5', transaction_date: new Date().toISOString().split('T')[0], description: 'Transport Fee Collection', reference_no: 'RCP-2024-003', payment_method: 'Cash', debit: 0, credit: 10000, balance: 80000, created_at: new Date().toISOString() },
  { id: 'cash-6', transaction_date: new Date().toISOString().split('T')[0], description: 'Canteen Payment - Supplier', reference_no: 'PAY-2024-090', payment_method: 'Cash', debit: 15000, credit: 0, balance: 65000, created_at: new Date().toISOString() }
];

// Source: DayBookPage.tsx
export const dayBookEntries: DayBookEntry[] = [
  { id: 'day-1', transaction_date: new Date().toISOString().split('T')[0], description: 'Student Fee Payment - John Doe', reference_no: 'RCP-2024-001', account_name: 'Student Fees Revenue', debit: 0, credit: 50000, source: 'Student Payment', created_at: new Date().toISOString() },
  { id: 'day-2', transaction_date: new Date().toISOString().split('T')[0], description: 'Office Supplies Purchase', reference_no: 'EXP-2024-045', account_name: 'Office Expenses', debit: 5000, credit: 0, source: 'Expense', created_at: new Date().toISOString() },
  { id: 'day-3', transaction_date: new Date().toISOString().split('T')[0], description: 'Student Fee Payment - Jane Smith', reference_no: 'RCP-2024-002', account_name: 'Student Fees Revenue', debit: 0, credit: 45000, source: 'Student Payment', created_at: new Date().toISOString() },
  { id: 'day-4', transaction_date: new Date().toISOString().split('T')[0], description: 'Salary Payment - Teaching Staff', reference_no: 'PAY-2024-089', account_name: 'Salaries Expense', debit: 150000, credit: 0, source: 'Payroll', created_at: new Date().toISOString() },
  { id: 'day-5', transaction_date: new Date().toISOString().split('T')[0], description: 'Transport Fee Collection', reference_no: 'RCP-2024-003', account_name: 'Transport Revenue', debit: 0, credit: 10000, source: 'Student Payment', created_at: new Date().toISOString() }
];

// Source: FeesReceiptTemplatePage.tsx
export const receiptTemplates: ReceiptTemplate[] = [
  {
    id: 'tpl-1',
    name: 'Default Receipt',
    school_name: 'Example School',
    school_address: '123 Education Street, City, Country',
    school_phone: '+123 456 7890',
    school_email: 'info@exampleschool.edu',
    header_text: 'OFFICIAL RECEIPT',
    footer_text: 'Thank you for your payment. Please keep this receipt for your records.',
    logo_url: '',
    is_default: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

// Source: IncomeStatementPage.tsx
export const incomeStatementItems: IncomeStatementItem[] = [
  { id: 'is-1', category: 'Revenue', account_name: 'Student Fees Revenue', amount: 3500000, percentage: 88.6 },
  { id: 'is-2', category: 'Revenue', account_name: 'Transport Revenue', amount: 450000, percentage: 11.4 },
  { id: 'is-3', category: 'Expense', account_name: 'Salaries Expense', amount: 1800000, percentage: 72.6 },
  { id: 'is-4', category: 'Expense', account_name: 'Office Expenses', amount: 320000, percentage: 12.9 },
  { id: 'is-5', category: 'Expense', account_name: 'Utilities Expense', amount: 150000, percentage: 6.1 },
  { id: 'is-6', category: 'Expense', account_name: 'Maintenance Expense', amount: 95000, percentage: 3.8 },
  { id: 'is-7', category: 'Expense', account_name: 'Transportation Expense', amount: 65000, percentage: 2.6 },
  { id: 'is-8', category: 'Expense', account_name: 'Marketing Expense', amount: 40000, percentage: 1.6 },
  { id: 'is-9', category: 'Expense', account_name: 'Other Expenses', amount: 15000, percentage: 0.4 }
];

// Source: JournalRegisterPage.tsx
export const journalEntries: JournalEntry[] = [
  { id: 'jv-1', voucher_no: 'JV-2024-001', transaction_date: new Date().toISOString().split('T')[0], description: 'Student Fee Payment - John Doe', reference: 'RCP-2024-001', debit_account: 'Cash at Bank', credit_account: 'Student Fees Revenue', debit_amount: 50000, credit_amount: 50000, status: 'Posted', created_at: new Date().toISOString() },
  { id: 'jv-2', voucher_no: 'JV-2024-002', transaction_date: new Date(Date.now() - 86400000).toISOString().split('T')[0], description: 'Office Supplies Purchase', reference: 'EXP-2024-045', debit_account: 'Office Expenses', credit_account: 'Cash at Bank', debit_amount: 5000, credit_amount: 5000, status: 'Posted', created_at: new Date(Date.now() - 86400000).toISOString() },
  { id: 'jv-3', voucher_no: 'JV-2024-003', transaction_date: new Date(Date.now() - 86400000 * 2).toISOString().split('T')[0], description: 'Salary Payment - Teaching Staff', reference: 'PAY-2024-089', debit_account: 'Salaries Expense', credit_account: 'Cash at Bank', debit_amount: 150000, credit_amount: 150000, status: 'Posted', created_at: new Date(Date.now() - 86400000 * 2).toISOString() },
  { id: 'jv-4', voucher_no: 'JV-2024-004', transaction_date: new Date(Date.now() - 86400000 * 3).toISOString().split('T')[0], description: 'Transport Fee Collection', reference: 'RCP-2024-003', debit_account: 'Cash at Bank', credit_account: 'Transport Revenue', debit_amount: 10000, credit_amount: 10000, status: 'Posted', created_at: new Date(Date.now() - 86400000 * 3).toISOString() },
  { id: 'jv-5', voucher_no: 'JV-2024-005', transaction_date: new Date(Date.now() - 86400000 * 5).toISOString().split('T')[0], description: 'Petty Cash Replenishment', reference: 'CASH-2024-089', debit_account: 'Petty Cash', credit_account: 'Cash at Bank', debit_amount: 20000, credit_amount: 20000, status: 'Posted', created_at: new Date(Date.now() - 86400000 * 5).toISOString() }
];

// Source: PreviousSessionFeesPage.tsx
export const previousSessionFees: PreviousSessionFee[] = [
  { id: 'psf-1', student_id: '1', student_name: 'John Doe', admission_no: 'ADM-001', class_name: 'Grade 10 - A', previous_session: 'Term 3 2023', carry_over_amount: 15000, amount_paid: 15000, balance_remaining: 0, status: 'Paid', current_session: 'Term 1 2024', notes: 'Fully paid in January', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'psf-2', student_id: '2', student_name: 'Jane Smith', admission_no: 'ADM-002', class_name: 'Grade 10 - B', previous_session: 'Term 3 2023', carry_over_amount: 20000, amount_paid: 10000, balance_remaining: 10000, status: 'Partial', current_session: 'Term 1 2024', notes: 'Partial payment, remaining balance to be paid', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'psf-3', student_id: '3', student_name: 'Michael Johnson', admission_no: 'ADM-003', class_name: 'Grade 11 - A', previous_session: 'Term 3 2023', carry_over_amount: 5000, amount_paid: 0, balance_remaining: 5000, status: 'Pending', current_session: 'Term 1 2024', notes: 'Outstanding balance from previous session', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'psf-4', student_id: '4', student_name: 'Emily Davis', admission_no: 'ADM-004', class_name: 'Grade 9 - A', previous_session: 'Term 2 2023', carry_over_amount: 10000, amount_paid: 0, balance_remaining: 0, status: 'Waived', current_session: 'Term 1 2024', notes: 'Waived due to scholarship', created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
];

// Source: StudentsPaidBookPage.tsx
export const studentPaymentRecords: StudentPaymentRecord[] = [
  { id: 'pay-1', student_id: '1', student_name: 'John Doe', admission_no: 'ADM-001', class_name: 'Grade 10 - A', receipt_no: 'RCP-2024-001', transaction_date: new Date().toISOString().split('T')[0], amount_paid: 50000, payment_method: 'Cash', reference_no: 'REF-001', fee_type: 'Tuition Fee', created_at: new Date().toISOString() },
  { id: 'pay-2', student_id: '2', student_name: 'Jane Smith', admission_no: 'ADM-002', class_name: 'Grade 10 - B', receipt_no: 'RCP-2024-002', transaction_date: new Date().toISOString().split('T')[0], amount_paid: 45000, payment_method: 'Bank Transfer', reference_no: 'REF-002', fee_type: 'Tuition Fee', created_at: new Date().toISOString() },
  { id: 'pay-3', student_id: '3', student_name: 'Michael Johnson', admission_no: 'ADM-003', class_name: 'Grade 11 - A', receipt_no: 'RCP-2024-003', transaction_date: new Date(Date.now() - 86400000).toISOString().split('T')[0], amount_paid: 60000, payment_method: 'M-Pesa', reference_no: 'REF-003', fee_type: 'Tuition Fee', created_at: new Date(Date.now() - 86400000).toISOString() },
  { id: 'pay-4', student_id: '1', student_name: 'John Doe', admission_no: 'ADM-001', class_name: 'Grade 10 - A', receipt_no: 'RCP-2024-004', transaction_date: new Date(Date.now() - 86400000 * 2).toISOString().split('T')[0], amount_paid: 10000, payment_method: 'Cash', reference_no: 'REF-004', fee_type: 'Activity Fee', created_at: new Date(Date.now() - 86400000 * 2).toISOString() },
  { id: 'pay-5', student_id: '4', student_name: 'Emily Davis', admission_no: 'ADM-004', class_name: 'Grade 9 - A', receipt_no: 'RCP-2024-005', transaction_date: new Date(Date.now() - 86400000 * 3).toISOString().split('T')[0], amount_paid: 55000, payment_method: 'Bank Transfer', reference_no: 'REF-005', fee_type: 'Tuition Fee', created_at: new Date(Date.now() - 86400000 * 3).toISOString() }
];

// Source: TrialBalancePage.tsx
export const trialBalanceItems: TrialBalanceItem[] = [
  { id: 'tb-1', account_code: '1001', account_name: 'Cash at Bank', account_type: 'Asset', debit_balance: 2500000, credit_balance: 0 },
  { id: 'tb-2', account_code: '1002', account_name: 'Petty Cash', account_type: 'Asset', debit_balance: 50000, credit_balance: 0 },
  { id: 'tb-3', account_code: '1003', account_name: 'Accounts Receivable', account_type: 'Asset', debit_balance: 850000, credit_balance: 0 },
  { id: 'tb-4', account_code: '2001', account_name: 'Accounts Payable', account_type: 'Liability', debit_balance: 0, credit_balance: 450000 },
  { id: 'tb-5', account_code: '2002', account_name: 'Accrued Expenses', account_type: 'Liability', debit_balance: 0, credit_balance: 120000 },
  { id: 'tb-6', account_code: '3001', account_name: 'Capital / Equity', account_type: 'Equity', debit_balance: 0, credit_balance: 2000000 },
  { id: 'tb-7', account_code: '4001', account_name: 'Student Fees Revenue', account_type: 'Revenue', debit_balance: 0, credit_balance: 3500000 },
  { id: 'tb-8', account_code: '4002', account_name: 'Transport Revenue', account_type: 'Revenue', debit_balance: 0, credit_balance: 450000 },
  { id: 'tb-9', account_code: '5001', account_name: 'Salaries Expense', account_type: 'Expense', debit_balance: 1800000, credit_balance: 0 },
  { id: 'tb-10', account_code: '5002', account_name: 'Office Expenses', account_type: 'Expense', debit_balance: 320000, credit_balance: 0 },
  { id: 'tb-11', account_code: '5003', account_name: 'Utilities Expense', account_type: 'Expense', debit_balance: 150000, credit_balance: 0 },
  { id: 'tb-12', account_code: '5004', account_name: 'Maintenance Expense', account_type: 'Expense', debit_balance: 95000, credit_balance: 0 }
];
