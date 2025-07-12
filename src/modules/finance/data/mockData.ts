
const generateId = (prefix = 'id') => `${prefix}_${"now"()}_${"random"().toString(36).substring(2, 7)}`;
export const initialMockFinancialYears = [ 
    { "id": 1, "name": "FY 2023", "start_date": "2023-07-01", "end_date": "2024-06-30", "status": "CLOSED", "created_at": "2024-01-01T00:00:00.000Z", "updated_at": "2024-01-01T00:00:00.000Z" },
    { "id": 1, "name": "FY 2024", "start_date": "2024-07-01", "end_date": "2025-06-30", "status": "OPEN", "created_at": "2024-01-01T00:00:00.000Z", "updated_at": "2024-01-01T00:00:00.000Z" },
    { "id": 1, "name": "FY 2025", "start_date": "2025-07-01", "end_date": "2026-06-30", "status": "OPEN", "created_at": "2024-01-01T00:00:00.000Z", "updated_at": "2024-01-01T00:00:00.000Z" }
];
export const initialMockExpenseCategories = [
    {id: 1, name: "Stationery"},
    {id: 1, name: "Repairs & Maintenance"},
    {id: 1, name: "Utilities"},
    {id: 1, name: "Travel"},
    {id: 1, name: "Staff Welfare"},
    {id: 1, name: "Teaching Materials"},
    {id: 1, name: "Laboratory Supplies"},
    {id: 1, name: "Sports & Recreation"},
    {id: 1, name: "Transport & Fuel"},
    {id: 1, name: "Professional Services"},
    {id: 1, name: "Insurance"},
    {id: 1, name: "Marketing & Advertising"},
    {id: 1, name: "Security Services"},
    {id: 1, name: "Communication"},
    {id: 1, name: "Food & Catering"}
];
export const initialMockChartOfAccounts = [
    { "id": 1, "account_code": "1001", "name": "School Bank Account - KCB", "type": "ASSET", "template_type": "CORE", "is_active": true, "created_at": "2024-01-01T00:00:00.000Z", "updated_at": "2024-01-01T00:00:00.000Z" },
    { "id": 1, "account_code": "1002", "name": "Petty Cash", "type": "ASSET", "template_type": "CORE", "is_active": true, "created_at": "2024-01-01T00:00:00.000Z", "updated_at": "2024-01-01T00:00:00.000Z" },
    { "id": 1, "account_code": "1003", "name": "School Bank Account - Equity", "type": "ASSET", "template_type": "CORE", "is_active": true, "created_at": "2024-01-01T00:00:00.000Z", "updated_at": "2024-01-01T00:00:00.000Z" },
    { "id": 1, "account_code": "1004", "name": "Accounts Receivable - Students", "type": "ASSET", "template_type": "CORE", "is_active": true, "created_at": "2024-01-01T00:00:00.000Z", "updated_at": "2024-01-01T00:00:00.000Z" },
    { "id": 1, "account_code": "1005", "name": "Inventory - Teaching Materials", "type": "ASSET", "template_type": "CUSTOM", "is_active": true, "created_at": "2024-01-01T00:00:00.000Z", "updated_at": "2024-01-01T00:00:00.000Z" },
    { "id": 1, "account_code": "1006", "name": "Fixed Assets - Furniture & Equipment", "type": "ASSET", "template_type": "CORE", "is_active": true, "created_at": "2024-01-01T00:00:00.000Z", "updated_at": "2024-01-01T00:00:00.000Z" },
    { "id": 1, "account_code": "1007", "name": "Fixed Assets - Buildings", "type": "ASSET", "template_type": "CORE", "is_active": true, "created_at": "2024-01-01T00:00:00.000Z", "updated_at": "2024-01-01T00:00:00.000Z" },
    { "id": 1, "account_code": "2001", "name": "Accounts Payable - Suppliers", "type": "LIABILITY", "template_type": "CORE", "is_active": true, "created_at": "2024-01-01T00:00:00.000Z", "updated_at": "2024-01-01T00:00:00.000Z" },
    { "id": 1, "account_code": "2002", "name": "Accrued Salaries Payable", "type": "LIABILITY", "template_type": "CORE", "is_active": true, "created_at": "2024-01-01T00:00:00.000Z", "updated_at": "2024-01-01T00:00:00.000Z" },
    { "id": 1, "account_code": "2003", "name": "Student Advance Payments", "type": "LIABILITY", "template_type": "CUSTOM", "is_active": true, "created_at": "2024-01-01T00:00:00.000Z", "updated_at": "2024-01-01T00:00:00.000Z" },
    { "id": 1, "account_code": "2004", "name": "PAYE Tax Payable", "type": "LIABILITY", "template_type": "CORE", "is_active": true, "created_at": "2024-01-01T00:00:00.000Z", "updated_at": "2024-01-01T00:00:00.000Z" },
    { "id": 1, "account_code": "2005", "name": "NHIF Contributions Payable", "type": "LIABILITY", "template_type": "CORE", "is_active": true, "created_at": "2024-01-01T00:00:00.000Z", "updated_at": "2024-01-01T00:00:00.000Z" },
    { "id": 1, "account_code": "2006", "name": "NSSF Contributions Payable", "type": "LIABILITY", "template_type": "CORE", "is_active": true, "created_at": "2024-01-01T00:00:00.000Z", "updated_at": "2024-01-01T00:00:00.000Z" },
    { "id": 1, "account_code": "3001", "name": "Retained Earnings", "type": "EQUITY", "template_type": "CORE", "is_active": true, "created_at": "2024-01-01T00:00:00.000Z", "updated_at": "2024-01-01T00:00:00.000Z" },
    { "id": 1, "account_code": "3002", "name": "Capital Reserves", "type": "EQUITY", "template_type": "CORE", "is_active": true, "created_at": "2024-01-01T00:00:00.000Z", "updated_at": "2024-01-01T00:00:00.000Z" },
    { "id": 1, "account_code": "4001", "name": "Tuition Fees Revenue", "type": "REVENUE", "template_type": "CORE", "is_active": true, "created_at": "2024-01-01T00:00:00.000Z", "updated_at": "2024-01-01T00:00:00.000Z" },
    { "id": 1, "account_code": "4002", "name": "Transport Fees Revenue", "type": "REVENUE", "template_type": "CUSTOM", "is_active": true, "created_at": "2024-01-01T00:00:00.000Z", "updated_at": "2024-01-01T00:00:00.000Z" },
    { "id": 1, "account_code": "4003", "name": "Boarding Fees Revenue", "type": "REVENUE", "template_type": "CUSTOM", "is_active": true, "created_at": "2024-01-01T00:00:00.000Z", "updated_at": "2024-01-01T00:00:00.000Z" },
    { "id": 1, "account_code": "4004", "name": "Extra-Curricular Fees Revenue", "type": "REVENUE", "template_type": "CUSTOM", "is_active": true, "created_at": "2024-01-01T00:00:00.000Z", "updated_at": "2024-01-01T00:00:00.000Z" },
    { "id": 1, "account_code": "4005", "name": "Examination Fees Revenue", "type": "REVENUE", "template_type": "CUSTOM", "is_active": true, "created_at": "2024-01-01T00:00:00.000Z", "updated_at": "2024-01-01T00:00:00.000Z" },
    { "id": 1, "account_code": "4006", "name": "Uniform & Books Sales Revenue", "type": "REVENUE", "template_type": "CUSTOM", "is_active": true, "created_at": "2024-01-01T00:00:00.000Z", "updated_at": "2024-01-01T00:00:00.000Z" },
    { "id": 1, "account_code": "4007", "name": "Donations & Grants Revenue", "type": "REVENUE", "template_type": "CUSTOM", "is_active": true, "created_at": "2024-01-01T00:00:00.000Z", "updated_at": "2024-01-01T00:00:00.000Z" },
    { "id": 1, "account_code": "4008", "name": "Interest Income", "type": "REVENUE", "template_type": "CORE", "is_active": true, "created_at": "2024-01-01T00:00:00.000Z", "updated_at": "2024-01-01T00:00:00.000Z" },
    { "id": 1, "account_code": "4009", "name": "Meal Plan Fees Revenue", "type": "REVENUE", "template_type": "CUSTOM", "is_active": true, "created_at": "2024-01-01T00:00:00.000Z", "updated_at": "2024-01-01T00:00:00.000Z" },
    { "id": 1, "account_code": "4010", "name": "Canteen Sales Revenue", "type": "REVENUE", "template_type": "CUSTOM", "is_active": true, "created_at": "2024-01-01T00:00:00.000Z", "updated_at": "2024-01-01T00:00:00.000Z" },
    { "id": 1, "account_code": "4011", "name": "Uniform Shop Sales Revenue", "type": "REVENUE", "template_type": "CUSTOM", "is_active": true, "created_at": "2024-01-01T00:00:00.000Z", "updated_at": "2024-01-01T00:00:00.000Z" },
    { "id": 1, "account_code": "4012", "name": "Tuck Shop Sales Revenue", "type": "REVENUE", "template_type": "CUSTOM", "is_active": true, "created_at": "2024-01-01T00:00:00.000Z", "updated_at": "2024-01-01T00:00:00.000Z" },
    { "id": 1, "account_code": "4013", "name": "Stationery Sales Revenue", "type": "REVENUE", "template_type": "CUSTOM", "is_active": true, "created_at": "2024-01-01T00:00:00.000Z", "updated_at": "2024-01-01T00:00:00.000Z" },
    { "id": 1, "account_code": "4014", "name": "Sports Equipment Sales Revenue", "type": "REVENUE", "template_type": "CUSTOM", "is_active": true, "created_at": "2024-01-01T00:00:00.000Z", "updated_at": "2024-01-01T00:00:00.000Z" },
    { "id": 1, "account_code": "4015", "name": "Library Fines Revenue", "type": "REVENUE", "template_type": "CUSTOM", "is_active": true, "created_at": "2024-01-01T00:00:00.000Z", "updated_at": "2024-01-01T00:00:00.000Z" },
    { "id": 1, "account_code": "4016", "name": "Library Book Replacement Revenue", "type": "REVENUE", "template_type": "CUSTOM", "is_active": true, "created_at": "2024-01-01T00:00:00.000Z", "updated_at": "2024-01-01T00:00:00.000Z" },
    { "id": 1, "account_code": "5001", "name": "Salaries & Wages", "type": "EXPENSE", "template_type": "CORE", "is_active": true, "expense_category_id": 1, "expense_category_name": "Staff Welfare", "created_at": "2024-01-01T00:00:00.000Z", "updated_at": "2024-01-01T00:00:00.000Z" },
    { "id": 1, "account_code": "5002", "name": "Teaching Staff Allowances", "type": "EXPENSE", "template_type": "CORE", "is_active": true, "expense_category_id": 1, "expense_category_name": "Staff Welfare", "created_at": "2024-01-01T00:00:00.000Z", "updated_at": "2024-01-01T00:00:00.000Z" },
    { "id": 1, "account_code": "5003", "name": "Stationery & Office Supplies", "type": "EXPENSE", "template_type": "CUSTOM", "is_active": true, "expense_category_id": 1, "expense_category_name": "Stationery", "created_at": "2024-01-01T00:00:00.000Z", "updated_at": "2024-01-01T00:00:00.000Z" },
    { "id": 1, "account_code": "5004", "name": "Teaching Materials & Resources", "type": "EXPENSE", "template_type": "CUSTOM", "is_active": true, "expense_category_id": 1, "expense_category_name": "Teaching Materials", "created_at": "2024-01-01T00:00:00.000Z", "updated_at": "2024-01-01T00:00:00.000Z" },
    { "id": 1, "account_code": "5005", "name": "Laboratory Supplies & Equipment", "type": "EXPENSE", "template_type": "CUSTOM", "is_active": true, "expense_category_id": 1, "expense_category_name": "Laboratory Supplies", "created_at": "2024-01-01T00:00:00.000Z", "updated_at": "2024-01-01T00:00:00.000Z" },
    { "id": 1, "account_code": "5006", "name": "Utilities - Electricity", "type": "EXPENSE", "template_type": "CORE", "is_active": true, "expense_category_id": 1, "expense_category_name": "Utilities", "created_at": "2024-01-01T00:00:00.000Z", "updated_at": "2024-01-01T00:00:00.000Z" },
    { "id": 1, "account_code": "5007", "name": "Utilities - Water", "type": "EXPENSE", "template_type": "CORE", "is_active": true, "expense_category_id": 1, "expense_category_name": "Utilities", "created_at": "2024-01-01T00:00:00.000Z", "updated_at": "2024-01-01T00:00:00.000Z" },
    { "id": 1, "account_code": "5008", "name": "Internet & Communication", "type": "EXPENSE", "template_type": "CORE", "is_active": true, "expense_category_id": 1, "expense_category_name": "Communication", "created_at": "2024-01-01T00:00:00.000Z", "updated_at": "2024-01-01T00:00:00.000Z" },
    { "id": 1, "account_code": "5009", "name": "Building Maintenance & Repairs", "type": "EXPENSE", "template_type": "CORE", "is_active": true, "expense_category_id": 1, "expense_category_name": "Repairs & Maintenance", "created_at": "2024-01-01T00:00:00.000Z", "updated_at": "2024-01-01T00:00:00.000Z" },
    { "id": 1, "account_code": "5010", "name": "Vehicle Maintenance & Fuel", "type": "EXPENSE", "template_type": "CUSTOM", "is_active": true, "expense_category_id": 1, "expense_category_name": "Transport & Fuel", "created_at": "2024-01-01T00:00:00.000Z", "updated_at": "2024-01-01T00:00:00.000Z" },
    { "id": 1, "account_code": "5011", "name": "Staff Training & Development", "type": "EXPENSE", "template_type": "CUSTOM", "is_active": true, "expense_category_id": 1, "expense_category_name": "Staff Welfare", "created_at": "2024-01-01T00:00:00.000Z", "updated_at": "2024-01-01T00:00:00.000Z" },
    { "id": 1, "account_code": "5012", "name": "Travel & Accommodation", "type": "EXPENSE", "template_type": "CORE", "is_active": true, "expense_category_id": 1, "expense_category_name": "Travel", "created_at": "2024-01-01T00:00:00.000Z", "updated_at": "2024-01-01T00:00:00.000Z" },
    { "id": 1, "account_code": "5013", "name": "Sports & Recreation Equipment", "type": "EXPENSE", "template_type": "CUSTOM", "is_active": true, "expense_category_id": 1, "expense_category_name": "Sports & Recreation", "created_at": "2024-01-01T00:00:00.000Z", "updated_at": "2024-01-01T00:00:00.000Z" },
    { "id": 1, "account_code": "5014", "name": "Security Services", "type": "EXPENSE", "template_type": "CUSTOM", "is_active": true, "expense_category_id": 1, "expense_category_name": "Security Services", "created_at": "2024-01-01T00:00:00.000Z", "updated_at": "2024-01-01T00:00:00.000Z" },
    { "id": 1, "account_code": "5015", "name": "Insurance Premiums", "type": "EXPENSE", "template_type": "CORE", "is_active": true, "expense_category_id": 1, "expense_category_name": "Insurance", "created_at": "2024-01-01T00:00:00.000Z", "updated_at": "2024-01-01T00:00:00.000Z" },
    { "id": 1, "account_code": "5016", "name": "Professional & Legal Services", "type": "EXPENSE", "template_type": "CUSTOM", "is_active": true, "expense_category_id": 1, "expense_category_name": "Professional Services", "created_at": "2024-01-01T00:00:00.000Z", "updated_at": "2024-01-01T00:00:00.000Z" },
    { "id": 1, "account_code": "5017", "name": "Marketing & Student Recruitment", "type": "EXPENSE", "template_type": "CUSTOM", "is_active": true, "expense_category_id": 1, "expense_category_name": "Marketing & Advertising", "created_at": "2024-01-01T00:00:00.000Z", "updated_at": "2024-01-01T00:00:00.000Z" },
    { "id": 1, "account_code": "5018", "name": "Food & Catering Services", "type": "EXPENSE", "template_type": "CUSTOM", "is_active": true, "expense_category_id": 1, "expense_category_name": "Food & Catering", "created_at": "2024-01-01T00:00:00.000Z", "updated_at": "2024-01-01T00:00:00.000Z" },
    { "id": 1, "account_code": "5019", "name": "Depreciation Expense", "type": "EXPENSE", "template_type": "CORE", "is_active": true, "expense_category_id": 1, "expense_category_name": "Repairs & Maintenance", "created_at": "2024-01-01T00:00:00.000Z", "updated_at": "2024-01-01T00:00:00.000Z" },
    { "id": 1, "account_code": "5020", "name": "Bank Charges & Interest", "type": "EXPENSE", "template_type": "CORE", "is_active": true, "expense_category_id": 1, "expense_category_name": "Professional Services", "created_at": "2024-01-01T00:00:00.000Z", "updated_at": "2024-01-01T00:00:00.000Z" }
];
export const initialMockBanks = [
    { "id": 1, "name": "KCB Bank", "account_no": "1234567890", "gl_account_id": 101, "created_at": "2024-01-01T00:00:00.000Z", "updated_at": "2024-01-01T00:00:00.000Z", "gl_account_name": "School Bank Account - KCB" },
    { "id": 1, "name": "Equity Bank", "account_no": "0987654321", "gl_account_id": 101, "created_at": "2024-01-01T00:00:00.000Z", "updated_at": "2024-01-01T00:00:00.000Z", "gl_account_name": "School Bank Account - Equity" },
    { "id": 1, "name": "Co-operative Bank", "account_no": "5432109876", "gl_account_id": 101, "created_at": "2024-01-01T00:00:00.000Z", "updated_at": "2024-01-01T00:00:00.000Z", "gl_account_name": "School Bank Account - KCB" },
    { "id": 1, "name": "NCBA Bank", "account_no": "6789012345", "gl_account_id": 101, "created_at": "2024-01-01T00:00:00.000Z", "updated_at": "2024-01-01T00:00:00.000Z", "gl_account_name": "School Bank Account - Equity" }
];
export const initialMockFeeTemplateItems = [
    { "id": "fti1", "fee_template_id": 1, "description": "Tuition Fee", "amount": 50000, "revenue_account_id": 201, "revenue_account_name": "Tuition Fees Revenue" },
    { "id": "fti2", "fee_template_id": 1, "description": "Transport Fee", "amount": 50000, "revenue_account_id": 201, "revenue_account_name": "Transport Fees Revenue" },
    { "id": "fti3", "fee_template_id": 1, "description": "Lunch Program", "amount": 50000, "revenue_account_id": 201, "revenue_account_name": "Tuition Fees Revenue" }, 
    { "id": "fti4", "fee_template_id": 1, "description": "Boarding Fee", "amount": 50000, "revenue_account_id": 201, "revenue_account_name": "Tuition Fees Revenue" }
];
export const initialMockFeeTemplates = [
    { "id": 1, "name": "", "school_period_id": 1, "student_category_id": 1, "created_at": "2024-01-01T00:00:00.000Z", "updated_at": "2024-01-01T00:00:00.000Z", "school_period_name": "Term 2 - AY 2023/2024", "student_category_name": "Day Scholar" },
    { "id": 1, "name": "", "school_period_id": 1, "student_category_id": 1, "created_at": "2024-01-01T00:00:00.000Z", "updated_at": "2024-01-01T00:00:00.000Z", "school_period_name": "Term 2 - AY 2023/2024", "student_category_name": "Boarder" }
];
export const initialMockExpenseClaims = [
    { "id": "EXP001", "claimant_type": "STAFF", "claimant_id": "STF001", "claim_date": "2024-07-15", "description": "Travel allowance for workshop", "amount": 50000, "expense_category_id": 1, "created_at": "2024-01-01T00:00:00.000Z", "updated_at": "2024-01-01T00:00:00.000Z", "claimant_name": "Michael Scott", "expense_category_name": "Travel" },
    { "id": "EXP002", "claimant_type": "STAFF", "claimant_id": "STF002", "claim_date": "2024-07-20", "description": "Purchase of office stationery", "amount": 50000, "expense_category_id": 1, "created_at": "2024-01-01T00:00:00.000Z", "updated_at": "2024-01-01T00:00:00.000Z", "claimant_name": "Dwight Schrute", "expense_category_name": "Stationery" }
];
export const initialMockStudentOpeningBalances = [
    { "id": "FIXED_ID", "student_id": "S001", "balance_type": "DEBIT", "amount": 50000, "as_of_date": "2023-08-31", "is_billed": true, "student_name": "Jim Halpert", "created_at": "2024-01-01T00:00:00.000Z", "updated_at": "2024-01-01T00:00:00.000Z" }
];
export const initialMockFeeAdjustments = [
    { "id": "FIXED_ID", "student_id": "S001", "school_period_id": 1, "adjustment_type": "SCHOLARSHIP", "amount": -5000, "reason": "Merit Scholarship", "student_name": "Jim Halpert", "school_period_name": "Term 1 - AY 2023/2024", "created_at": "2024-01-01T00:00:00.000Z" }
];
export const initialMockTransportRoutes = [
    { "id": 1, "name": "Route A - Westlands", "cost_per_period": 15000, "gl_revenue_account_id": 201, "gl_revenue_account_name": "Transport Fees Revenue", "created_at": "2024-01-01T00:00:00.000Z", "updated_at": "2024-01-01T00:00:00.000Z" }
];
export const initialMockStudentTransportAssignments = [
    { "id": "FIXED_ID", "student_id": "S002", "route_id": 1, "school_period_id": 1, "status": "ACTIVE", "student_name": "Michael Scofield", "route_name": "Route A - Westlands", "school_period_name": "Term 1 - AY 2023/2024", "created_at": "2024-01-01T00:00:00.000Z", "updated_at": "2024-01-01T00:00:00.000Z" }
];
export const initialMockStudentInvoiceItems = [
    { "id": "sii_001", "invoice_id": "SINV001", "description": "Tuition Fee - Term 1", "amount": 50000 },
    { "id": "sii_002", "invoice_id": "SINV001", "description": "Transport Fee - Term 1", "amount": 50000 }
];
export const initialMockStudentInvoices = [
    { "id": "SINV001", "student_id": "S001", "invoice_number": "INV/2023/001", "school_period_id": 1, "issue_date": "2023-09-01", "due_date": "2023-09-15", "total_amount_billed": 60000, "status": "PAID", "student_name": "Jim Halpert", "school_period_name": "Term 1 - AY 2023/2024", "created_at": "2024-01-01T00:00:00.000Z", "updated_at": "2024-01-01T00:00:00.000Z", "amount_paid": 60000 }
];
export const initialMockStudentPayments = [
    { "id": "SPAY001", "student_id": "S001", "receipt_no": "RCPT/2023/001", "total_amount_paid": 60000, "payment_method": "Bank Transfer", "transaction_date": "2023-09-05", "reference_no": "BANKTRN001", "student_name": "Jim Halpert", "created_at": "2024-01-01T00:00:00.000Z", "updated_at": "2024-01-01T00:00:00.000Z" }
];
export const initialMockInvoicePaymentApplications = [
    { "id": "IPA001", "payment_id": "SPAY001", "invoice_item_id": "sii_001", "amount_applied": 50000 },
    { "id": "IPA002", "payment_id": "SPAY001", "invoice_item_id": "sii_002", "amount_applied": 50000 }
];
export const initialMockCustomerInvoices = [
    { "id": "CINV001", "customer_name": "Parent Teachers Association", "invoice_number": "CI/2024/001", "issue_date": "2024-07-15", "due_date": "2024-08-15", "total_amount": 50000, "status": "PAID", "created_at": "2024-01-01T00:00:00.000Z", "updated_at": "2024-01-01T00:00:00.000Z", "customer_id": 1 },
    { "id": "CINV002", "customer_name": "Local Community Centre", "invoice_number": "CI/2024/002", "issue_date": "2024-07-20", "due_date": "2024-08-20", "total_amount": 50000, "status": "DUE", "created_at": "2024-01-01T00:00:00.000Z", "updated_at": "2024-01-01T00:00:00.000Z", "customer_id": 1 }
];
export const initialMockGeneralPayments = [
    { "id": "GPAY001", "payment_date": "2024-07-28", "total_amount_paid": 60000, "payment_method": "Bank Transfer", "description": "Monthly security services - July 2024", "payer_type": "EXTERNAL", "gl_expense_account_id": 514, "gl_expense_account_name": "Security Services", "bank_account_id": 1, "bank_account_name": "KCB Bank", "created_at": "2024-01-01T00:00:00.000Z", "updated_at": "2024-01-01T00:00:00.000Z" },
    { "id": "GPAY002", "payment_date": "2024-07-30", "total_amount_paid": 60000, "payment_method": "Mobile Money", "description": "Internet and communication services - July 2024", "payer_type": "EXTERNAL", "gl_expense_account_id": 514, "gl_expense_account_name": "Internet & Communication", "bank_account_id": 1, "bank_account_name": "Equity Bank", "created_at": "2024-01-01T00:00:00.000Z", "updated_at": "2024-01-01T00:00:00.000Z" },
    { "id": "GPAY003", "payment_date": "2024-07-25", "total_amount_paid": 60000, "payment_method": "Cheque", "description": "Water charges - July 2024", "payer_type": "EXTERNAL", "gl_expense_account_id": 514, "gl_expense_account_name": "Utilities - Water", "bank_account_id": 1, "bank_account_name": "KCB Bank", "created_at": "2024-01-01T00:00:00.000Z", "updated_at": "2024-01-01T00:00:00.000Z" }
];
export const initialMockGeneralLedgerEntries = [
     { "id": "GLE001", "transaction_date": "2024-07-01", "effective_date": "2024-07-01", "financial_year_id": 1, "account_id": 101, "debit": 500000, "description": "Opening balance - July 2024", "created_at": "2024-01-01T00:00:00.000Z", "updated_at": "2024-01-01T00:00:00.000Z" },
     { "id": "GLE002", "transaction_date": "2024-07-01", "effective_date": "2024-07-01", "financial_year_id": 1, "account_id": 101, "credit": 500000, "description": "Opening balance - July 2024", "created_at": "2024-01-01T00:00:00.000Z", "updated_at": "2024-01-01T00:00:00.000Z" },
     { "id": "GLE003", "transaction_date": "2024-07-05", "effective_date": "2024-07-05", "financial_year_id": 1, "account_id": 101, "debit": 500000, "description": "Student fees collection - Term 3", "created_at": "2024-01-01T00:00:00.000Z", "updated_at": "2024-01-01T00:00:00.000Z" },
     { "id": "GLE004", "transaction_date": "2024-07-05", "effective_date": "2024-07-05", "financial_year_id": 1, "account_id": 101, "credit": 500000, "description": "Student fees collection - Term 3", "created_at": "2024-01-01T00:00:00.000Z", "updated_at": "2024-01-01T00:00:00.000Z" },
     { "id": "GLE005", "transaction_date": "2024-07-10", "effective_date": "2024-07-10", "financial_year_id": 1, "account_id": 101, "debit": 500000, "description": "Payment to Text Book Centre", "created_at": "2024-01-01T00:00:00.000Z", "updated_at": "2024-01-01T00:00:00.000Z" },
     { "id": "GLE006", "transaction_date": "2024-07-10", "effective_date": "2024-07-10", "financial_year_id": 1, "account_id": 101, "credit": 500000, "description": "Payment to Text Book Centre", "created_at": "2024-01-01T00:00:00.000Z", "updated_at": "2024-01-01T00:00:00.000Z" },
     { "id": "GLE007", "transaction_date": "2024-07-15", "effective_date": "2024-07-15", "financial_year_id": 1, "account_id": 101, "debit": 500000, "description": "Monthly salaries payment", "created_at": "2024-01-01T00:00:00.000Z", "updated_at": "2024-01-01T00:00:00.000Z" },
     { "id": "GLE008", "transaction_date": "2024-07-15", "effective_date": "2024-07-15", "financial_year_id": 1, "account_id": 101, "credit": 500000, "description": "Monthly salaries payment", "created_at": "2024-01-01T00:00:00.000Z", "updated_at": "2024-01-01T00:00:00.000Z" },
     { "id": "GLE009", "transaction_date": "2024-07-20", "effective_date": "2024-07-20", "financial_year_id": 1, "account_id": 101, "debit": 500000, "description": "Transport fees collection", "created_at": "2024-01-01T00:00:00.000Z", "updated_at": "2024-01-01T00:00:00.000Z" },
     { "id": "GLE010", "transaction_date": "2024-07-20", "effective_date": "2024-07-20", "financial_year_id": 1, "account_id": 101, "credit": 500000, "description": "Transport fees collection", "created_at": "2024-01-01T00:00:00.000Z", "updated_at": "2024-01-01T00:00:00.000Z" },
     { "id": "GLE011", "transaction_date": "2024-07-25", "effective_date": "2024-07-25", "financial_year_id": 1, "account_id": 101, "debit": 500000, "description": "Water utility payment", "created_at": "2024-01-01T00:00:00.000Z", "updated_at": "2024-01-01T00:00:00.000Z" },
     { "id": "GLE012", "transaction_date": "2024-07-25", "effective_date": "2024-07-25", "financial_year_id": 1, "account_id": 101, "credit": 500000, "description": "Water utility payment", "created_at": "2024-01-01T00:00:00.000Z", "updated_at": "2024-01-01T00:00:00.000Z" },
     { "id": "GLE013", "transaction_date": "2024-07-28", "effective_date": "2024-07-28", "financial_year_id": 1, "account_id": 101, "debit": 500000, "description": "Security services payment", "created_at": "2024-01-01T00:00:00.000Z", "updated_at": "2024-01-01T00:00:00.000Z" },
     { "id": "GLE014", "transaction_date": "2024-07-28", "effective_date": "2024-07-28", "financial_year_id": 1, "account_id": 101, "credit": 500000, "description": "Security services payment", "created_at": "2024-01-01T00:00:00.000Z", "updated_at": "2024-01-01T00:00:00.000Z" },
     { "id": "GLE015", "transaction_date": "2024-07-30", "effective_date": "2024-07-30", "financial_year_id": 1, "account_id": 101, "debit": 500000, "description": "Communication services payment", "created_at": "2024-01-01T00:00:00.000Z", "updated_at": "2024-01-01T00:00:00.000Z" },
     { "id": "GLE016", "transaction_date": "2024-07-30", "effective_date": "2024-07-30", "financial_year_id": 1, "account_id": 101, "credit": 500000, "description": "Communication services payment", "created_at": "2024-01-01T00:00:00.000Z", "updated_at": "2024-01-01T00:00:00.000Z" },
     { "id": "GLE017", "transaction_date": "2024-07-28", "effective_date": "2024-07-28", "financial_year_id": 1, "account_id": 101, "debit": 500000, "description": "Student wallet deposit - Jim Halpert", "created_at": "2024-01-01T00:00:00.000Z", "updated_at": "2024-01-01T00:00:00.000Z" },
     { "id": "GLE018", "transaction_date": "2024-07-28", "effective_date": "2024-07-28", "financial_year_id": 1, "account_id": 101, "credit": 500000, "description": "Student wallet deposit - Jim Halpert", "created_at": "2024-01-01T00:00:00.000Z", "updated_at": "2024-01-01T00:00:00.000Z" },
     { "id": "GLE019", "transaction_date": "2024-07-29", "effective_date": "2024-07-29", "financial_year_id": 1, "account_id": 101, "debit": 500000, "description": "Canteen sales - Jim Halpert snacks purchase", "created_at": "2024-01-01T00:00:00.000Z", "updated_at": "2024-01-01T00:00:00.000Z" },
     { "id": "GLE020", "transaction_date": "2024-07-29", "effective_date": "2024-07-29", "financial_year_id": 1, "account_id": 101, "credit": 500000, "description": "Canteen sales - Jim Halpert snacks purchase", "created_at": "2024-01-01T00:00:00.000Z", "updated_at": "2024-01-01T00:00:00.000Z" },
     { "id": "GLE021", "transaction_date": "2024-07-01", "effective_date": "2024-07-01", "financial_year_id": 1, "account_id": 101, "debit": 500000, "description": "Opening balance - July 2024", "created_at": "2024-01-01T00:00:00.000Z", "updated_at": "2024-01-01T00:00:00.000Z" },
     { "id": "GLE022", "transaction_date": "2024-07-01", "effective_date": "2024-07-01", "financial_year_id": 1, "account_id": 101, "credit": 500000, "description": "Opening balance - July 2024", "created_at": "2024-01-01T00:00:00.000Z", "updated_at": "2024-01-01T00:00:00.000Z" },
     { "id": "GLE023", "transaction_date": "2024-06-25", "effective_date": "2024-06-25", "financial_year_id": 1, "account_id": 101, "debit": 500000, "description": "Library fine - Jim Halpert overdue book", "created_at": "2024-01-01T00:00:00.000Z", "updated_at": "2024-01-01T00:00:00.000Z" },
     { "id": "GLE024", "transaction_date": "2024-06-25", "effective_date": "2024-06-25", "financial_year_id": 1, "account_id": 101, "credit": 500000, "description": "Library fine - Jim Halpert overdue book", "created_at": "2024-01-01T00:00:00.000Z", "updated_at": "2024-01-01T00:00:00.000Z" },
     { "id": "GLE025", "transaction_date": "2024-06-30", "effective_date": "2024-06-30", "financial_year_id": 1, "account_id": 101, "debit": 500000, "description": "June payroll - Michael Scott net salary", "created_at": "2024-01-01T00:00:00.000Z", "updated_at": "2024-01-01T00:00:00.000Z" },
     { "id": "GLE026", "transaction_date": "2024-06-30", "effective_date": "2024-06-30", "financial_year_id": 1, "account_id": 101, "credit": 500000, "description": "June payroll - Michael Scott net salary", "created_at": "2024-01-01T00:00:00.000Z", "updated_at": "2024-01-01T00:00:00.000Z" },
     { "id": "GLE027", "transaction_date": "2024-07-22", "effective_date": "2024-07-22", "financial_year_id": 1, "account_id": 101, "debit": 500000, "description": "Uniform shop sales", "created_at": "2024-01-01T00:00:00.000Z", "updated_at": "2024-01-01T00:00:00.000Z" },
     { "id": "GLE028", "transaction_date": "2024-07-22", "effective_date": "2024-07-22", "financial_year_id": 1, "account_id": 101, "credit": 500000, "description": "Uniform shop sales", "created_at": "2024-01-01T00:00:00.000Z", "updated_at": "2024-01-01T00:00:00.000Z" }
 ];
