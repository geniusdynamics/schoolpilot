// ABOUTME: Provides initial mock data for entities specific to the Nutrition & Wallet module.
// ABOUTME: This data is used in "demo" mode and for seeding RxDB in "production" mode.

import { NutrStudentMealPlanStatusEnum, NutrMealTypeEnum, NutrWalletTransactionType, NutrMealPlanType, NutrStudentMealPlanType, NutrMenuType, NutrMealConsumptionLogType, NutrMerchantType, NutrStudentWalletType } from './types';
import { generateId, generateNumericId } from '../../../hooks/useMockData'; // Assuming helpers are exported

export const initialMockMealPlans: types.MealPlan[] = [
  { id: 1, name: 'Standard Lunch Plan', description: 'Daily lunch for students', cost_per_period: 7500, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 2, name: 'Full Board Plan (All Meals)', description: 'Breakfast, Lunch, Supper, and Snacks', cost_per_period: 15000, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
];

export const initialMockStudentMealPlans: types.StudentMealPlan[] = [
  { id: generateId(), student_id: 'S001', school_period_id: 1, meal_plan_id: 1, status: types.NutrStudentMealPlanStatusEnum.ACTIVE, start_date: '2023-09-01', student_name: 'Jim Halpert', school_period_name: 'Term 1 - AY 2023/2024', meal_plan_name: 'Standard Lunch Plan', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
];

export const initialMockMenus: types.Menu[] = [
  {id: generateId(), menu_date: new Date().toISOString().split('T')[0], meal_type: types.MealType.LUNCH, description: "Rice, Beans, Cabbage", created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  {id: generateId(), menu_date: new Date().toISOString().split('T')[0], meal_type: types.MealType.BREAKFAST, description: "Tea, Bread, Egg", created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
];

export const initialMockMealConsumptionLogs: types.MealConsumptionLog[] = []; // Typically populated by actions

export const initialMockMerchants: types.Merchant[] = [
  { id: 1, name: 'School Canteen', gl_account_id: 201, gl_account_name: 'Tuition Fees Revenue', created_at: new Date().toISOString(), updated_at: new Date().toISOString() }, // GL account for canteen sales
  { id: 2, name: 'Uniform Shop', gl_account_id: 201, gl_account_name: 'Tuition Fees Revenue', created_at: new Date().toISOString(), updated_at: new Date().toISOString() }, // GL account for uniform sales
];

export const initialMockStudentWallets: types.StudentWallet[] = [
  { student_id: 'S001', balance: 1500.00, last_updated: new Date().toISOString(), student_name: 'Jim Halpert' },
  { student_id: 'S002', balance: 500.00, last_updated: new Date().toISOString(), student_name: 'Michael Scofield' },
];

export const initialMockWalletTransactions: types.WalletTransaction[] = [
  { id: generateId(), student_id: 'S001', transaction_date: new Date(Date.now() - 24*60*60*1000).toISOString(), transaction_type: types.WalletTransactionType.DEPOSIT, amount: 2000, description: 'Pocket money deposit by parent', running_balance: 2000, student_name: 'Jim Halpert' },
  { id: generateId(), student_id: 'S001', transaction_date: new Date().toISOString(), transaction_type: NutrWalletTransactionType.PURCHASE, amount: -500, description: 'Canteen Purchase', reference_id: 'MERCH001', reference_type: 'CANTEEN_SALE', running_balance: 1500, student_name: 'Jim Halpert' },
];
