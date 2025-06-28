// ABOUTME: This file defines TypeScript interfaces, enums, and type aliases for the HR module.
// ABOUTME: It ensures all HR-related data structures are managed in one place.

export enum HRPayrollPeriodStatusEnum { OPEN = 'Open', CLOSED = 'Closed', PROCESSED = 'Processed' }
export enum HRPayrollItemCategoryEnum { EARNING = 'Earning', DEDUCTION = 'Deduction', CONTRIBUTION = 'Contribution (Employer)' }
export enum HRPayrollTaxImplicationEnum { TAXABLE = 'Taxable', NON_TAXABLE = 'Non-Taxable', TAX_RELIEF = 'Tax Relief' }
export enum HRPayslipStatusEnum { DRAFT = 'Draft', PROCESSED = 'Processed', PAID = 'Paid', CANCELLED = 'Cancelled' }


export interface HRPayrollPeriodType {
  id: number;
  name: string;
  start_date: string;
  end_date: string;
  financial_year_id: number;
  school_period_id?: number;
  status: HRPayrollPeriodStatusEnum;
  financial_year_name?: string;
  school_period_name?: string;
}

export interface HRPayrollItemTypeType {
  id: number;
  name: string;
  category: HRPayrollItemCategoryEnum;
  tax_implication: HRPayrollTaxImplicationEnum;
  gl_account_expense_id?: number;
  gl_account_liability_id?: number;
  created_at: string;
  updated_at: string;
}

export interface HRStaffRecurringItemType {
  id: string;
  staff_salary_setting_id: string;
  item_type_id: number;
  amount: number;
  created_at?: string;
  item_type_name?: string;
  item_category?: HRPayrollItemCategoryEnum;
}

export interface HRStaffSalarySettingType {
  id: string;
  staff_id: string;
  basic_salary: number;
  payment_bank?: string;
  bank_account_no?: string;
  max_advance_amount?: number;
  recurring_items?: HRStaffRecurringItemType[];
  created_at: string;
  updated_at: string;
  staff_name?: string;
}

export interface HRPayslipItemType {
  id: string;
  payslip_id: string;
  item_type_id: number;
  description?: string;
  amount?: number;
  item_type_name?: string;
  item_category?: HRPayrollItemCategoryEnum;
}

export interface HRPayslipType {
  id: string;
  staff_id: string;
  payroll_period_id: number;
  gross_salary?: number;
  total_deductions?: number;
  net_salary?: number;
  status?: HRPayslipStatusEnum;
  processed_at?: string;
  paid_at?: string;
  items?: HRPayslipItemType[];
  created_at: string;
  updated_at: string;
  staff_name?: string;
  payroll_period_name?: string;
}
