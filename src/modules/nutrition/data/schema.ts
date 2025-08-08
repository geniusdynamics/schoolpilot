// ABOUTME: Defines database-agnostic schemas for entities specific to the Nutrition & Wallet module.
// ABOUTME: These schemas are used by the database service to create collections.

import * as types from './types';
import { createDatabaseSchema, DatabaseSchema, SchemaHelpers } from '../../../utils/databaseAgnosticSchema';

export const mealPlanSchema: DatabaseSchema = createDatabaseSchema({
    title: 'meal_plan',
    version: 0,
    primaryKey: 'id',
    type: 'object',
    properties: {
        id: SchemaHelpers.id({ description: 'Unique identifier for the meal plan' }),
        name: SchemaHelpers.string({ description: 'Meal plan name', maxLength: 150 }),
        description: SchemaHelpers.string({ description: 'Meal plan description', maxLength: 500 }),
        cost_per_period: SchemaHelpers.number({ description: 'Cost per period' }),
        created_at: SchemaHelpers.timestamp({ description: 'Record creation timestamp' }),
        updated_at: SchemaHelpers.timestamp({ description: 'Record last update timestamp' }),
    },
    required: ['id', 'name', 'created_at', 'updated_at'],
    indexes: ['name']
});

export const studentMealPlanSchema: DatabaseSchema = createDatabaseSchema({
    title: 'student_meal_plan',
    version: 0,
    primaryKey: 'id',
    type: 'object',
    properties: {
        id: SchemaHelpers.id({ description: 'Unique identifier for the student meal plan' }),
        student_id: SchemaHelpers.ref('students', { description: 'Reference to the student' }),
        school_period_id: SchemaHelpers.ref('school_periods', { description: 'Reference to the school period' }),
        meal_plan_id: SchemaHelpers.ref('meal_plans', { description: 'Reference to the meal plan' }),
        status: SchemaHelpers.string({ description: 'Meal plan status', enum: Object.values(types.NutrStudentMealPlanStatusEnum), maxLength: 50 }),
        start_date: SchemaHelpers.date({ description: 'Start date of the meal plan' }),
        end_date: SchemaHelpers.date({ description: 'End date of the meal plan' }),
        student_name: SchemaHelpers.string({ description: 'Student name (denormalized)', maxLength: 200 }),
        school_period_name: SchemaHelpers.string({ description: 'School period name (denormalized)', maxLength: 100 }),
        meal_plan_name: SchemaHelpers.string({ description: 'Meal plan name (denormalized)', maxLength: 150 }),
        created_at: SchemaHelpers.timestamp({ description: 'Record creation timestamp' }),
        updated_at: SchemaHelpers.timestamp({ description: 'Record last update timestamp' }),
    },
    required: ['id', 'student_id', 'school_period_id', 'meal_plan_id', 'status', 'created_at', 'updated_at'],
    indexes: ['student_id', 'school_period_id', 'meal_plan_id']
});

export const menuSchema: DatabaseSchema = createDatabaseSchema({
    title: 'menu',
    version: 0,
    primaryKey: 'id',
    type: 'object',
    properties: {
        id: SchemaHelpers.id({ description: 'Unique identifier for the menu' }),
        menu_date: SchemaHelpers.date({ description: 'Date of the menu' }),
        meal_type: SchemaHelpers.string({ description: 'Type of meal', enum: Object.values(types.NutrMealTypeEnum), maxLength: 50 }),
        description: SchemaHelpers.string({ description: 'Menu description', maxLength: 500 }),
        created_at: SchemaHelpers.timestamp({ description: 'Record creation timestamp' }),
        updated_at: SchemaHelpers.timestamp({ description: 'Record last update timestamp' }),
    },
    required: ['id', 'menu_date', 'meal_type', 'description', 'created_at', 'updated_at'],
    indexes: ['menu_date', 'meal_type']
});

export const mealConsumptionLogSchema: DatabaseSchema = createDatabaseSchema({
    title: 'meal_consumption_log',
    version: 0,
    primaryKey: 'id',
    type: 'object',
    properties: {
        id: SchemaHelpers.id({ description: 'Unique identifier for the meal consumption log' }),
        student_id: SchemaHelpers.ref('students', { description: 'Reference to the student' }),
        menu_id: SchemaHelpers.ref('menus', { description: 'Reference to the menu' }),
        consumption_time: SchemaHelpers.timestamp({ description: 'Time when meal was consumed' }),
        charged_amount: SchemaHelpers.number({ description: 'Amount charged for the meal' }),
        wallet_transaction_id: SchemaHelpers.ref('wallet_transactions', { description: 'Reference to wallet transaction' }),
        student_name: SchemaHelpers.string({ description: 'Student name (denormalized)', maxLength: 200 }),
        menu_description: SchemaHelpers.string({ description: 'Menu description (denormalized)', maxLength: 500 }),
        menu_meal_type: SchemaHelpers.string({ description: 'Menu meal type (denormalized)' }),
        menu_date: SchemaHelpers.date({ description: 'Menu date (denormalized)' }),
    },
    required: ['id', 'student_id', 'menu_id', 'consumption_time'],
    indexes: ['student_id', 'consumption_time']
});

export const merchantSchema: DatabaseSchema = createDatabaseSchema({
    title: 'merchant',
    version: 0,
    primaryKey: 'id',
    type: 'object',
    properties: {
        id: SchemaHelpers.id({ description: 'Unique identifier for the merchant' }),
        name: SchemaHelpers.string({ description: 'Merchant name', maxLength: 150 }),
        gl_account_id: SchemaHelpers.ref('chart_of_accounts', { description: 'Reference to GL account' }),
        gl_account_name: SchemaHelpers.string({ description: 'GL account name (denormalized)', maxLength: 200 }),
        created_at: SchemaHelpers.timestamp({ description: 'Record creation timestamp' }),
        updated_at: SchemaHelpers.timestamp({ description: 'Record last update timestamp' }),
    },
    required: ['id', 'name', 'created_at', 'updated_at'],
    indexes: ['name']
});

export const studentWalletSchema: DatabaseSchema = createDatabaseSchema({
    title: 'student_wallet',
    version: 0,
    primaryKey: 'student_id',
    type: 'object',
    properties: {
        student_id: SchemaHelpers.ref('students', { description: 'Reference to the student (primary key)' }),
        balance: SchemaHelpers.number({ description: 'Current wallet balance' }),
        last_updated: SchemaHelpers.timestamp({ description: 'Last update timestamp' }),
        student_name: SchemaHelpers.string({ description: 'Student name (denormalized)', maxLength: 200 }),
    },
    required: ['student_id', 'balance', 'last_updated'],
    indexes: [] // student_id is PK, usually enough for direct lookups
});

export const walletTransactionSchema: DatabaseSchema = createDatabaseSchema({
    title: 'wallet_transaction',
    version: 0,
    primaryKey: 'id',
    type: 'object',
    properties: {
        id: SchemaHelpers.id({ description: 'Unique identifier for the wallet transaction' }),
        student_id: SchemaHelpers.ref('students', { description: 'Reference to the student' }),
        transaction_date: SchemaHelpers.timestamp({ description: 'Date and time of transaction' }),
        transaction_type: SchemaHelpers.string({ description: 'Type of transaction', enum: Object.values(types.NutrWalletTransactionType), maxLength: 50 }),
        amount: SchemaHelpers.number({ description: 'Transaction amount (positive for deposits, negative for purchases)' }),
        description: SchemaHelpers.string({ description: 'Transaction description', maxLength: 255 }),
        reference_id: SchemaHelpers.string({ description: 'Reference ID for related records', maxLength: 100 }),
        reference_type: SchemaHelpers.string({ description: 'Type of referenced record', maxLength: 50 }),
        running_balance: SchemaHelpers.number({ description: 'Running balance after transaction' }),
        student_name: SchemaHelpers.string({ description: 'Student name (denormalized)', maxLength: 200 }),
    },
    required: ['id', 'student_id', 'transaction_date', 'transaction_type', 'amount', 'description', 'running_balance'],
    indexes: ['student_id', 'transaction_date']
});
