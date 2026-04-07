// ABOUTME: Defines the RxDB collection configurations for the HR module.
// ABOUTME: Module collection definitions - used by UnifiedDatabaseManager

import * as schemas from './schema';

export const hrCollections = {
  payroll_periods: {
    schema: schemas.payrollPeriodsSchema,
  },
  payroll_item_types: {
    schema: schemas.payrollItemTypesSchema,
  },
  staff_salary_settings: {
    schema: schemas.staffSalarySettingsSchema,
  },
  // Note: staff_recurring_items are nested within staff_salary_settings
  payslips: {
    schema: schemas.payslipsSchema,
  },
  // Note: payslip_items are nested within payslips
};

// Type helper for consumers of this module's collections (optional)
export type HRCollections = typeof hrCollections;
