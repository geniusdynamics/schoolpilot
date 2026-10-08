// ABOUTME: Defines the RxDB collection configurations for the HR module.
// ABOUTME: Module collection definitions - used by UnifiedDatabaseManager

import * as schemas from './schema';
import { createDatabaseSchema, type DatabaseSchema } from '@/utils/databaseAgnosticSchema';

// Per-staff earnings and deductions maintained on the Staff Salary Settings page.
const staffSalaryComponentSchema: DatabaseSchema = createDatabaseSchema({
  title: 'staff_salary_component',
  properties: {
    id: { type: 'string', maxLength: 100 },
    staff_id: { type: 'ref', ref: 'staff', maxLength: 100 },
    component_name: { type: 'string', maxLength: 200 },
    component_type: { type: 'string', enum: ['earning', 'deduction'] },
    amount: { type: 'number', minimum: 0, maximum: 99999999.99 },
    is_active: { type: 'boolean' },
    effective_from: { type: 'string', maxLength: 50 },
    effective_to: { type: 'string', nullable: true, maxLength: 50 },
    created_at: { type: 'string', format: 'date-time' },
    updated_at: { type: 'string', format: 'date-time' }
  },
  primaryKey: 'id',
  required: ['id', 'staff_id', 'component_name', 'component_type', 'amount'],
  indexes: ['staff_id', 'component_type']
});

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
  staff_salary_components: {
    schema: staffSalaryComponentSchema,
  },
  payslips: {
    schema: schemas.payslipsSchema,
  },
  // Note: payslip_items are nested within payslips
};

// Type helper for consumers of this module's collections (optional)
export type HRCollections = typeof hrCollections;
