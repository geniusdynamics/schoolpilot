// ABOUTME: Defines RxDB JSON schemas for entities specific to the Nutrition & Wallet module.
// ABOUTME: These schemas are used by rxdbService.ts to create collections.

import { RxJsonSchema } from 'rxdb';
import * as types from './types';
import { createEntitySchema } from '../../../utils/schemaUtils';

export const mealPlanSchema: RxJsonSchema<types.MealPlan> = createEntitySchema<types.MealPlan>(
    'meal_plan',
    {
        id: { type: 'string', final: true },
        name: { type: 'string', maxLength: 150 },
        description: { type: ['string', 'null'], maxLength: 500 },
        cost_per_period: { type: ['number', 'null'] },
        created_at: { type: 'string', format: 'date-time', maxLength: 50 },
        updated_at: { type: 'string', format: 'date-time', maxLength: 50 },
    },
    { key: 'id', type: 'string' },
    ['id', 'name', 'created_at', 'updated_at'],
    ['name']
);

export const studentMealPlanSchema: RxJsonSchema<types.StudentMealPlan> = createEntitySchema<types.StudentMealPlan>(
    'student_meal_plan',
    {
        id: { type: 'string', maxLength: 100, final: true },
        student_id: { type: 'string', ref: 'students', maxLength: 100 },
        school_period_id: { type: 'string', ref: 'school_periods' },
        meal_plan_id: { type: 'string', ref: 'meal_plans' },
        status: { type: 'string', enum: Object.values(types.NutrStudentMealPlanStatusEnum), maxLength: 50 },
        start_date: { type: ['string', 'null'], format: 'date', maxLength: 20 },
        end_date: { type: ['string', 'null'], format: 'date', maxLength: 20 },
        student_name: { type: ['string', 'null'], maxLength: 200 },
        school_period_name: { type: ['string', 'null'], maxLength: 100 },
        meal_plan_name: { type: ['string', 'null'], maxLength: 150 },
        created_at: { type: 'string', format: 'date-time', maxLength: 50 },
        updated_at: { type: 'string', format: 'date-time', maxLength: 50 },
    },
    { key: 'id', type: 'string' },
    ['id', 'student_id', 'school_period_id', 'meal_plan_id', 'status', 'created_at', 'updated_at'],
    ['student_id', 'school_period_id', 'meal_plan_id']
);

export const menuSchema: RxJsonSchema<types.Menu> = createEntitySchema<types.Menu>(
    'menu',
    {
        id: { type: 'string', maxLength: 100, final: true },
        menu_date: { type: 'string', format: 'date', maxLength: 20 },
        meal_type: { type: 'string', enum: Object.values(types.NutrMealTypeEnum), maxLength: 50 },
        description: { type: 'string', maxLength: 500 },
        created_at: { type: 'string', format: 'date-time', maxLength: 50 },
        updated_at: { type: 'string', format: 'date-time', maxLength: 50 },
    },
    { key: 'id', type: 'string' },
    ['id', 'menu_date', 'meal_type', 'description', 'created_at', 'updated_at'],
    ['menu_date', 'meal_type']
);

export const mealConsumptionLogSchema: RxJsonSchema<types.MealConsumptionLog> = createEntitySchema<types.MealConsumptionLog>(
    'meal_consumption_log',
    {
        id: { type: 'string', maxLength: 100, final: true },
        student_id: { type: 'string', ref: 'students', maxLength: 100 },
        menu_id: { type: 'string', ref: 'menus', maxLength: 100 },
        consumption_time: { type: 'string', format: 'date-time', maxLength: 50 },
        charged_amount: { type: ['number', 'null'] },
        wallet_transaction_id: { type: ['string', 'null'], ref: 'wallet_transactions', maxLength: 100 },
        student_name: { type: ['string', 'null'], maxLength: 200 },
        menu_description: { type: ['string', 'null'], maxLength: 500 },
        menu_meal_type: { type: ['string', 'null'] },
        menu_date: { type: ['string', 'null'], format: 'date', maxLength: 20 },
    },
    { key: 'id', type: 'string' },
    ['id', 'student_id', 'menu_id', 'consumption_time'],
    ['student_id', 'consumption_time']
);

export const merchantSchema: RxJsonSchema<types.Merchant> = createEntitySchema<types.Merchant>(
    'merchant',
    {
        id: { type: 'string', final: true },
        name: { type: 'string', maxLength: 150 },
        gl_account_id: { type: ['string', 'null'], ref: 'chart_of_accounts' },
        gl_account_name: { type: ['string', 'null'], maxLength: 200 },
        created_at: { type: 'string', format: 'date-time', maxLength: 50 },
        updated_at: { type: 'string', format: 'date-time', maxLength: 50 },
    },
    { key: 'id', type: 'string' },
    ['id', 'name', 'created_at', 'updated_at'],
    ['name']
);

export const studentWalletSchema: RxJsonSchema<types.StudentWallet> = createEntitySchema<types.StudentWallet>(
    'student_wallet',
    {
        student_id: { type: 'string', ref: 'students', final: true, maxLength: 100 },
        balance: { type: 'number' },
        last_updated: { type: 'string', format: 'date-time', maxLength: 50 },
        student_name: { type: ['string', 'null'], maxLength: 200 },
    },
    { key: 'student_id', type: 'string' },
    ['student_id', 'balance', 'last_updated'],
    [] // student_id is PK, usually enough for direct lookups
);

export const walletTransactionSchema: RxJsonSchema<types.WalletTransaction> = createEntitySchema<types.WalletTransaction>(
    'wallet_transaction',
    {
        id: { type: 'string', maxLength: 100, final: true },
        student_id: { type: 'string', ref: 'students', maxLength: 100 },
        transaction_date: { type: 'string', format: 'date-time', maxLength: 50 },
        transaction_type: { type: 'string', enum: Object.values(types.NutrWalletTransactionType), maxLength: 50 },
        amount: { type: 'number' }, // Can be positive (deposit/credit_adj) or negative (purchase/debit_adj)
        description: { type: 'string', maxLength: 255 },
        reference_id: { type: ['string', 'null'], maxLength: 100 },
        reference_type: { type: ['string', 'null'], maxLength: 50 },
        running_balance: { type: 'number' },
        student_name: { type: ['string', 'null'], maxLength: 200 },
    },
    { key: 'id', type: 'string' },
    ['id', 'student_id', 'transaction_date', 'transaction_type', 'amount', 'description', 'running_balance'],
    ['student_id', 'transaction_date']
);
