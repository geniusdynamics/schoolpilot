// ABOUTME: Serves as the main CSL entry point for the HR module's data definitions.
// ABOUTME: It re-exports types, mock data, schemas, and collection configurations.

export * from './types';
export * from './mockData';
export * from './schema';
export * from './collections';

export { isGlobalProvider as isPayrollPeriodGlobalProvider, usePayrollPeriodData } from './usePayrollPeriodData';
export { isGlobalProvider as isPayrollItemTypeGlobalProvider, usePayrollItemTypeData } from './usePayrollItemTypeData';
export { isGlobalProvider as isStaffSalarySettingGlobalProvider, useStaffSalarySettingData } from './useStaffSalarySettingData';
export { isGlobalProvider as isStaffRecurringItemGlobalProvider, useStaffRecurringItemData } from './useStaffRecurringItemData';
export { isGlobalProvider as isPayslipGlobalProvider, usePayslipData } from './usePayslipData';
export { isGlobalProvider as isPayslipItemGlobalProvider, usePayslipItemData } from './usePayslipItemData';
