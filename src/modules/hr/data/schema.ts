// ABOUTME: Defines RxDB JSON schemas for entities specific to the HR module.
// ABOUTME: These schemas are used by rxdbService.ts to create collections.

import { RxJsonSchema } from 'rxdb';
import * as types from './types';
import { createEntitySchema } from '../../../utils/schemaUtils'; 

export const payrollPeriodsSchema: RxJsonSchema<types.HRPayrollPeriodType> = createEntitySchema<types.HRPayrollPeriodType>(
    'payroll_period',
    {
        id: { type: 'string', maxLength: 100 },
        name: { type: 'string', maxLength: 100 },
        start_date: { type: 'string', format: 'date', maxLength: 20 },
        end_date: { type: 'string', format: 'date', maxLength: 20 },
        financial_year_id: { type: 'string', ref: 'financial_years', maxLength: 100 },
        school_period_id: { type: ['string', 'null'], ref: 'school_periods', maxLength: 100 },
        status: { type: 'string', enum: Object.values(types.HRPayrollPeriodStatusEnum), maxLength: 50 },
        financial_year_name: { type: ['string', 'null'], maxLength: 100 },
        school_period_name: { type: ['string', 'null'], maxLength: 100 },
    },
    { key: 'id', type: 'string' },
    ['id', 'name', 'start_date', 'end_date', 'financial_year_id'],
    ['name', 'financial_year_id', 'status']
);

export const payrollItemTypesSchema: RxJsonSchema<types.HRPayrollItemTypeType> = createEntitySchema<types.HRPayrollItemTypeType>(
    'payroll_item_type',
    {
        id: { type: 'string', maxLength: 100 },
        name: { type: 'string', maxLength: 100 },
        category: { type: 'string', enum: Object.values(types.HRPayrollItemCategoryEnum), maxLength: 50 },
        tax_implication: { type: 'string', enum: Object.values(types.HRPayrollTaxImplicationEnum), maxLength: 50 },
        gl_account_expense_id: { type: ['string', 'null'], ref: 'chart_of_accounts', maxLength: 100 },
        gl_account_liability_id: { type: ['string', 'null'], ref: 'chart_of_accounts', maxLength: 100 },
        created_at: { type: 'string', format: 'date-time', maxLength: 50 },
        updated_at: { type: 'string', format: 'date-time', maxLength: 50 },
    },
    { key: 'id', type: 'string' },
    ['id', 'name', 'category', 'tax_implication', 'created_at', 'updated_at'],
    ['name', 'category']
);

export const staffRecurringItemProperties: RxJsonSchema<types.HRStaffRecurringItemType>['properties'] = {
    id: { type: 'string', maxLength: 100, final: true },
    staff_salary_setting_id: { type: 'string', maxLength: 100 }, // No ref, nested
    item_type_id: { type: 'string', ref: 'payroll_item_types', maxLength: 100 },
    amount: { type: 'number', multipleOf: 0.01, minimum: 0, maximum: 999999.99 },
    created_at: { type: ['string', 'null'], format: 'date-time', maxLength: 50 },
    item_type_name: { type: ['string', 'null'], maxLength: 100 },
    item_category: { type: ['string', 'null'], enum: [...Object.values(types.HRPayrollItemCategoryEnum), null] as any[] },
};

export const staffSalarySettingsSchema: RxJsonSchema<types.HRStaffSalarySettingType> = createEntitySchema<types.HRStaffSalarySettingType>(
    'staff_salary_setting',
    {
        id: { type: 'string', maxLength: 100, final: true },
        staff_id: { type: 'string', ref: 'staff', final: true, maxLength: 100 }, // staff_id should be unique for settings
        basic_salary: { type: 'number', multipleOf: 0.01, minimum: 0, maximum: 999999.99 },
        payment_bank: { type: ['string', 'null'], maxLength: 100 },
        bank_account_no: { type: ['string', 'null'], maxLength: 50 },
        max_advance_amount: { type: ['number', 'null'], multipleOf: 0.01, minimum: 0, maximum: 999999.99 },
        created_at: { type: 'string', format: 'date-time', maxLength: 50 },
        updated_at: { type: 'string', format: 'date-time', maxLength: 50 },
        recurring_items: { type: ['array', 'null'], default: [], items: { type: 'object', properties: staffRecurringItemProperties } },
        staff_name: { type: ['string', 'null'], maxLength: 200 },
    },
    { key: 'id', type: 'string' }, 
    ['id', 'staff_id', 'basic_salary', 'created_at', 'updated_at'],
    ['staff_id'] 
);

export const payslipItemProperties: RxJsonSchema<types.HRPayslipItemType>['properties'] = {
    id: { type: 'string', maxLength: 100, final: true },
    payslip_id: { type: 'string', maxLength: 100 }, // No ref, nested
    item_type_id: { type: 'string', ref: 'payroll_item_types', maxLength: 100 },
    description: { type: ['string', 'null'], maxLength: 500 },
    amount: { type: ['number', 'null'], multipleOf: 0.01, minimum: 0, maximum: 999999.99 },
    item_type_name: { type: ['string', 'null'], maxLength: 100 },
    item_category: { type: ['string', 'null'], enum: [...Object.values(types.HRPayrollItemCategoryEnum), null] as any[] },
};

export const payslipsSchema: RxJsonSchema<types.HRPayslipType> = createEntitySchema<types.HRPayslipType>(
    'payslip',
    {
        id: { type: 'string', maxLength: 100, final: true },
        staff_id: { type: 'string', ref: 'staff', maxLength: 100 },
        payroll_period_id: { type: 'string', ref: 'payroll_periods' },
        gross_salary: { type: ['number', 'null'], multipleOf: 0.01, minimum: 0, maximum: 999999.99 },
        total_deductions: { type: ['number', 'null'], multipleOf: 0.01, minimum: 0, maximum: 999999.99 },
        net_salary: { type: ['number', 'null'], multipleOf: 0.01, minimum: -999999.99, maximum: 999999.99 },
        status: { type: 'string', enum: Object.values(types.HRPayslipStatusEnum), maxLength: 50 },
        processed_at: { type: ['string', 'null'], format: 'date-time' },
        paid_at: { type: ['string', 'null'], format: 'date-time' },
        created_at: { type: 'string', format: 'date-time', maxLength: 50 },
        updated_at: { type: 'string', format: 'date-time', maxLength: 50 },
        items: { type: ['array', 'null'], default: [], items: { type: 'object', properties: payslipItemProperties } },
        staff_name: { type: ['string', 'null'], maxLength: 200 },
        payroll_period_name: { type: ['string', 'null'], maxLength: 100 },
    },
    { key: 'id', type: 'string' },
    ['id', 'staff_id', 'payroll_period_id', 'status', 'created_at', 'updated_at'],
    ['staff_id', 'payroll_period_id', 'status']
);
