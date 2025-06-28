// ABOUTME: This file defines TypeScript interfaces, enums, and type aliases for the Finance module.
// ABOUTME: It ensures all finance-related data structures are managed in one place.

export enum FinFinancialYearStatusEnum { OPEN = 'Open', CLOSED = 'Closed', ARCHIVED = 'Archived' }
export enum FinAccountTypeEnum { ASSET = 'Asset', LIABILITY = 'Liability', EQUITY = 'Equity', REVENUE = 'Revenue', EXPENSE = 'Expense' }
export enum FinAccountTemplateTypeEnum { CORE = 'Core', CUSTOM = 'Custom' }
export enum FinOpeningBalanceTypeEnum { DEBIT = 'Debit', CREDIT = 'Credit' }
export enum FinFeeAdjustmentTypeEnum { SCHOLARSHIP = 'Scholarship', DISCOUNT = 'Discount', EXEMPTION = 'Exemption', FINE = 'Fine', PENALTY = 'Penalty', OTHER = 'Other' }
export enum FinTransportAssignmentStatusEnum { ACTIVE = 'Active', INACTIVE = 'Inactive', CANCELLED = 'Cancelled' }
export enum FinInvoiceStatusEnum { DRAFT = 'Draft', DUE = 'Due', PAID = 'Paid', PARTIALLY_PAID = 'Partially Paid', OVERDUE = 'Overdue', VOIDED = 'Voided' }
export enum FinCustomerInvoiceStatusEnum { DRAFT = 'Draft', SENT = 'Sent', PAID = 'Paid', PARTIALLY_PAID = 'Partially Paid', OVERDUE = 'Overdue', VOIDED = 'Voided' }
export enum FinSupplierInvoiceStatusEnum { UNPAID = 'Unpaid', PAID = 'Paid', PARTIALLY_PAID = 'Partially Paid', VOIDED = 'Voided' }
export enum FinGeneralPayerTypeEnum { STUDENT = 'Student', STAFF = 'Staff', CUSTOMER = 'Customer', PARTNER = 'Partner', OTHER = 'Other' }
export enum FinExpenseClaimantTypeEnum { STUDENT = 'Student', STAFF = 'Staff' }


export interface FinChartOfAccountType {
  id: number;
  account_code: string;
  name: string;
  type: FinAccountTypeEnum;
  template_type: FinAccountTemplateTypeEnum;
  is_active: boolean;
  expense_category_id?: number;
  expense_category_name?: string;
  created_at: string;
  updated_at: string;
}

export interface FinExpenseCategoryType {
  id: number;
  name: string;
}

export interface FinBankType {
  id: number;
  name: string;
  account_no?: string;
  gl_account_id: number;
  created_at: string;
  updated_at: string;
  gl_account_name?: string;
}

export interface FinSupplierType {
  id: number;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  contact_person?: string;
  kra_pin?: string;
  contract_expiry_date?: string;
  created_at: string;
  updated_at: string;
}

export interface FinFeeTemplateItemType {
  id: string;
  fee_template_id: number;
  description: string;
  amount: number;
  revenue_account_id: number;
  linked_expense_category_id?: number;
  linked_meal_plan_id?: number;
  linked_transport_route_id?: number;
  revenue_account_name?: string;
  linked_expense_category_name?: string;
}

export interface FinFeeTemplateType {
  id: number;
  name: string;
  school_period_id: number;
  student_category_id?: number;
  items?: FinFeeTemplateItemType[];
  created_at: string;
  updated_at: string;
  school_period_name?: string;
  student_category_name?: string;
}

export interface FinExpenseClaimType {
  id: string;
  claimant_type: FinExpenseClaimantTypeEnum;
  claimant_id: string;
  claim_date: string;
  description: string;
  amount: number;
  expense_category_id: number;
  workflow_state_id?: number;
  workflow_status_name?: string;
  approved_by?: string;
  paid_date?: string;
  payment_reference?: string;
  created_at: string;
  updated_at: string;
  claimant_name?: string;
  expense_category_name?: string;
}

export interface FinStudentOpeningBalanceType {
  id: string;
  student_id: string;
  balance_type: FinOpeningBalanceTypeEnum;
  amount: number;
  as_of_date: string;
  is_billed: boolean;
  created_at: string;
  updated_at: string;
  student_name?: string;
}

export interface FinFeeAdjustmentType {
  id: string;
  student_id: string;
  school_period_id: number;
  adjustment_type: FinFeeAdjustmentTypeEnum;
  amount: number;
  reason?: string;
  applied_invoice_id?: string;
  created_at?: string;
  student_name?: string;
  school_period_name?: string;
}

export interface FinTransportRouteType {
  id: number;
  name: string;
  cost_per_period: number;
  gl_revenue_account_id: number;
  created_at: string;
  updated_at: string;
  gl_revenue_account_name?: string;
}

export interface FinStudentTransportAssignmentType {
  id: string;
  student_id: string;
  route_id: number;
  school_period_id: number;
  status: FinTransportAssignmentStatusEnum;
  invoice_id?: string;
  cost_override?: number;
  created_at: string;
  updated_at: string;
  student_name?: string;
  route_name?: string;
  school_period_name?: string;
}

export interface FinStudentInvoiceItemType {
  id: string;
  invoice_id: string;
  description: string;
  amount: number;
  fee_template_item_id?: string;
  student_transport_assignment_id?: string;
  fine_id?: string;
}

export interface FinStudentInvoiceType {
  id: string;
  student_id: string;
  invoice_number: string;
  school_period_id: number;
  issue_date: string;
  due_date: string;
  total_amount_billed: number;
  amount_paid: number;
  status: FinInvoiceStatusEnum;
  items?: FinStudentInvoiceItemType[];
  created_at: string;
  updated_at: string;
  deleted_at?: string;
  student_name?: string;
  school_period_name?: string;
}

export interface FinStudentPaymentType {
  id: string;
  student_id: string;
  receipt_no: string;
  total_amount_paid: number;
  payment_method?: string;
  transaction_date: string;
  reference_no?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  student_name?: string;
}

export interface FinInvoicePaymentApplicationType {
  id: string;
  payment_id: string;
  invoice_item_id: string;
  amount_applied: number;
}

export interface FinCustomerInvoiceItemType {
  id: string;
  invoice_id: string;
  description?: string;
  quantity?: number;
  unit_price?: number;
  amount?: number;
  revenue_account_id?: number;
  revenue_account_name?: string;
}

export interface FinCustomerInvoiceType {
  id: string;
  customer_id: number;
  invoice_number: string;
  issue_date: string;
  due_date?: string;
  total_amount?: number;
  status?: FinCustomerInvoiceStatusEnum;
  notes?: string;
  items?: FinCustomerInvoiceItemType[];
  created_at: string;
  updated_at: string;
  customer_name?: string;
}

export interface FinSupplierInvoiceType {
  id: string;
  supplier_id: number;
  invoice_number: string;
  invoice_date: string;
  due_date?: string;
  total_amount: number;
  amount_paid?: number;
  status?: FinSupplierInvoiceStatusEnum;
  purchase_order_id?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  supplier_name?: string;
}

export interface FinGeneralPaymentItemType {
  id: string;
  general_payment_id: string;
  description: string;
  amount: number;
  revenue_account_id: number;
  revenue_account_name?: string;
}

export interface FinGeneralPaymentType {
  id: string;
  payer_type: FinGeneralPayerTypeEnum;
  payer_id?: string;
  payer_name_external?: string;
  payment_date: string;
  total_amount_paid: number;
  payment_method?: string;
  reference_no?: string;
  notes?: string;
  items: FinGeneralPaymentItemType[];
  created_at: string;
  updated_at: string;
  payer_name_resolved?: string;
}

export interface FinGeneralLedgerEntryType {
    id: string;
    transaction_date: string;
    effective_date: string;
    financial_year_id: number;
    account_id: number;
    debit?: number;
    credit?: number;
    description: string;
    source_table?: string;
    source_id?: string;
}
