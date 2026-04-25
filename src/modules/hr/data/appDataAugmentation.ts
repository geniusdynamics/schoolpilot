// ABOUTME: TypeScript module augmentation for HR collections in AppData
// ABOUTME: Extends AppDataType and AppDataContextType with HR-specific properties
// ABOUTME: This is the compile-time equivalent of Frappe's DocType self-registration

import type {
  PayrollPeriod,
  PayrollItemType,
  StaffSalarySetting,
  Payslip,
} from './types';

declare module '@/core/types' {
  export interface AppDataType {
    payrollPeriods: PayrollPeriod[];
    payrollItemTypes: PayrollItemType[];
    staffSalarySettings: StaffSalarySetting[];
    payslips: Payslip[];
  }

  export interface AppDataContextType {
    // Payroll Period CRUD
    addPayrollPeriod: (data: any) => Promise<any>;
    updatePayrollPeriod: (id: string, data: any) => Promise<any>;
    deletePayrollPeriod: (id: string) => Promise<void>;
    // Payslip CRUD
    addPayslip: (data: any) => Promise<any>;
    updatePayslip: (id: string, data: any) => Promise<any>;
    deletePayslip: (id: string) => Promise<void>;
  }
}
