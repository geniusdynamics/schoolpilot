// ABOUTME: Provides initial mock data for entities specific to the HR module.
// ABOUTME: This data is used in "demo" mode and for seeding RxDB in "production" mode.

import {
    PayrollPeriod,
    PayrollItemType,
    StaffSalarySetting,
    StaffRecurringItem,
    Payslip,
    PayslipItem,
    PayrollPeriodStatus,
    PayrollItemCategory,
    PayrollTaxImplication,
    PayslipStatus
} from '../../../core/types';

export const initialMockPayrollPeriods: PayrollPeriod[] = [
  { id: 1, name: 'July 2024 Payroll', start_date: '2024-07-01', end_date: '2024-07-31', financial_year_id: 2, school_period_id: 3, status: PayrollPeriodStatus.OPEN, financial_year_name: 'FY 2024', school_period_name: 'Term 3 - AY 2023/2024' },
  { id: 2, name: 'August 2024 Payroll', start_date: '2024-08-01', end_date: '2024-08-31', financial_year_id: 2, school_period_id: 3, status: PayrollPeriodStatus.OPEN, financial_year_name: 'FY 2024', school_period_name: 'Term 3 - AY 2023/2024' },
  { id: 3, name: 'June 2024 Payroll', start_date: '2024-06-01', end_date: '2024-06-30', financial_year_id: 2, school_period_id: 2, status: PayrollPeriodStatus.CLOSED, financial_year_name: 'FY 2024', school_period_name: 'Term 2 - AY 2023/2024' },
];

export const initialMockPayrollItemTypes: PayrollItemType[] = [
  { id: 1, name: 'Basic Salary', category: PayrollItemCategory.EARNING, tax_implication: PayrollTaxImplication.TAXABLE, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 2, name: 'House Allowance', category: PayrollItemCategory.EARNING, tax_implication: PayrollTaxImplication.TAXABLE, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 3, name: 'Commuter Allowance', category: PayrollItemCategory.EARNING, tax_implication: PayrollTaxImplication.NON_TAXABLE, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 4, name: 'PAYE', category: PayrollItemCategory.DEDUCTION, tax_implication: PayrollTaxImplication.TAXABLE, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 5, name: 'NHIF', category: PayrollItemCategory.DEDUCTION, tax_implication: PayrollTaxImplication.PRE_TAX, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 6, name: 'NSSF (Tier I)', category: PayrollItemCategory.DEDUCTION, tax_implication: PayrollTaxImplication.NON_TAXABLE, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
];

export const initialMockStaffSalarySettings: StaffSalarySetting[] = [
  { id: 'SSS001', staff_id: 'STF001', basic_salary: 150000, payment_bank: 'KCB Bank', bank_account_no: 'ACC001', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), staff_name: 'Michael Scott' },
  { id: 'SSS002', staff_id: 'STF002', basic_salary: 80000, payment_bank: 'Equity Bank', bank_account_no: 'ACC002', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), staff_name: 'Dwight Schrute' },
  { id: 'SSS003', staff_id: 'STF003', basic_salary: 75000, payment_bank: 'Co-operative Bank', bank_account_no: 'ACC003', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), staff_name: 'Jim Halpert' },
];

export const initialMockStaffRecurringItems: StaffRecurringItem[] = [
    { id: 'SRI001', staff_salary_setting_id: 'SSS001', item_type_id: 2, amount: 30000, item_type_name: 'House Allowance', item_category: PayrollItemCategory.EARNING },
    { id: 'SRI002', staff_salary_setting_id: 'SSS001', item_type_id: 3, amount: 5000, item_type_name: 'Commuter Allowance', item_category: PayrollItemCategory.EARNING },
    { id: 'SRI003', staff_salary_setting_id: 'SSS002', item_type_id: 2, amount: 15000, item_type_name: 'House Allowance', item_category: PayrollItemCategory.EARNING },
];

export const initialMockPayslips: Payslip[] = [
  {
    id: 'PSLP001',
    staff_id: 'STF001',
    payroll_period_id: 3,
    gross_salary: 185000,
    total_deductions: 42060,
    net_salary: 142940,
    status: PayslipStatus.PAID,
    created_at: '2024-06-25T10:00:00Z',
    updated_at: '2024-06-28T14:00:00Z',
    staff_name: 'Michael Scott',
    payroll_period_name: 'June 2024 Payroll',
  },
];

export const initialMockPayslipItems: PayslipItem[] = [
    // Items for Michael Scott's June Payslip
    { id: 'PSLI001', payslip_id: 'PSLP001', item_type_id: 1, description: 'Basic Salary', amount: 150000, item_type_name: 'Basic Salary', item_category: PayrollItemCategory.EARNING },
    { id: 'PSLI002', payslip_id: 'PSLP001', item_type_id: 2, description: 'House Allowance', amount: 30000, item_type_name: 'House Allowance', item_category: PayrollItemCategory.EARNING },
    { id: 'PSLI003', payslip_id: 'PSLP001', item_type_id: 3, description: 'Commuter Allowance', amount: 5000, item_type_name: 'Commuter Allowance', item_category: PayrollItemCategory.EARNING },
    { id: 'PSLI004', payslip_id: 'PSLP001', item_type_id: 4, description: 'PAYE', amount: -40000, item_type_name: 'PAYE', item_category: PayrollItemCategory.DEDUCTION },
    { id: 'PSLI005', payslip_id: 'PSLP001', item_type_id: 5, description: 'NHIF', amount: -1700, item_type_name: 'NHIF', item_category: PayrollItemCategory.DEDUCTION },
    { id: 'PSLI006', payslip_id: 'PSLP001', item_type_id: 6, description: 'NSSF', amount: -360, item_type_name: 'NSSF (Tier I)', item_category: PayrollItemCategory.DEDUCTION },
];
