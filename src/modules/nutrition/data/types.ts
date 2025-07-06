// ABOUTME: This file defines TypeScript interfaces, enums, and type aliases for the Nutrition & Wallet module.
// ABOUTME: It ensures all nutrition-related data structures are managed in one place.

export enum NutrStudentMealPlanStatusEnum { ACTIVE = 'Active', INACTIVE = 'Inactive', CANCELLED = 'Cancelled' }
export enum NutrMealTypeEnum { BREAKFAST = 'Breakfast', SNACK_MORNING = 'Morning Snack', LUNCH = 'Lunch', SNACK_EVENING = 'Evening Snack', SUPPER = 'Supper' }
export enum NutrWalletTransactionType { DEPOSIT = 'Deposit', PURCHASE = 'Purchase', MEAL_CHARGE = 'Meal Charge', ADJUSTMENT_DEBIT = 'Adjustment (Debit)', ADJUSTMENT_CREDIT = 'Adjustment (Credit)' }


export interface NutrMealPlanType {
  id: number;
  name: string;
  description?: string;
  cost_per_period?: number;
  created_at: string;
  updated_at: string;
}

export interface NutrStudentMealPlanType {
  id: string;
  student_id: string;
  school_period_id: number;
  meal_plan_id: number;
  status: NutrStudentMealPlanStatusEnum;
  start_date?: string;
  end_date?: string;
  created_at: string;
  updated_at: string;
  student_name?: string;
  school_period_name?: string;
  meal_plan_name?: string;
}

export interface NutrMenuType {
  id: string;
  menu_date: string;
  meal_type: NutrMealTypeEnum;
  description: string;
  created_at: string;
  updated_at: string;
}

export interface NutrMealConsumptionLogType {
  id: string;
  student_id: string;
  menu_id: string;
  consumption_time: string;
  charged_amount?: number;
  wallet_transaction_id?: string;
  student_name?: string;
  menu_description?: string;
  menu_meal_type?: NutrMealTypeEnum;
  menu_date?: string;
}

export interface NutrMerchantType {
  id: number;
  name: string;
  gl_account_id?: number;
  created_at: string;
  updated_at: string;
  gl_account_name?: string;
}

export interface NutrStudentWalletType {
  student_id: string; // PK
  balance: number;
  last_updated: string;
  student_name?: string;
}

export interface NutrWalletTransactionType {
  id: string;
  student_id: string;
  transaction_date: string;
  transaction_type: NutrWalletTransactionType;
  amount: number; // Positive for deposits/credits, negative for purchases/debits
  description: string;
  reference_id?: string;
  reference_type?: string; // e.g., 'MERCHANT_SALE', 'MANUAL_DEPOSIT'
  running_balance: number;
  student_name?: string;
}

export interface MealPlan {
  id: number;
  name: string;
  description?: string | null;
  cost_per_period?: number | null;
  created_at: string;
  updated_at: string;
}

export interface StudentMealPlan {
  id: string;
  student_id: string;
  school_period_id: number;
  meal_plan_id: number;
  status: StudentMealPlanStatus;
  created_at: string;
  updated_at: string;
  // Denormalized
  student_name?: string | null;
  school_period_name?: string | null;
  meal_plan_name?: string | null;
}

export interface Menu {
  id: string;
  menu_date: string;
  meal_type: MealType;
  description: string;
  created_at: string;
  updated_at: string;
}

export interface MealConsumptionLog {
  id: string;
  student_id: string;
  menu_id: string;
  consumption_time: string;
  charged_amount?: number | null;
  wallet_transaction_id?: string | null;
  // Denormalized
  student_name?: string | null;
  menu_description?: string | null;
  menu_meal_type?: MealType | null;
  menu_date?: string | null;
}

export interface WalletTransaction {
  id: string;
  student_id: string;
  transaction_date: string;
  transaction_type: WalletTransactionType;
  amount: number;
  description: string;
  reference_id?: string | null;
  reference_type?: string | null;
  running_balance: number;
  // Denormalized
  student_name?: string | null;
}

export interface StudentWallet {
  student_id: string;
  balance: number;
  last_updated: string;
  // Denormalized
  student_name?: string | null;
}

export interface Merchant {
  id: number;
  name: string;
  gl_account_id?: number | null;
  created_at: string;
  updated_at: string;
  // Denormalized
  gl_account_name?: string | null;
}
