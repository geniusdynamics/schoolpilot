// src/core/types/finance.ts
// ABOUTME: Cross-module finance types (Fee, Payment, Invoice, Ledger, etc.) used by 2+ modules.

import type {
  FinancialYearStatus,
  AccountType,
  AccountTemplateType,
  OpeningBalanceType,
  InvoiceStatus,
  FeeAdjustmentType,
  ExpenseClaimantType,
  TransportAssignmentStatus,
  CustomerInvoiceStatus,
  SupplierInvoiceStatus,
  GeneralPayerType,
  PayrollPeriodStatus,
  PayrollItemCategory,
  PayrollTaxImplication,
  PayslipStatus,
} from './enums';

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
    // Denormalized
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
    // Denormalized
    gl_account_name?: string | null;
}

export interface Supplier {
    id: string;
    name: string;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
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
    // Denormalized
    revenue_account_name?: string | null;
    linked_expense_category_name?: string | null;
    linked_meal_plan_id?: number | null;
    linked_transport_route_id?: number | null;
}

export interface FeeTemplate {
    id: number;
    name: string;
    school_period_id: number;
    student_category_id?: number | null;
    created_at: string;
    updated_at: string;
    // Denormalized
    school_period_name?: string | null;
    student_category_name?: string | null;
    items?: FeeTemplateItem[];
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
    created_at: string;
    updated_at: string;
    // Denormalized
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
    amount?: number | null;
    revenue_account_id?: number | null;
    // Denormalized
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
    created_at: string;
    updated_at: string;
    items?: CustomerInvoiceItem[];
    // Denormalized
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
    created_at: string;
    updated_at: string;
    // Denormalized
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
    // Denormalized
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
    // Denormalized
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
    // Denormalized
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
    // Denormalized
    student_name?: string | null;
    route_name?: string | null;
    school_period_name?: string | null;
}

export interface StudentInvoiceItem {
    id: string;
    invoice_id: string;
    description: string;
    amount: number;
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
    // Denormalized
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
    created_at: string;
    updated_at: string;
    // Denormalized
    student_name?: string | null;
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
    // Denormalized
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
    // Denormalized
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

export interface RFQ {
    id: string;
    title: string;
    description?: string | null;
    issue_date: string;
    closing_date: string;
    status: import('./enums').RFQStatus;
    created_at: string;
    updated_at: string;
}

// --- HR / Payroll ---

export interface PayrollPeriod {
    id: number;
    name: string;
    start_date: string;
    end_date: string;
    financial_year_id: number;
    school_period_id?: number | null;
    status?: PayrollPeriodStatus | null;
    // Denormalized
    financial_year_name?: string | null;
    school_period_name?: string | null;
}

export interface PayrollItemType {
    id: number;
    name: string;
    category: PayrollItemCategory;
    tax_implication: PayrollTaxImplication;
    created_at: string;
    updated_at: string;
}

export interface StaffRecurringItem {
    id: string;
    staff_salary_setting_id: string;
    item_type_id: number;
    amount: number;
    created_at?: string | null;
    // Denormalized
    item_type_name?: string | null;
    item_category?: PayrollItemCategory | null;
}

export interface StaffSalarySetting {
    id: string;
    staff_id: string;
    basic_salary: number;
    payment_bank?: string | null;
    bank_account_no?: string | null;
    max_advance_amount?: number | null;
    created_at: string;
    updated_at: string;
    recurring_items?: StaffRecurringItem[];
    // Denormalized
    staff_name?: string | null;
}

export interface PayslipItem {
    id: string;
    payslip_id: string;
    item_type_id: number;
    description?: string | null;
    amount?: number | null;
    // Denormalized
    item_type_name?: string | null;
    item_category?: PayrollItemCategory | null;
}

export interface Payslip {
    id: string;
    staff_id: string;
    payroll_period_id: number;
    gross_salary?: number | null;
    total_deductions?: number | null;
    net_salary?: number | null;
    status?: PayslipStatus | null;
    created_at: string;
    updated_at: string;
    items?: PayslipItem[];
    // Denormalized
    staff_name?: string | null;
    payroll_period_name?: string | null;
}
