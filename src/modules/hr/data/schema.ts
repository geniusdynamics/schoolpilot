// ABOUTME: Defines database-agnostic schemas for entities specific to the HR module.
// ABOUTME: These schemas are used by both RxDB and PouchDB services to create collections.

import * as types from './types';
import { createDatabaseSchema, SchemaHelpers } from '../../../utils/databaseAgnosticSchema'; 
import type { DatabaseSchema, DatabaseProperty } from '../../../utils/databaseAgnosticSchema';

export const payrollPeriodsSchema: DatabaseSchema = createDatabaseSchema({
    title: 'payroll_period',
    primaryKey: 'id',
    properties: {
        id: SchemaHelpers.string({ description: 'Unique identifier', maxLength: 100 }),
        name: SchemaHelpers.string({ description: 'Payroll period name', maxLength: 100 }),
        start_date: SchemaHelpers.string({ description: 'Start date', format: 'date', maxLength: 20 }),
        end_date: SchemaHelpers.string({ description: 'End date', format: 'date', maxLength: 20 }),
        financial_year_id: SchemaHelpers.ref('financial_years', { description: 'Reference to financial year', maxLength: 100 }),
        school_period_id: SchemaHelpers.ref('school_periods', { description: 'Reference to school period', maxLength: 100 }),
        status: SchemaHelpers.string({ description: 'Payroll period status', enum: Object.values(types.HRPayrollPeriodStatusEnum), maxLength: 50 }),
        financial_year_name: SchemaHelpers.string({ description: 'Financial year name (computed)', maxLength: 100 }),
        school_period_name: SchemaHelpers.string({ description: 'School period name (computed)', maxLength: 100 }),
    },
    required: ['id', 'name', 'start_date', 'end_date', 'financial_year_id'],
    indexes: ['name', 'financial_year_id', 'status']
});

export const payrollItemTypesSchema: DatabaseSchema = createDatabaseSchema({
    title: 'payroll_item_type',
    primaryKey: 'id',
    properties: {
        id: SchemaHelpers.string({ description: 'Unique identifier', maxLength: 100 }),
        name: SchemaHelpers.string({ description: 'Payroll item type name', maxLength: 100 }),
        category: SchemaHelpers.string({ description: 'Payroll item category', enum: Object.values(types.HRPayrollItemCategoryEnum), maxLength: 50 }),
        tax_implication: SchemaHelpers.string({ description: 'Tax implication', enum: Object.values(types.HRPayrollTaxImplicationEnum), maxLength: 50 }),
        gl_account_expense_id: SchemaHelpers.ref('chart_of_accounts', { description: 'Reference to expense GL account', maxLength: 100 }),
        gl_account_liability_id: SchemaHelpers.ref('chart_of_accounts', { description: 'Reference to liability GL account', maxLength: 100 }),
        created_at: SchemaHelpers.timestamp({ description: 'Creation timestamp' }),
        updated_at: SchemaHelpers.timestamp({ description: 'Last update timestamp' }),
    },
    required: ['id', 'name', 'category', 'tax_implication', 'created_at', 'updated_at'],
    indexes: ['name', 'category']
});

export const staffRecurringItemProperties: Record<string, DatabaseProperty> = {
    id: SchemaHelpers.string({ description: 'Unique identifier', maxLength: 100 }),
    staff_salary_setting_id: SchemaHelpers.string({ description: 'Staff salary setting ID', maxLength: 100 }),
    item_type_id: SchemaHelpers.ref('payroll_item_types', { description: 'Reference to payroll item type', maxLength: 100 }),
    amount: SchemaHelpers.number({ description: 'Amount', multipleOf: 0.01, minimum: 0, maximum: 999999.99 }),
    created_at: SchemaHelpers.timestamp({ description: 'Creation timestamp' }),
    item_type_name: SchemaHelpers.string({ description: 'Item type name (computed)', maxLength: 100 }),
    item_category: SchemaHelpers.string({ description: 'Item category (computed)', enum: [...Object.values(types.HRPayrollItemCategoryEnum), null] }),
};

export const staffSalarySettingsSchema: DatabaseSchema = createDatabaseSchema({
    title: 'staff_salary_setting',
    primaryKey: 'id',
    properties: {
        id: SchemaHelpers.string({ description: 'Unique identifier', maxLength: 100 }),
        staff_id: SchemaHelpers.ref('staff', { description: 'Reference to staff member', maxLength: 100 }),
        basic_salary: SchemaHelpers.number({ description: 'Basic salary amount', multipleOf: 0.01, minimum: 0, maximum: 999999.99 }),
        payment_bank: SchemaHelpers.string({ description: 'Payment bank', maxLength: 100 }),
        bank_account_no: SchemaHelpers.string({ description: 'Bank account number', maxLength: 50 }),
        max_advance_amount: SchemaHelpers.number({ description: 'Maximum advance amount', multipleOf: 0.01, minimum: 0, maximum: 999999.99 }),
        created_at: SchemaHelpers.timestamp({ description: 'Creation timestamp' }),
        updated_at: SchemaHelpers.timestamp({ description: 'Last update timestamp' }),
        recurring_items: SchemaHelpers.array({
            description: 'Recurring payroll items',
            items: SchemaHelpers.object({ properties: staffRecurringItemProperties })
        }),
        staff_name: SchemaHelpers.string({ description: 'Staff name (computed)', maxLength: 200 }),
    },
    required: ['id', 'staff_id', 'basic_salary', 'created_at', 'updated_at'],
    indexes: ['staff_id']
});

export const payslipItemProperties: Record<string, DatabaseProperty> = {
    id: SchemaHelpers.string({ description: 'Unique identifier', maxLength: 100 }),
    payslip_id: SchemaHelpers.string({ description: 'Payslip ID', maxLength: 100 }),
    item_type_id: SchemaHelpers.ref('payroll_item_types', { description: 'Reference to payroll item type', maxLength: 100 }),
    description: SchemaHelpers.string({ description: 'Item description', maxLength: 500 }),
    amount: SchemaHelpers.number({ description: 'Item amount', multipleOf: 0.01, minimum: 0, maximum: 999999.99 }),
    item_type_name: SchemaHelpers.string({ description: 'Item type name (computed)', maxLength: 100 }),
    item_category: SchemaHelpers.string({ description: 'Item category (computed)', enum: [...Object.values(types.HRPayrollItemCategoryEnum), null] }),
};

export const payslipsSchema: DatabaseSchema = createDatabaseSchema({
    title: 'payslip',
    primaryKey: 'id',
    properties: {
        id: SchemaHelpers.string({ description: 'Unique identifier', maxLength: 100 }),
        staff_id: SchemaHelpers.ref('staff', { description: 'Reference to staff member', maxLength: 100 }),
        payroll_period_id: SchemaHelpers.ref('payroll_periods', { description: 'Reference to payroll period' }),
        gross_salary: SchemaHelpers.number({ description: 'Gross salary amount', multipleOf: 0.01, minimum: 0, maximum: 999999.99 }),
        total_deductions: SchemaHelpers.number({ description: 'Total deductions amount', multipleOf: 0.01, minimum: 0, maximum: 999999.99 }),
        net_salary: SchemaHelpers.number({ description: 'Net salary amount', multipleOf: 0.01, minimum: -999999.99, maximum: 999999.99 }),
        status: SchemaHelpers.string({ description: 'Payslip status', enum: Object.values(types.HRPayslipStatusEnum), maxLength: 50 }),
        processed_at: SchemaHelpers.timestamp({ description: 'Processing timestamp' }),
        paid_at: SchemaHelpers.timestamp({ description: 'Payment timestamp' }),
        created_at: SchemaHelpers.timestamp({ description: 'Creation timestamp' }),
        updated_at: SchemaHelpers.timestamp({ description: 'Last update timestamp' }),
        items: SchemaHelpers.array({
            description: 'Payslip items',
            items: SchemaHelpers.object({ properties: payslipItemProperties })
        }),
        staff_name: SchemaHelpers.string({ description: 'Staff name (computed)', maxLength: 200 }),
        payroll_period_name: SchemaHelpers.string({ description: 'Payroll period name (computed)', maxLength: 100 }),
    },
    required: ['id', 'staff_id', 'payroll_period_id', 'status', 'created_at', 'updated_at'],
    indexes: ['staff_id', 'payroll_period_id', 'status']
});
