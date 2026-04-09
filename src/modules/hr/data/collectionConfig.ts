// ABOUTME: HR Module Collection Configuration
import type { ModuleCollectionsConfig } from '@/core/types/moduleCollections';

export const hrModuleCollections: ModuleCollectionsConfig = {
  moduleName: 'hr',
  aliases: {
    payroll_periods: 'payrollPeriods',
    payroll_item_types: 'payrollItemTypes',
    staff_salary_settings: 'staffSalarySettings',
    payslips: 'payslips',
  },
};

export default hrModuleCollections;
