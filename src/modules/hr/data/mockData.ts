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

// Additional comprehensive HR mock data
export const initialMockEmployeeDepartments = [
    { id: 1, name: 'Administration', description: 'Administrative staff and management' },
    { id: 2, name: 'Academic', description: 'Teaching staff and academic support' },
    { id: 3, name: 'Finance', description: 'Financial management and accounting' },
    { id: 4, name: 'Maintenance', description: 'Facilities and maintenance staff' },
    { id: 5, name: 'Library', description: 'Library and information services' },
    { id: 6, name: 'ICT', description: 'Information and communication technology' },
    { id: 7, name: 'Health Services', description: 'Medical and health support staff' },
    { id: 8, name: 'Security', description: 'Security and safety personnel' }
];

export const initialMockJobPositions = [
    { id: 1, title: 'Principal', department_id: 1, grade: 'A1', min_salary: 180000, max_salary: 250000 },
    { id: 2, title: 'Deputy Principal', department_id: 1, grade: 'A2', min_salary: 150000, max_salary: 200000 },
    { id: 3, title: 'Senior Teacher', department_id: 2, grade: 'B1', min_salary: 90000, max_salary: 130000 },
    { id: 4, title: 'Teacher', department_id: 2, grade: 'B2', min_salary: 70000, max_salary: 100000 },
    { id: 5, title: 'Finance Manager', department_id: 3, grade: 'B1', min_salary: 100000, max_salary: 140000 },
    { id: 6, title: 'Accountant', department_id: 3, grade: 'C1', min_salary: 60000, max_salary: 90000 },
    { id: 7, title: 'Librarian', department_id: 5, grade: 'C1', min_salary: 55000, max_salary: 80000 },
    { id: 8, title: 'ICT Coordinator', department_id: 6, grade: 'B2', min_salary: 80000, max_salary: 120000 },
    { id: 9, title: 'School Nurse', department_id: 7, grade: 'C1', min_salary: 65000, max_salary: 95000 },
    { id: 10, title: 'Security Guard', department_id: 8, grade: 'D1', min_salary: 35000, max_salary: 50000 }
];

export const initialMockEmployeeTypes = [
    { id: 1, name: 'Permanent', description: 'Permanent full-time employee' },
    { id: 2, name: 'Contract', description: 'Fixed-term contract employee' },
    { id: 3, name: 'Part-time', description: 'Part-time employee' },
    { id: 4, name: 'Substitute', description: 'Substitute or temporary teacher' },
    { id: 5, name: 'Intern', description: 'Student teacher or intern' }
];

export const initialMockLeaveTypes = [
    { id: 1, name: 'Annual Leave', days_per_year: 21, carry_forward: true, max_carry_forward: 7 },
    { id: 2, name: 'Sick Leave', days_per_year: 14, carry_forward: false, max_carry_forward: 0 },
    { id: 3, name: 'Maternity Leave', days_per_year: 90, carry_forward: false, max_carry_forward: 0 },
    { id: 4, name: 'Paternity Leave', days_per_year: 14, carry_forward: false, max_carry_forward: 0 },
    { id: 5, name: 'Study Leave', days_per_year: 30, carry_forward: false, max_carry_forward: 0 },
    { id: 6, name: 'Compassionate Leave', days_per_year: 5, carry_forward: false, max_carry_forward: 0 },
    { id: 7, name: 'Special Leave', days_per_year: 0, carry_forward: false, max_carry_forward: 0 }
];

export const initialMockLeaveApplications = [
    {
        id: 'LEAVE001',
        staff_id: 'STF001',
        leave_type_id: 1,
        start_date: '2024-08-15',
        end_date: '2024-08-22',
        days_requested: 6,
        reason: 'Family vacation',
        status: 'APPROVED',
        applied_on: '2024-07-20T09:00:00Z',
        approved_by: 'STF000',
        approved_on: '2024-07-21T14:30:00Z',
        staff_name: 'Michael Scott',
        leave_type_name: 'Annual Leave',
        approver_name: 'Principal Johnson'
    },
    {
        id: 'LEAVE002',
        staff_id: 'STF002',
        leave_type_id: 2,
        start_date: '2024-07-25',
        end_date: '2024-07-26',
        days_requested: 2,
        reason: 'Medical appointment',
        status: 'PENDING',
        applied_on: '2024-07-24T11:15:00Z',
        approved_by: null,
        approved_on: null,
        staff_name: 'Dwight Schrute',
        leave_type_name: 'Sick Leave',
        approver_name: null
    }
];

export const initialMockPerformanceReviews = [
    {
        id: 'PR001',
        staff_id: 'STF001',
        review_period: '2024-Q1',
        reviewer_id: 'STF000',
        overall_rating: 4.2,
        strengths: 'Excellent leadership skills, great rapport with students',
        areas_for_improvement: 'Time management in administrative tasks',
        goals_next_period: 'Implement new teaching methodologies, complete management training',
        review_date: '2024-04-15T10:00:00Z',
        status: 'COMPLETED',
        staff_name: 'Michael Scott',
        reviewer_name: 'Principal Johnson'
    },
    {
        id: 'PR002',
        staff_id: 'STF002',
        review_period: '2024-Q1',
        reviewer_id: 'STF001',
        overall_rating: 3.8,
        strengths: 'Subject matter expertise, punctuality',
        areas_for_improvement: 'Student engagement techniques',
        goals_next_period: 'Attend professional development workshops',
        review_date: '2024-04-20T14:30:00Z',
        status: 'COMPLETED',
        staff_name: 'Dwight Schrute',
        reviewer_name: 'Michael Scott'
    }
];

export const initialMockTrainingPrograms = [
    {
        id: 'TP001',
        title: 'Modern Teaching Methodologies',
        description: 'Workshop on contemporary teaching approaches and student engagement',
        provider: 'Kenya Institute of Education',
        duration_hours: 40,
        cost: 15000,
        start_date: '2024-08-10',
        end_date: '2024-08-14',
        max_participants: 25,
        status: 'SCHEDULED'
    },
    {
        id: 'TP002',
        title: 'Financial Management for Schools',
        description: 'Training on budget management and financial controls',
        provider: 'Institute of Public Finance',
        duration_hours: 24,
        cost: 12000,
        start_date: '2024-09-05',
        end_date: '2024-09-07',
        max_participants: 15,
        status: 'OPEN_FOR_REGISTRATION'
    }
];

export const initialMockTrainingEnrollments = [
    {
        id: 'TE001',
        training_program_id: 'TP001',
        staff_id: 'STF001',
        enrollment_date: '2024-07-15T08:00:00Z',
        completion_status: 'ENROLLED',
        completion_date: null,
        certificate_issued: false,
        staff_name: 'Michael Scott',
        training_title: 'Modern Teaching Methodologies'
    },
    {
        id: 'TE002',
        training_program_id: 'TP002',
        staff_id: 'STF003',
        enrollment_date: '2024-07-20T10:30:00Z',
        completion_status: 'ENROLLED',
        completion_date: null,
        certificate_issued: false,
        staff_name: 'Jim Halpert',
        training_title: 'Financial Management for Schools'
    }
];

export const initialMockAttendanceRecords = [
    {
        id: 'ATT001',
        staff_id: 'STF001',
        date: '2024-07-29',
        check_in_time: '07:45:00',
        check_out_time: '16:30:00',
        total_hours: 8.75,
        status: 'PRESENT',
        notes: null,
        staff_name: 'Michael Scott'
    },
    {
        id: 'ATT002',
        staff_id: 'STF002',
        date: '2024-07-29',
        check_in_time: '08:00:00',
        check_out_time: '16:00:00',
        total_hours: 8.0,
        status: 'PRESENT',
        notes: null,
        staff_name: 'Dwight Schrute'
    },
    {
        id: 'ATT003',
        staff_id: 'STF003',
        date: '2024-07-29',
        check_in_time: null,
        check_out_time: null,
        total_hours: 0,
        status: 'SICK_LEAVE',
        notes: 'Medical certificate provided',
        staff_name: 'Jim Halpert'
    }
];

export const initialMockDisciplinaryActions = [
    {
        id: 'DA001',
        staff_id: 'STF004',
        incident_date: '2024-07-15',
        description: 'Late arrival to work repeatedly',
        action_taken: 'VERBAL_WARNING',
        issued_by: 'STF000',
        issue_date: '2024-07-16T09:00:00Z',
        follow_up_date: '2024-08-16',
        status: 'ACTIVE',
        staff_name: 'Stanley Hudson',
        issued_by_name: 'Principal Johnson'
    }
];

// Ensure all AppDataType keys for hr are exported
export const payrollPeriods = initialMockPayrollPeriods;
export const payrollItemTypes = initialMockPayrollItemTypes;
export const staffSalarySettings = initialMockStaffSalarySettings;
export const payslips = initialMockPayslips;





