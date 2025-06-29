// ABOUTME: Provides initial mock data for entities specific to the Nutrition & Wallet module.
// ABOUTME: This data is used in "demo" mode and for seeding RxDB in "production" mode.

import {
    MealPlan,
    StudentMealPlan,
    Menu,
    MealConsumptionLog,
    Merchant,
    StudentWallet,
    WalletTransaction,
    StudentMealPlanStatus,
    MealType,
    WalletTransactionType
} from '../../../core/types';

export const initialMockMealPlans: MealPlan[] = [
  { id: 1, name: 'Standard Lunch Plan', description: 'Daily lunch for students', cost_per_period: 7500, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 2, name: 'Full Board Plan (All Meals)', description: 'Breakfast, Lunch, Supper, and Snacks', cost_per_period: 15000, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 3, name: 'Pay-as-you-eat Wallet', description: 'Students use wallet balance to pay for meals', cost_per_period: 0, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
];

export const initialMockStudentMealPlans: StudentMealPlan[] = [
  { id: 'SMP001', student_id: 'STU001', school_period_id: 3, meal_plan_id: 2, status: StudentMealPlanStatus.ACTIVE, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), student_name: 'Kevin Malone', school_period_name: 'Term 3 - AY 2023/2024', meal_plan_name: 'Full Board Plan (All Meals)' },
  { id: 'SMP002', student_id: 'STU002', school_period_id: 3, meal_plan_id: 1, status: StudentMealPlanStatus.ACTIVE, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), student_name: 'Angela Martin', school_period_name: 'Term 3 - AY 2023/2024', meal_plan_name: 'Standard Lunch Plan' },
];

export const initialMockMenus: Menu[] = [
  {id: 'MENU001', menu_date: '2024-07-29', meal_type: MealType.LUNCH, description: "Rice, Beans, Cabbage", created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  {id: 'MENU002', menu_date: '2024-07-29', meal_type: MealType.BREAKFAST, description: "Tea, Bread, Egg", created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  {id: 'MENU003', menu_date: '2024-07-30', meal_type: MealType.LUNCH, description: "Ugali, Sukuma Wiki, Beef", created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
];

export const initialMockMealConsumptionLogs: MealConsumptionLog[] = [
    { id: 'MCL001', student_id: 'STU001', menu_id: 'MENU001', consumption_time: '2024-07-29T13:05:00Z', student_name: 'Kevin Malone', menu_description: 'Rice, Beans, Cabbage' }
];

export const initialMockMerchants: Merchant[] = [
  { id: 1, name: 'School Canteen', gl_account_id: 102, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), gl_account_name: 'Canteen Revenue' },
  { id: 2, name: 'Uniform Shop', gl_account_id: 103, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), gl_account_name: 'Uniform Revenue' },
];

export const initialMockStudentWallets: StudentWallet[] = [
  { student_id: 'STU003', balance: 1500.00, last_updated: new Date().toISOString(), student_name: 'Jim Halpert' },
  { student_id: 'STU004', balance: 500.00, last_updated: new Date().toISOString(), student_name: 'Pam Beesly' },
];

export const initialMockWalletTransactions: WalletTransaction[] = [
  { id: 'WTX001', student_id: 'STU003', transaction_date: '2024-07-28T10:00:00Z', transaction_type: WalletTransactionType.DEPOSIT, amount: 2000, description: 'Pocket money deposit by parent', running_balance: 2000, student_name: 'Jim Halpert' },
  { id: 'WTX002', student_id: 'STU003', transaction_date: '2024-07-29T13:10:00Z', transaction_type: WalletTransactionType.PURCHASE, amount: -500, description: 'Canteen Purchase - Snacks', reference_id: '1', reference_type: 'Merchant', running_balance: 1500, student_name: 'Jim Halpert' },
];
