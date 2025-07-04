// src/modules/finance/data/mockData.ts
import {
  FinancialYear, ExpenseCategory, ChartOfAccount, Bank, Supplier, FeeTemplate, FeeTemplateItem,
  ExpenseClaim, StudentOpeningBalance, FeeAdjustment, TransportRoute, StudentTransportAssignment,
  StudentInvoice, StudentInvoiceItem, StudentPayment, InvoicePaymentApplication, CustomerInvoice,
  SupplierInvoice, GeneralPayment, GeneralLedgerEntry,
  FinancialYearStatus, AccountType, AccountTemplateType, ExpenseClaimantType, OpeningBalanceType,
  FeeAdjustmentType, TransportAssignmentStatus, InvoiceStatus, CustomerInvoiceStatus, SupplierInvoiceStatus, GeneralPayerType
} from '../../../core/types';

const generateId = (prefix: string = 'id') => `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

export const initialMockFinancialYears: FinancialYear[] = [ 
    { id: 1, name: 'FY 2023', start_date: '2023-07-01', end_date: '2024-06-30', status: FinancialYearStatus.CLOSED, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 2, name: 'FY 2024', start_date: '2024-07-01', end_date: '2025-06-30', status: FinancialYearStatus.OPEN, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 3, name: 'FY 2025', start_date: '2025-07-01', end_date: '2026-06-30', status: FinancialYearStatus.PLANNING, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
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

export const initialMockSuppliers: Supplier[] = [
  {id: 1, name: 'Text Book Centre', phone: '0700111222', email: 'sales@textbookcentre.com', address: 'Kijabe Street, Nairobi', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  {id: 2, name: 'Savani\'s Bookshop', phone: '0722333444', email: 'info@savanis.co.ke', address: 'Moi Avenue, Nairobi', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  {id: 3, name: 'Kenya Literature Bureau', phone: '0733555666', email: 'orders@klb.co.ke', address: 'Bellevue Drive, Nairobi', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  {id: 4, name: 'Longhorn Publishers', phone: '0744777888', email: 'sales@longhorn.co.ke', address: 'Funzi Road, Nairobi', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  {id: 5, name: 'Office Depot Kenya', phone: '0755999000', email: 'procurement@officedepot.co.ke', address: 'Mombasa Road, Nairobi', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  {id: 6, name: 'Nakumatt Supplies', phone: '0766111222', email: 'corporate@nakumatt.co.ke', address: 'Kimathi Street, Nairobi', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  {id: 7, name: 'Scientific Equipment Ltd', phone: '0777333444', email: 'lab@scientificequip.co.ke', address: 'Industrial Area, Nairobi', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  {id: 8, name: 'Smart Security Systems', phone: '0788555666', email: 'info@smartsecurity.co.ke', address: 'Westlands, Nairobi', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  {id: 9, name: 'Kenya Power & Lighting', phone: '0799777888', email: 'billing@kplc.co.ke', address: 'Stima Plaza, Nairobi', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  {id: 10, name: 'Fresh Foods Catering', phone: '0711222333', email: 'catering@freshfoods.co.ke', address: 'Ngong Road, Nairobi', created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
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
    {id: 'SINV001', student_id: 'S001', invoice_number: 'INV/2023/001', school_period_id: 1, issue_date: '2023-09-01', due_date: '2023-09-15', total_amount_billed: 60000, amount_paid: 60000, status: InvoiceStatus.PAID, student_name: 'Jim Halpert', school_period_name: 'Term 1 - AY 2023/2024', items: initialMockStudentInvoiceItems.filter(i => i.invoice_id === 'SINV001'), created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
];

export const initialMockStudentPayments: StudentPayment[] = [
    {id: 'SPAY001', student_id: 'S001', receipt_no: 'RCPT/2023/001', total_amount_paid: 60000, payment_method: 'Bank Transfer', transaction_date: '2023-09-05', reference_no: 'BANKTRN001', student_name: 'Jim Halpert', created_at: new Date().toISOString(), updated_at: new Date().toISOString()}
];

export const initialMockInvoicePaymentApplications: InvoicePaymentApplication[] = [
    {id: 'IPA001', payment_id: 'SPAY001', invoice_item_id: 'sii_001', amount_applied: 50000},
    {id: 'IPA002', payment_id: 'SPAY001', invoice_item_id: 'sii_002', amount_applied: 10000},
];

export const initialMockCustomerInvoices: CustomerInvoice[] = [
    {id: 'CINV001', customer_name: 'Parent Teachers Association', invoice_number: 'CI/2024/001', issue_date: '2024-07-15', due_date: '2024-08-15', total_amount: 25000, amount_paid: 25000, status: CustomerInvoiceStatus.PAID, description: 'Fundraising event catering services', gl_revenue_account_id: 407, gl_revenue_account_name: 'Donations & Grants Revenue', created_at: new Date().toISOString(), updated_at: new Date().toISOString()},
    {id: 'CINV002', customer_name: 'Local Community Centre', invoice_number: 'CI/2024/002', issue_date: '2024-07-20', due_date: '2024-08-20', total_amount: 15000, amount_paid: 0, status: CustomerInvoiceStatus.OUTSTANDING, description: 'Hall rental for weekend workshops', gl_revenue_account_id: 408, gl_revenue_account_name: 'Interest Income', created_at: new Date().toISOString(), updated_at: new Date().toISOString()}
];

export const initialMockSupplierInvoices: SupplierInvoice[] = [
    {id: 'SINV001', supplier_id: 1, supplier_name: 'Text Book Centre', invoice_number: 'TBC/2024/1256', invoice_date: '2024-07-10', due_date: '2024-08-10', total_amount: 85000, amount_paid: 85000, status: SupplierInvoiceStatus.PAID, description: 'Term 3 textbooks and reading materials', gl_expense_account_id: 504, gl_expense_account_name: 'Teaching Materials & Resources', created_at: new Date().toISOString(), updated_at: new Date().toISOString()},
    {id: 'SINV002', supplier_id: 3, supplier_name: 'Kenya Literature Bureau', invoice_number: 'KLB/2024/0789', invoice_date: '2024-07-15', due_date: '2024-08-15', total_amount: 45000, amount_paid: 0, status: SupplierInvoiceStatus.OUTSTANDING, description: 'Literature books for Form 3 & 4', gl_expense_account_id: 504, gl_expense_account_name: 'Teaching Materials & Resources', created_at: new Date().toISOString(), updated_at: new Date().toISOString()},
    {id: 'SINV003', supplier_id: 7, supplier_name: 'Scientific Equipment Ltd', invoice_number: 'SEL/2024/0456', invoice_date: '2024-07-18', due_date: '2024-08-18', total_amount: 120000, amount_paid: 60000, status: SupplierInvoiceStatus.PARTIALLY_PAID, description: 'Chemistry lab equipment and chemicals', gl_expense_account_id: 505, gl_expense_account_name: 'Laboratory Supplies & Equipment', created_at: new Date().toISOString(), updated_at: new Date().toISOString()},
    {id: 'SINV004', supplier_id: 9, supplier_name: 'Kenya Power & Lighting', invoice_number: 'KPLC/2024/789654', invoice_date: '2024-07-25', due_date: '2024-08-25', total_amount: 35000, amount_paid: 35000, status: SupplierInvoiceStatus.PAID, description: 'July 2024 electricity charges', gl_expense_account_id: 506, gl_expense_account_name: 'Utilities - Electricity', created_at: new Date().toISOString(), updated_at: new Date().toISOString()}
];

export const initialMockGeneralPayments: GeneralPayment[] = [
    {id: 'GPAY001', payee_name: 'G4S Security Services', payment_date: '2024-07-28', amount: 45000, payment_method: 'Bank Transfer', reference_no: 'BT240728001', description: 'Monthly security services - July 2024', payer_type: GeneralPayerType.SCHOOL, gl_expense_account_id: 514, gl_expense_account_name: 'Security Services', bank_account_id: 1, bank_account_name: 'KCB Bank', created_at: new Date().toISOString(), updated_at: new Date().toISOString()},
    {id: 'GPAY002', payee_name: 'Safaricom Ltd', payment_date: '2024-07-30', amount: 12000, payment_method: 'Mobile Money', reference_no: 'MM240730002', description: 'Internet and communication services - July 2024', payer_type: GeneralPayerType.SCHOOL, gl_expense_account_id: 508, gl_expense_account_name: 'Internet & Communication', bank_account_id: 2, bank_account_name: 'Equity Bank', created_at: new Date().toISOString(), updated_at: new Date().toISOString()},
    {id: 'GPAY003', payee_name: 'Water & Sewerage Company', payment_date: '2024-07-25', amount: 8500, payment_method: 'Cheque', reference_no: 'CHQ240725003', description: 'Water charges - July 2024', payer_type: GeneralPayerType.SCHOOL, gl_expense_account_id: 507, gl_expense_account_name: 'Utilities - Water', bank_account_id: 1, bank_account_name: 'KCB Bank', created_at: new Date().toISOString(), updated_at: new Date().toISOString()}
];

export const initialMockGeneralLedgerEntries: GeneralLedgerEntry[] = [
    {id: 'GLE001', transaction_date: '2024-07-01', reference_no: 'JE240701001', description: 'Opening balance - July 2024', debit_account_id: 101, debit_account_name: 'School Bank Account - KCB', debit_amount: 500000, credit_account_id: 301, credit_account_name: 'Retained Earnings', credit_amount: 500000, created_at: new Date().toISOString(), updated_at: new Date().toISOString()},
    {id: 'GLE002', transaction_date: '2024-07-05', reference_no: 'SINV001', description: 'Student fees collection - Term 3', debit_account_id: 101, debit_account_name: 'School Bank Account - KCB', debit_amount: 250000, credit_account_id: 401, credit_account_name: 'Tuition Fees Revenue', credit_amount: 250000, created_at: new Date().toISOString(), updated_at: new Date().toISOString()},
    {id: 'GLE003', transaction_date: '2024-07-10', reference_no: 'SINV001PAY', description: 'Payment to Text Book Centre', debit_account_id: 504, debit_account_name: 'Teaching Materials & Resources', debit_amount: 85000, credit_account_id: 101, credit_account_name: 'School Bank Account - KCB', credit_amount: 85000, created_at: new Date().toISOString(), updated_at: new Date().toISOString()},
    {id: 'GLE004', transaction_date: '2024-07-15', reference_no: 'SPAY001', description: 'Monthly salaries payment', debit_account_id: 501, debit_account_name: 'Salaries & Wages', debit_amount: 180000, credit_account_id: 103, credit_account_name: 'School Bank Account - Equity', credit_amount: 180000, created_at: new Date().toISOString(), updated_at: new Date().toISOString()},
    {id: 'GLE005', transaction_date: '2024-07-20', reference_no: 'TRANS001', description: 'Transport fees collection', debit_account_id: 103, debit_account_name: 'School Bank Account - Equity', debit_amount: 75000, credit_account_id: 402, credit_account_name: 'Transport Fees Revenue', credit_amount: 75000, created_at: new Date().toISOString(), updated_at: new Date().toISOString()},
    {id: 'GLE006', transaction_date: '2024-07-25', reference_no: 'GPAY003', description: 'Water utility payment', debit_account_id: 507, debit_account_name: 'Utilities - Water', debit_amount: 8500, credit_account_id: 101, credit_account_name: 'School Bank Account - KCB', credit_amount: 8500, created_at: new Date().toISOString(), updated_at: new Date().toISOString()},
    {id: 'GLE007', transaction_date: '2024-07-28', reference_no: 'GPAY001', description: 'Security services payment', debit_account_id: 514, debit_account_name: 'Security Services', debit_amount: 45000, credit_account_id: 101, credit_account_name: 'School Bank Account - KCB', credit_amount: 45000, created_at: new Date().toISOString(), updated_at: new Date().toISOString()},
    {id: 'GLE008', transaction_date: '2024-07-30', reference_no: 'GPAY002', description: 'Communication services payment', debit_account_id: 508, debit_account_name: 'Internet & Communication', debit_amount: 12000, credit_account_id: 103, credit_account_name: 'School Bank Account - Equity', credit_amount: 12000, created_at: new Date().toISOString(), updated_at: new Date().toISOString()},
    
    // CROSS-MODULE INTEGRATIONS
    
    // Nutrition Module Integrations
    {id: 'GLE009', transaction_date: '2024-07-28', reference_no: 'WTX001', description: 'Student wallet deposit - Jim Halpert', debit_account_id: 101, debit_account_name: 'School Bank Account - KCB', debit_amount: 2000, credit_account_id: 203, credit_account_name: 'Student Advance Payments', credit_amount: 2000, created_at: new Date().toISOString(), updated_at: new Date().toISOString()},
    {id: 'GLE010', transaction_date: '2024-07-29', reference_no: 'WTX002', description: 'Canteen sales - Jim Halpert snacks purchase', debit_account_id: 203, debit_account_name: 'Student Advance Payments', debit_amount: 500, credit_account_id: 410, credit_account_name: 'Canteen Sales Revenue', credit_amount: 500, created_at: new Date().toISOString(), updated_at: new Date().toISOString()},
    {id: 'GLE011', transaction_date: '2024-07-25', reference_no: 'WTX003', description: 'Student wallet deposit - Pam Beesly', debit_account_id: 101, debit_account_name: 'School Bank Account - KCB', debit_amount: 1500, credit_account_id: 203, credit_account_name: 'Student Advance Payments', credit_amount: 1500, created_at: new Date().toISOString(), updated_at: new Date().toISOString()},
    {id: 'GLE012', transaction_date: '2024-07-26', reference_no: 'WTX004', description: 'Canteen sales - Pam Beesly lunch purchase', debit_account_id: 203, debit_account_name: 'Student Advance Payments', debit_amount: 300, credit_account_id: 410, credit_account_name: 'Canteen Sales Revenue', credit_amount: 300, created_at: new Date().toISOString(), updated_at: new Date().toISOString()},
    {id: 'GLE013', transaction_date: '2024-07-27', reference_no: 'WTX005', description: 'Canteen sales - Pam Beesly juice & biscuits', debit_account_id: 203, debit_account_name: 'Student Advance Payments', debit_amount: 150, credit_account_id: 410, credit_account_name: 'Canteen Sales Revenue', credit_amount: 150, created_at: new Date().toISOString(), updated_at: new Date().toISOString()},
    {id: 'GLE014', transaction_date: '2024-07-30', reference_no: 'WTX006', description: 'Canteen sales - Jim Halpert rice & chicken', debit_account_id: 203, debit_account_name: 'Student Advance Payments', debit_amount: 250, credit_account_id: 410, credit_account_name: 'Canteen Sales Revenue', credit_amount: 250, created_at: new Date().toISOString(), updated_at: new Date().toISOString()},
    
    // Meal Plan Revenue
    {id: 'GLE015', transaction_date: '2024-07-01', reference_no: 'MEAL001', description: 'Meal plan fees collection - Kevin Malone (Full Board)', debit_account_id: 101, debit_account_name: 'School Bank Account - KCB', debit_amount: 15000, credit_account_id: 409, credit_account_name: 'Meal Plan Fees Revenue', credit_amount: 15000, created_at: new Date().toISOString(), updated_at: new Date().toISOString()},
    {id: 'GLE016', transaction_date: '2024-07-01', reference_no: 'MEAL002', description: 'Meal plan fees collection - Angela Martin (Standard Lunch)', debit_account_id: 101, debit_account_name: 'School Bank Account - KCB', debit_amount: 7500, credit_account_id: 409, credit_account_name: 'Meal Plan Fees Revenue', credit_amount: 7500, created_at: new Date().toISOString(), updated_at: new Date().toISOString()},
    {id: 'GLE017', transaction_date: '2024-07-01', reference_no: 'MEAL003', description: 'Meal plan fees collection - Stanley Hudson (Breakfast Only)', debit_account_id: 101, debit_account_name: 'School Bank Account - KCB', debit_amount: 3000, credit_account_id: 409, credit_account_name: 'Meal Plan Fees Revenue', credit_amount: 3000, created_at: new Date().toISOString(), updated_at: new Date().toISOString()},
    {id: 'GLE018', transaction_date: '2024-07-01', reference_no: 'MEAL004', description: 'Meal plan fees collection - Kelly Kapoor (Vegetarian Plan)', debit_account_id: 101, debit_account_name: 'School Bank Account - KCB', debit_amount: 13000, credit_account_id: 409, credit_account_name: 'Meal Plan Fees Revenue', credit_amount: 13000, created_at: new Date().toISOString(), updated_at: new Date().toISOString()},
    
    // Library Module Integrations
    {id: 'GLE019', transaction_date: '2024-06-25', reference_no: 'FINE001', description: 'Library fine - Jim Halpert overdue book', debit_account_id: 104, debit_account_name: 'Accounts Receivable - Students', debit_amount: 50, credit_account_id: 415, credit_account_name: 'Library Fines Revenue', credit_amount: 50, created_at: new Date().toISOString(), updated_at: new Date().toISOString()},
    {id: 'GLE020', transaction_date: '2024-05-16', reference_no: 'FINE002', description: 'Library book replacement - Michael Scott lost book', debit_account_id: 104, debit_account_name: 'Accounts Receivable - Students', debit_amount: 2500, credit_account_id: 416, credit_account_name: 'Library Book Replacement Revenue', credit_amount: 2500, created_at: new Date().toISOString(), updated_at: new Date().toISOString()},
    {id: 'GLE021', transaction_date: '2024-07-20', reference_no: 'FINE003', description: 'Library fine - Pam Beesly overdue book (5 days)', debit_account_id: 104, debit_account_name: 'Accounts Receivable - Students', debit_amount: 75, credit_account_id: 415, credit_account_name: 'Library Fines Revenue', credit_amount: 75, created_at: new Date().toISOString(), updated_at: new Date().toISOString()},
    {id: 'GLE022', transaction_date: '2024-07-15', reference_no: 'FINE004PAY', description: 'Library fine payment - Stanley Hudson damaged book', debit_account_id: 101, debit_account_name: 'School Bank Account - KCB', debit_amount: 100, credit_account_id: 415, credit_account_name: 'Library Fines Revenue', credit_amount: 100, created_at: new Date().toISOString(), updated_at: new Date().toISOString()},
    
    // HR/Payroll Module Integrations
    {id: 'GLE023', transaction_date: '2024-06-30', reference_no: 'PSLP001', description: 'June payroll - Michael Scott net salary', debit_account_id: 501, debit_account_name: 'Salaries & Wages', debit_amount: 142940, credit_account_id: 103, credit_account_name: 'School Bank Account - Equity', credit_amount: 142940, created_at: new Date().toISOString(), updated_at: new Date().toISOString()},
    {id: 'GLE024', transaction_date: '2024-06-30', reference_no: 'PSLP001TAX', description: 'June payroll - Michael Scott PAYE deduction', debit_account_id: 501, debit_account_name: 'Salaries & Wages', debit_amount: 40000, credit_account_id: 204, credit_account_name: 'PAYE Tax Payable', credit_amount: 40000, created_at: new Date().toISOString(), updated_at: new Date().toISOString()},
    {id: 'GLE025', transaction_date: '2024-06-30', reference_no: 'PSLP001NHIF', description: 'June payroll - Michael Scott NHIF deduction', debit_account_id: 501, debit_account_name: 'Salaries & Wages', debit_amount: 1700, credit_account_id: 205, credit_account_name: 'NHIF Contributions Payable', credit_amount: 1700, created_at: new Date().toISOString(), updated_at: new Date().toISOString()},
    {id: 'GLE026', transaction_date: '2024-06-30', reference_no: 'PSLP001NSSF', description: 'June payroll - Michael Scott NSSF deduction', debit_account_id: 501, debit_account_name: 'Salaries & Wages', debit_amount: 360, credit_account_id: 206, credit_account_name: 'NSSF Contributions Payable', credit_amount: 360, created_at: new Date().toISOString(), updated_at: new Date().toISOString()},
    
    // Additional Merchant Sales
    {id: 'GLE027', transaction_date: '2024-07-22', reference_no: 'UNIFORM001', description: 'Uniform shop sales', debit_account_id: 101, debit_account_name: 'School Bank Account - KCB', debit_amount: 3500, credit_account_id: 411, credit_account_name: 'Uniform Shop Sales Revenue', credit_amount: 3500, created_at: new Date().toISOString(), updated_at: new Date().toISOString()},
    {id: 'GLE028', transaction_date: '2024-07-24', reference_no: 'STAT001', description: 'Stationery store sales', debit_account_id: 101, debit_account_name: 'School Bank Account - KCB', debit_amount: 1800, credit_account_id: 413, credit_account_name: 'Stationery Sales Revenue', credit_amount: 1800, created_at: new Date().toISOString(), updated_at: new Date().toISOString()},
    {id: 'GLE029', transaction_date: '2024-07-26', reference_no: 'TUCK001', description: 'Tuck shop sales', debit_account_id: 101, debit_account_name: 'School Bank Account - KCB', debit_amount: 2200, credit_account_id: 412, credit_account_name: 'Tuck Shop Sales Revenue', credit_amount: 2200, created_at: new Date().toISOString(), updated_at: new Date().toISOString()},
    {id: 'GLE030', transaction_date: '2024-07-29', reference_no: 'SPORTS001', description: 'Sports equipment sales', debit_account_id: 101, debit_account_name: 'School Bank Account - KCB', debit_amount: 4500, credit_account_id: 414, credit_account_name: 'Sports Equipment Sales Revenue', credit_amount: 4500, created_at: new Date().toISOString(), updated_at: new Date().toISOString()}
];

// Mock Suppliers
export const mockSuppliers = [
  {
    id: 1,
    name: "ABC School Supplies Ltd.",
    phone: "020-1234567",
    email: "sales@abcschoolsupplies.com",
    address: "123 Supply Street, Industrial Area, Nairobi",
    contract_expiry_date: "2025-12-31",
    created_at: "2024-01-01T10:00:00Z",
    updated_at: "2024-06-01T12:00:00Z"
  }
];

// Mock Purchase Orders
export const mockPurchaseOrders = [
  {
    id: "PO-2024-045",
    supplier_id: 1,
    order_date: "2024-06-15",
    status: "APPROVED",
    notes: "Urgent delivery required",
    created_at: "2024-06-15T09:00:00Z",
    updated_at: "2024-06-16T10:00:00Z",
    supplier_name: "ABC School Supplies Ltd.",
    total_value: 12000,
    items: [
      { id: "POI-1", purchase_order_id: "PO-2024-045", item_id: "ITEM-1", quantity_ordered: 100, unit_price: 120 }
    ]
  }
];

// Mock Supplier Invoices
export const mockSupplierInvoices = [
  {
    id: "INV-2024-030",
    supplier_id: 1,
    invoice_number: "INV-2024-030",
    invoice_date: "2024-07-01",
    due_date: "2024-07-20",
    total_amount: 12000,
    status: "PAID",
    created_at: "2024-07-01T10:00:00Z",
    updated_at: "2024-07-20T10:00:00Z",
    supplier_name: "ABC School Supplies Ltd.",
    po_id: "PO-2024-045",
    file_url: "https://example.com/invoices/INV-2024-030.pdf"
  }
];

// Export canonical vendor-related mocks for modular system
export { mockSuppliers as suppliers, mockPurchaseOrders as purchaseOrders, mockSupplierInvoices as supplierInvoices };
