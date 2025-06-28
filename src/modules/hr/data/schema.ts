// ABOUTME: Defines RxDB JSON schemas for entities specific to the HR module.
// ABOUTME: These schemas are used by rxdbService.ts to create collections.

import { RxJsonSchema } from 'rxdb';
import * as types from './types';
import { createEntitySchema } from '../../../services/rxdbService'; 

export const payrollPeriodsSchema: RxJsonSchema<types.HRPayrollPeriodType> = createEntitySchema<types.HRPayrollPeriodType>(
    'payroll_period',
    {
        id: { type: 'number' },
        name: { type: 'string', maxLength: 100 },
        start_date: { type: 'string', format: 'date' },
        end_date: { type: 'string', format: 'date' },
        financial_year_id: { type: 'number', ref: 'financial_years' },
        school_period_id: { type: ['number', 'null'], ref: 'school_periods' },
        status: { type: ['string', 'null'], enum: [...Object.values(types.HRPayrollPeriodStatusEnum), null] },
        financial_year_name: { type: ['string', 'null'] },
        school_period_name: { type: ['string', 'null'] },
    },
    { key: 'id', type: 'number' },
    ['id', 'name', 'start_date', 'end_date', 'financial_year_id'],
    ['name', 'financial_year_id', 'status']
);

export const payrollItemTypesSchema: RxJsonSchema<types.HRPayrollItemTypeType> = createEntitySchema<types.HRPayrollItemTypeType>(
    'payroll_item_type',
    {
        id: { type: 'number' },
        name: { type: 'string', maxLength: 100 },
        category: { type: 'string', enum: Object.values(types.HRPayrollItemCategoryEnum) },
        tax_implication: { type: 'string', enum: Object.values(types.HRPayrollTaxImplicationEnum) },
        gl_account_expense_id: { type: ['number', 'null'], ref: 'chart_of_accounts' },
        gl_account_liability_id: { type: ['number', 'null'], ref: 'chart_of_accounts' },
        created_at: { type: 'string', format: 'date-time' },
        updated_at: { type: 'string', format: 'date-time' },
    },
    { key: 'id', type: 'number' },
    ['id', 'name', 'category', 'tax_implication', 'created_at', 'updated_at'],
    ['name', 'category']
);

export const staffRecurringItemProperties: RxJsonSchema<types.HRStaffRecurringItemType>['properties'] = {
    id: { type: 'string', maxLength: 100, final: true },
    staff_salary_setting_id: { type: 'string' }, // No ref, nested
    item_type_id: { type: 'number', ref: 'payroll_item_types' },
    amount: { type: 'number' },
    created_at: { type: ['string', 'null'], format: 'date-time' },
    item_type_name: { type: ['string', 'null'] },
    item_category: { type: ['string', 'null'], enum: [...Object.values(types.HRPayrollItemCategoryEnum), null] as any[] },
};

export const staffSalarySettingsSchema: RxJsonSchema<types.HRStaffSalarySettingType> = createEntitySchema<types.HRStaffSalarySettingType>(
    'staff_salary_setting',
    {
        id: { type: 'string', maxLength: 100, final: true },
        staff_id: { type: 'string', ref: 'staff', final: true }, // staff_id should be unique for settings
        basic_salary: { type: 'number' },
        payment_bank: { type: ['string', 'null'] },
        bank_account_no: { type: ['string', 'null'] },
        max_advance_amount: { type: ['number', 'null'] },
        created_at: { type: 'string', format: 'date-time' },
        updated_at: { type: 'string', format: 'date-time' },
        recurring_items: { type: ['array', 'null'], default: [], items: { type: 'object', properties: staffRecurringItemProperties } },
        staff_name: { type: ['string', 'null'] },
    },
    { key: 'id', type: 'string' }, 
    ['id', 'staff_id', 'basic_salary', 'created_at', 'updated_at'],
    ['staff_id'] 
);

export const payslipItemProperties: RxJsonSchema<types.HRPayslipItemType>['properties'] = {
    id: { type: 'string', maxLength: 100, final: true },
    payslip_id: { type: 'string' }, // No ref, nested
    item_type_id: { type: 'number', ref: 'payroll_item_types' },
    description: { type: ['string', 'null'] },
    amount: { type: ['number', 'null'] },
    item_type_name: { type: ['string', 'null'] },
    item_category: { type: ['string', 'null'], enum: [...Object.values(types.HRPayrollItemCategoryEnum), null] as any[] },
};

export const payslipsSchema: RxJsonSchema<types.HRPayslipType> = createEntitySchema<types.HRPayslipType>(
    'payslip',
    {
        id: { type: 'string', maxLength: 100, final: true },
        staff_id: { type: 'string', ref: 'staff' },
        payroll_period_id: { type: 'number', ref: 'payroll_periods' },
        gross_salary: { type: ['number', 'null'] },
        total_deductions: { type: ['number', 'null'] },
        net_salary: { type: ['number', 'null'] },
        status: { type: ['string', 'null'], enum: [...Object.values(types.HRPayslipStatusEnum), null] },
        processed_at: { type: ['string', 'null'], format: 'date-time' },
        paid_at: { type: ['string', 'null'], format: 'date-time' },
        created_at: { type: 'string', format: 'date-time' },
        updated_at: { type: 'string', format: 'date-time' },
        items: { type: ['array', 'null'], default: [], items: { type: 'object', properties: payslipItemProperties } },
        staff_name: { type: ['string', 'null'] },
        payroll_period_name: { type: ['string', 'null'] },
    },
    { key: 'id', type: 'string' },
    ['id', 'staff_id', 'payroll_period_id', 'status', 'created_at', 'updated_at'],
    ['staff_id', 'payroll_period_id', 'status']
);
