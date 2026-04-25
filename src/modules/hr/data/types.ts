// ABOUTME: This file defines TypeScript interfaces, enums, and type aliases for the HR module.
// ABOUTME: It ensures all HR-related data structures are managed in one place.

import { HRPayrollPeriodStatusEnum } from '@/core/types';

export enum HRPayrollItemCategoryEnum { EARNING = 'Earning', DEDUCTION = 'Deduction', CONTRIBUTION = 'Contribution (Employer)' }
export enum HRPayrollTaxImplicationEnum { TAXABLE = 'Taxable', NON_TAXABLE = 'Non-Taxable', TAX_RELIEF = 'Tax Relief' }
export enum HRPayslipStatusEnum { DRAFT = 'Draft', PROCESSED = 'Processed', PAID = 'Paid', CANCELLED = 'Cancelled' }

export interface PayrollPeriod {
  id: number;
  name: string;
  start_date: string;
  end_date: string;
  financial_year_id: number;
  school_period_id: number;
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

// Non-prefixed type aliases for backward compatibility
export type PayrollItemType = HRPayrollItemTypeType;
export type StaffRecurringItem = HRStaffRecurringItemType;
export type StaffSalarySetting = HRStaffSalarySettingType;
export type PayslipItem = HRPayslipItemType;
export type Payslip = HRPayslipType;

// === NEW TYPES FOR HR PAGES (from inline mock data migration) ===

// Source: StaffBioDataPage.tsx
export interface Qualification {
  id: string;
  degree: string;
  institution: string;
  year: string;
  field: string;
}

export interface EmploymentHistory {
  id: string;
  organization: string;
  position: string;
  start_date: string;
  end_date?: string;
  reason_for_leaving?: string;
}

export type ContractStatus = 'Active' | 'Expired' | 'Terminated';

export interface Contract {
  id: string;
  contract_type: string;
  start_date: string;
  end_date: string;
  salary: number;
  status: ContractStatus;
}

export interface PerformanceReview {
  id: string;
  review_period: string;
  rating: number;
  reviewer: string;
  comments: string;
  date: string;
}

export interface StaffBioData {
  id: string;
  staff_id: string;
  name: string;
  designation: string;
  department: string;
  date_of_birth: string;
  gender: string;
  marital_status: string;
  blood_group: string;
  phone: string;
  email: string;
  address: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  emergency_contact_relation: string;
  qualifications: Qualification[];
  employment_history: EmploymentHistory[];
  contracts: Contract[];
  performance_reviews: PerformanceReview[];
  created_at: string;
}
