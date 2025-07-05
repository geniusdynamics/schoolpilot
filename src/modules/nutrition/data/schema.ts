// ABOUTME: Defines RxDB JSON schemas for entities specific to the Nutrition & Wallet module.
// ABOUTME: These schemas are used by rxdbService.ts to create collections.

import { RxJsonSchema } from 'rxdb';
import * as types from './types';
import { createEntitySchema } from '../../../utils/schemaUtils';

export const mealPlanSchema: RxJsonSchema<types.MealPlan> = createEntitySchema<types.MealPlan>(
    'meal_plan',
    {
        id: { type: 'number' },
        name: { type: 'string', maxLength: 150 },
        description: { type: ['string', 'null'] },
        cost_per_period: { type: ['number', 'null'] },
        created_at: { type: 'string', format: 'date-time' },
        updated_at: { type: 'string', format: 'date-time' },
    },
    { key: 'id', type: 'number' },
    ['id', 'name', 'created_at', 'updated_at'],
    ['name']
);

export const studentMealPlanSchema: RxJsonSchema<types.StudentMealPlan> = createEntitySchema<types.StudentMealPlan>(
    'student_meal_plan',
    {
        id: { type: 'string', maxLength: 100, final: true },
        student_id: { type: 'string', ref: 'students' },
        school_period_id: { type: 'number', ref: 'school_periods' },
        meal_plan_id: { type: 'number', ref: 'meal_plans' },
        status: { type: 'string', enum: Object.values(types.NutrStudentMealPlanStatusEnum) },
        start_date: { type: ['string', 'null'], format: 'date' },
        end_date: { type: ['string', 'null'], format: 'date' },
        student_name: { type: ['string', 'null'] },
        school_period_name: { type: ['string', 'null'] },
        meal_plan_name: { type: ['string', 'null'] },
        created_at: { type: 'string', format: 'date-time' },
        updated_at: { type: 'string', format: 'date-time' },
    },
    { key: 'id', type: 'string' },
    ['id', 'student_id', 'school_period_id', 'meal_plan_id', 'status', 'created_at', 'updated_at'],
    ['student_id', 'school_period_id', 'meal_plan_id']
);

export const menuSchema: RxJsonSchema<types.Menu> = createEntitySchema<types.Menu>(
    'menu',
    {
        id: { type: 'string', maxLength: 100, final: true },
        menu_date: { type: 'string', format: 'date' },
        meal_type: { type: 'string', enum: Object.values(types.NutrMealTypeEnum) },
        description: { type: 'string', maxLength: 500 },
        created_at: { type: 'string', format: 'date-time' },
        updated_at: { type: 'string', format: 'date-time' },
    },
    { key: 'id', type: 'string' },
    ['id', 'menu_date', 'meal_type', 'description', 'created_at', 'updated_at'],
    ['menu_date', 'meal_type']
);

export const mealConsumptionLogSchema: RxJsonSchema<types.MealConsumptionLog> = createEntitySchema<types.MealConsumptionLog>(
    'meal_consumption_log',
    {
        id: { type: 'string', maxLength: 100, final: true },
        student_id: { type: 'string', ref: 'students' },
        menu_id: { type: 'string', ref: 'menus' },
        consumption_time: { type: 'string', format: 'date-time' },
        charged_amount: { type: ['number', 'null'] },
        wallet_transaction_id: { type: ['string', 'null'], ref: 'wallet_transactions' },
        student_name: { type: ['string', 'null'] },
        menu_description: { type: ['string', 'null'] },
        menu_meal_type: { type: ['string', 'null'], enum: [...Object.values(types.NutrMealTypeEnum), null] as any[] },
        menu_date: { type: ['string', 'null'], format: 'date' },
    },
    { key: 'id', type: 'string' },
    ['id', 'student_id', 'menu_id', 'consumption_time'],
    ['student_id', 'consumption_time']
);

export const merchantSchema: RxJsonSchema<types.Merchant> = createEntitySchema<types.Merchant>(
    'merchant',
    {
        id: { type: 'number' },
        name: { type: 'string', maxLength: 150 },
        gl_account_id: { type: ['number', 'null'], ref: 'chart_of_accounts' },
        gl_account_name: { type: ['string', 'null'] },
        created_at: { type: 'string', format: 'date-time' },
        updated_at: { type: 'string', format: 'date-time' },
    },
    { key: 'id', type: 'number' },
    ['id', 'name', 'created_at', 'updated_at'],
    ['name']
);

export const studentWalletSchema: RxJsonSchema<types.StudentWallet> = createEntitySchema<types.StudentWallet>(
    'student_wallet',
    {
        student_id: { type: 'string', ref: 'students', final: true, maxLength: 100 },
        balance: { type: 'number' },
        last_updated: { type: 'string', format: 'date-time' },
        student_name: { type: ['string', 'null'] },
    },
    { key: 'student_id', type: 'string' },
    ['student_id', 'balance', 'last_updated'],
    [] // student_id is PK, usually enough for direct lookups
);

export const walletTransactionSchema: RxJsonSchema<types.WalletTransaction> = createEntitySchema<types.WalletTransaction>(
    'wallet_transaction',
    {
        id: { type: 'string', maxLength: 100, final: true },
        student_id: { type: 'string', ref: 'students' },
        transaction_date: { type: 'string', format: 'date-time' },
        transaction_type: { type: 'string', enum: Object.values(types.NutrWalletTransactionType) },
        amount: { type: 'number' }, // Can be positive (deposit/credit_adj) or negative (purchase/debit_adj)
        description: { type: 'string', maxLength: 255 },
        reference_id: { type: ['string', 'null'] },
        reference_type: { type: ['string', 'null'] },
        running_balance: { type: 'number' },
        student_name: { type: ['string', 'null'] },
    },
    { key: 'id', type: 'string' },
    ['id', 'student_id', 'transaction_date', 'transaction_type', 'amount', 'description', 'running_balance'],
    ['student_id', 'transaction_date']
);
