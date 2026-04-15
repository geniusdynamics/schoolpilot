// ABOUTME: Serves as the main CSL entry point for the HR module's data definitions.
// ABOUTME: It re-exports types, mock data, schemas, and collection configurations.

export * from './types';
export * from './mockData';
export * from './schema';
export * from './collections';

// Modular data provider (new architecture)
export { 
  HRDataProvider,
  useHRDataContext 
} from './HRDataContext';

export { usePayrollPeriodData } from './usePayrollPeriodData';
export { usePayrollItemTypeData } from './usePayrollItemTypeData';
export { useStaffSalarySettingData } from './useStaffSalarySettingData';
export { useStaffRecurringItemData } from './useStaffRecurringItemData';
export { usePayslipData } from './usePayslipData';
export { usePayslipItemData } from './usePayslipItemData';
