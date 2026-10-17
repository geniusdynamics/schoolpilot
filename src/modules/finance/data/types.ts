// ABOUTME: Finance module types - single source of truth for all finance entities
// ABOUTME: Consolidated from core/types/finance.ts - removed Fin* prefixes

// Enums
export enum FinancialYearStatus { 
  OPEN = 'Open', 
  CLOSED = 'Closed', 
  ARCHIVED = 'Archived' 
}

export enum AccountType { 
  ASSET = 'Asset', 
  LIABILITY = 'Liability', 
  EQUITY = 'Equity', 
  REVENUE = 'Revenue', 
  EXPENSE = 'Expense' 
}

export enum AccountTemplateType { 
  CORE = 'Core', 
  CUSTOM = 'Custom' 
}

export enum OpeningBalanceType { 
  DEBIT = 'Debit', 
  CREDIT = 'Credit' 
}

export enum FeeAdjustmentType { 
  SCHOLARSHIP = 'Scholarship', 
  DISCOUNT = 'Discount', 
  EXEMPTION = 'Exemption', 
  FINE = 'Fine', 
  PENALTY = 'Penalty', 
  OTHER = 'Other' 
}

export enum TransportAssignmentStatus { 
  ACTIVE = 'Active', 
  INACTIVE = 'Inactive', 
  CANCELLED = 'Cancelled' 
}

export enum InvoiceStatus { 
  DRAFT = 'Draft', 
  DUE = 'Due', 
  PAID = 'Paid', 
  PARTIALLY_PAID = 'Partially Paid', 
  OVERDUE = 'Overdue', 
  VOIDED = 'Voided' 
}

export enum CustomerInvoiceStatus {
  DRAFT = 'Draft', 
  SENT = 'Sent', 
  DUE = 'Due', 
  PAID = 'Paid', 
  PARTIALLY_PAID = 'Partially Paid', 
  OVERDUE = 'Overdue', 
  VOIDED = 'Voided' 
}

export enum SupplierInvoiceStatus { 
  UNPAID = 'Unpaid', 
  PAID = 'Paid', 
  PARTIALLY_PAID = 'Partially Paid', 
  VOIDED = 'Voided' 
}

export enum GeneralPayerType { 
  STUDENT = 'Student', 
  STAFF = 'Staff', 
  CUSTOMER = 'Customer', 
  PARTNER = 'Partner', 
  OTHER = 'Other' 
}

export enum InstallmentStatus {
  PENDING = 'Pending',
  PARTIAL = 'Partial',
  PAID = 'Paid',
  OVERDUE = 'Overdue',
  WAIVED = 'Waived'
}

export enum ExpenseClaimantType { 
  STUDENT = 'Student', 
  STAFF = 'Staff' 
}

// Types
export interface FinancialYear {
  id: number;
  name: string;
  start_date: string;
  end_date: string;
  status: FinancialYearStatus;
  created_at: string;
  updated_at: string;
}

export interface ChartOfAccount {
  id: number;
  account_code: string;
  name: string;
  type: AccountType;
  template_type: AccountTemplateType;
  is_active: boolean;
  expense_category_id?: number | null;
  created_at: string;
  updated_at: string;
  expense_category_name?: string | null;
}

export interface ExpenseCategory {
  id: number;
  name: string;
}

export interface Bank {
  id: number;
  name: string;
  account_no?: string | null;
  gl_account_id: number;
  created_at: string;
  updated_at: string;
  gl_account_name?: string | null;
}

export interface Supplier {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  contact_person?: string | null;
  kra_pin?: string | null;
  contract_expiry_date?: string | null;
  created_at: string;
  updated_at: string;
}

export interface FeeTemplateItem {
  id: string;
  fee_template_id: number;
  description: string;
  amount: number;
  revenue_account_id: number;
  linked_expense_category_id?: number | null;
  linked_meal_plan_id?: number | null;
  linked_transport_route_id?: number | null;
  revenue_account_name?: string | null;
  linked_expense_category_name?: string | null;
}

export interface FeeTemplate {
  id: number;
  name: string;
  school_period_id: number;
  student_category_id?: number | null;
  created_at: string;
  updated_at: string;
  school_period_name?: string | null;
  student_category_name?: string | null;
  items?: FeeTemplateItem[];
  /** Class (level) ids the template applies to; empty or missing means every level. */
  applicable_level_ids?: string[] | null;
}

export interface ExpenseClaim {
  id: string;
  claimant_type: ExpenseClaimantType;
  claimant_id: string;
  claim_date: string;
  description: string;
  amount: number;
  expense_category_id: number;
  workflow_state_id?: number | null;
  workflow_status_name?: string | null;
  approved_by?: string | null;
  paid_date?: string | null;
  payment_reference?: string | null;
  created_at: string;
  updated_at: string;
  claimant_name?: string | null;
  expense_category_name?: string | null;
}

export interface Customer {
  id: number;
  name: string;
  phone?: string | null;
  email?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CustomerInvoiceItem {
  id: string;
  invoice_id: string;
  description?: string | null;
  quantity?: number | null;
  unit_price?: number | null;
  amount?: number | null;
  revenue_account_id?: number | null;
  revenue_account_name?: string | null;
}

export interface CustomerInvoice {
  id: string;
  customer_id: number;
  invoice_number: string;
  issue_date: string;
  due_date?: string | null;
  total_amount?: number | null;
  status?: CustomerInvoiceStatus | null;
  notes?: string | null;
  items?: CustomerInvoiceItem[];
  created_at: string;
  updated_at: string;
  customer_name?: string | null;
}

export interface SupplierInvoice {
  id: string;
  supplier_id: number;
  invoice_number: string;
  invoice_date: string;
  due_date?: string | null;
  total_amount: number;
  amount_paid?: number | null;
  status?: SupplierInvoiceStatus | null;
  purchase_order_id?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  supplier_name?: string | null;
}

export interface StudentOpeningBalance {
  id: string;
  student_id: string;
  balance_type: OpeningBalanceType;
  amount: number;
  as_of_date: string;
  is_billed: boolean;
  created_at: string;
  updated_at: string;
  student_name?: string | null;
}

export interface FeeAdjustment {
  id: string;
  student_id: string;
  school_period_id: number;
  adjustment_type: FeeAdjustmentType;
  amount: number;
  reason?: string | null;
  applied_invoice_id?: string | null;
  created_at?: string | null;
  student_name?: string | null;
  school_period_name?: string | null;
}

export interface TransportRoute {
  id: number;
  name: string;
  cost_per_period: number;
  gl_revenue_account_id: number;
  created_at: string;
  updated_at: string;
  gl_revenue_account_name?: string | null;
}

export interface StudentTransportAssignment {
  id: string;
  student_id: string;
  route_id: number;
  school_period_id: number;
  status?: TransportAssignmentStatus | null;
  invoice_id?: string | null;
  cost_override?: number | null;
  created_at: string;
  updated_at: string;
  student_name?: string | null;
  route_name?: string | null;
  school_period_name?: string | null;
}

export interface StudentInvoiceItem {
  id: string;
  invoice_id: string;
  description: string;
  amount: number;
  fee_template_item_id?: string | null;
  student_transport_assignment_id?: string | null;
  fine_id?: string | null;
}

export interface StudentInvoice {
  id: string;
  student_id: string;
  invoice_number: string;
  school_period_id: number;
  issue_date: string;
  due_date: string;
  total_amount_billed: number;
  amount_paid: number;
  status: InvoiceStatus;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
  student_name?: string | null;
  school_period_name?: string | null;
  items?: StudentInvoiceItem[];
}

export interface StudentPayment {
  id: string;
  student_id: string;
  receipt_no: string;
  total_amount_paid: number;
  payment_method?: string | null;
  transaction_date: string;
  reference_no?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  student_name?: string | null;
}

export interface FeeInstallment {
  id: string;
  student_id: string;
  school_period_id: number;
  installment_number: number;
  due_date: string;
  amount_due: number;
  amount_paid: number;
  status: InstallmentStatus;
  invoice_id?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  student_name?: string | null;
  school_period_name?: string | null;
}

export interface InvoicePaymentApplication {
  id: string;
  payment_id: string;
  invoice_item_id: string;
  amount_applied: number;
}

export interface GeneralPaymentItem {
  id: string;
  general_payment_id: string;
  description: string;
  amount: number;
  revenue_account_id: number;
  revenue_account_name?: string | null;
}

export interface GeneralPayment {
  id: string;
  payer_type: GeneralPayerType;
  payer_id?: string | null;
  payer_name_external?: string | null;
  payment_date: string;
  total_amount_paid: number;
  payment_method?: string | null;
  reference_no?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  items?: GeneralPaymentItem[];
  payer_name_resolved?: string | null;
}

export interface GeneralLedgerEntry {
  id: string;
  transaction_date: string;
  effective_date: string;
  financial_year_id: number;
  account_id: number;
  debit?: number | null;
  credit?: number | null;
  description: string;
  source_table?: string | null;
  source_id?: string | null;
  created_at: string;
  updated_at: string;
}

// Backward compatibility exports (deprecated - will be removed in future)
/** @deprecated Use FinancialYearStatus instead */
export const FinFinancialYearStatusEnum = FinancialYearStatus;
/** @deprecated Use AccountType instead */
export const FinAccountTypeEnum = AccountType;
/** @deprecated Use AccountTemplateType instead */
export const FinAccountTemplateTypeEnum = AccountTemplateType;
/** @deprecated Use OpeningBalanceType instead */
export const FinOpeningBalanceTypeEnum = OpeningBalanceType;
/** @deprecated Use FeeAdjustmentType instead */
export const FinFeeAdjustmentTypeEnum = FeeAdjustmentType;
/** @deprecated Use TransportAssignmentStatus instead */
export const FinTransportAssignmentStatusEnum = TransportAssignmentStatus;
/** @deprecated Use InvoiceStatus instead */
export const FinInvoiceStatusEnum = InvoiceStatus;
/** @deprecated Use CustomerInvoiceStatus instead */
export const FinCustomerInvoiceStatusEnum = CustomerInvoiceStatus;
/** @deprecated Use SupplierInvoiceStatus instead */
export const FinSupplierInvoiceStatusEnum = SupplierInvoiceStatus;
/** @deprecated Use GeneralPayerType instead */
export const FinGeneralPayerTypeEnum = GeneralPayerType;
/** @deprecated Use ExpenseClaimantType instead */
export const FinExpenseClaimantTypeEnum = ExpenseClaimantType;

// Interface backward compatibility
/** @deprecated Use ChartOfAccount instead */
export type FinChartOfAccountType = ChartOfAccount;
/** @deprecated Use ExpenseCategory instead */
export type FinExpenseCategoryType = ExpenseCategory;
/** @deprecated Use Bank instead */
export type FinBankType = Bank;
/** @deprecated Use Supplier instead */
export type FinSupplierType = Supplier;
/** @deprecated Use FeeTemplateItem instead */
export type FinFeeTemplateItemType = FeeTemplateItem;
/** @deprecated Use FeeTemplate instead */
export type FinFeeTemplateType = FeeTemplate;
/** @deprecated Use ExpenseClaim instead */
export type FinExpenseClaimType = ExpenseClaim;
/** @deprecated Use StudentOpeningBalance instead */
export type FinStudentOpeningBalanceType = StudentOpeningBalance;
/** @deprecated Use FeeAdjustment instead */
export type FinFeeAdjustmentType = FeeAdjustment;
/** @deprecated Use TransportRoute instead */
export type FinTransportRouteType = TransportRoute;
/** @deprecated Use StudentTransportAssignment instead */
export type FinStudentTransportAssignmentType = StudentTransportAssignment;
/** @deprecated Use StudentInvoiceItem instead */
export type FinStudentInvoiceItemType = StudentInvoiceItem;
/** @deprecated Use StudentInvoice instead */
export type FinStudentInvoiceType = StudentInvoice;
/** @deprecated Use StudentPayment instead */
export type FinStudentPaymentType = StudentPayment;
/** @deprecated Use InvoicePaymentApplication instead */
export type FinInvoicePaymentApplicationType = InvoicePaymentApplication;
/** @deprecated Use CustomerInvoiceItem instead */
export type FinCustomerInvoiceItemType = CustomerInvoiceItem;
/** @deprecated Use CustomerInvoice instead */
export type FinCustomerInvoiceType = CustomerInvoice;
/** @deprecated Use SupplierInvoice instead */
export type FinSupplierInvoiceType = SupplierInvoice;
/** @deprecated Use GeneralPaymentItem instead */
export type FinGeneralPaymentItemType = GeneralPaymentItem;
/** @deprecated Use GeneralPayment instead */
export type FinGeneralPaymentType = GeneralPayment;
/** @deprecated Use GeneralLedgerEntry instead */
export type FinGeneralLedgerEntryType = GeneralLedgerEntry;

// === NEW TYPES FOR FINANCE PAGES (from inline mock data migration) ===

// Source: FeesDueReportPage.tsx
export type AgingCategory = 'Current' | '1-30 Days' | '31-60 Days' | '61-90 Days' | '90+ Days';

export interface FeeDueRecord {
  id: string;
  student_id: string;
  student_name: string;
  admission_no: string;
  class_name: string;
  guardian_name: string;
  guardian_phone: string;
  total_amount_due: number;
  amount_paid: number;
  balance_due: number;
  due_date: string;
  days_overdue: number;
  aging_category: AgingCategory;
  school_period: string;
}

// Source: BalanceSheetPage.tsx
export interface BalanceSheetItem {
  id: string;
  category: 'Asset' | 'Liability' | 'Equity';
  subcategory: string;
  account_name: string;
  amount: number;
  percentage?: number;
}

// Source: CashBookPage.tsx
export interface CashBookEntry {
  id: string;
  transaction_date: string;
  description: string;
  reference_no: string;
  payment_method: string;
  debit: number;
  credit: number;
  balance: number;
  created_at: string;
}

// Source: DayBookPage.tsx
export interface DayBookEntry {
  id: string;
  transaction_date: string;
  description: string;
  reference_no: string;
  account_name: string;
  debit: number;
  credit: number;
  source: string;
  created_at: string;
}

// Source: FeesReceiptTemplatePage.tsx
export interface ReceiptTemplate {
  id: string;
  name: string;
  school_name: string;
  school_address: string;
  school_phone: string;
  school_email: string;
  header_text: string;
  footer_text: string;
  logo_url?: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

// Source: IncomeStatementPage.tsx
export interface IncomeStatementItem {
  id: string;
  category: 'Revenue' | 'Expense';
  account_name: string;
  amount: number;
  percentage?: number;
}

// Source: JournalRegisterPage.tsx
export interface JournalEntry {
  id: string;
  voucher_no: string;
  transaction_date: string;
  description: string;
  reference: string;
  debit_account: string;
  credit_account: string;
  debit_amount: number;
  credit_amount: number;
  status: 'Posted' | 'Draft' | 'Cancelled';
  created_at: string;
}

// Source: PreviousSessionFeesPage.tsx
export interface PreviousSessionFee {
  id: string;
  student_id: string;
  student_name: string;
  admission_no: string;
  class_name: string;
  previous_session: string;
  carry_over_amount: number;
  amount_paid: number;
  balance_remaining: number;
  status: 'Pending' | 'Partial' | 'Paid' | 'Waived';
  current_session: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

// Source: StudentsPaidBookPage.tsx
export interface StudentPaymentRecord {
  id: string;
  student_id: string;
  student_name: string;
  admission_no: string;
  class_name: string;
  receipt_no: string;
  transaction_date: string;
  amount_paid: number;
  payment_method: string;
  reference_no: string;
  fee_type: string;
  created_at: string;
}

// Source: TrialBalancePage.tsx
export interface TrialBalanceItem {
  id: string;
  account_code: string;
  account_name: string;
  account_type: 'Asset' | 'Liability' | 'Equity' | 'Revenue' | 'Expense';
  debit_balance: number;
  credit_balance: number;
}
