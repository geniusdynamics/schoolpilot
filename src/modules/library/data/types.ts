// ABOUTME: Library module types - single source of truth for all library entities
// ABOUTME: Consolidated from core/types/library.ts - includes library, nutrition, and wallet types

// Enums
export enum BookStatus {
  AVAILABLE = 'Available',
  ON_LOAN = 'On Loan',
  RESERVED = 'Reserved',
  LOST = 'Lost',
  DAMAGED = 'Damaged',
  ARCHIVED = 'Archived'
}

export enum FineStatus {
  PENDING = 'Pending',
  BILLED = 'Billed',
  PAID = 'Paid',
  WAIVED = 'Waived'
}

export enum StudentMealPlanStatus {
  ACTIVE = 'Active',
  INACTIVE = 'Inactive',
  SUSPENDED = 'Suspended'
}

export enum MealType {
  BREAKFAST = 'Breakfast',
  LUNCH = 'Lunch',
  DINNER = 'Dinner',
  SNACK = 'Snack'
}

export enum WalletTransactionType {
  CREDIT = 'Credit',
  DEBIT = 'Debit',
  ADJUSTMENT = 'Adjustment'
}

// Library Types
export interface BookCategory {
  id: number;
  name: string;
}

export interface Book {
  id: string;
  category_id?: number | null;
  title: string;
  author?: string | null;
  publisher?: string | null;
  isbn?: string | null;
  accession_no: string;
  purchase_cost?: number | null;
  status: BookStatus;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
  category_name?: string | null;
}

export interface Loan {
  id: string;
  book_id: string;
  user_id: string;
  loan_date: string;
  due_date: string;
  return_date?: string | null;
  created_at: string;
  updated_at: string;
  book_title?: string | null;
  user_name?: string | null;
}

export interface Fine {
  id: string;
  loan_id: string;
  amount: number;
  status: FineStatus;
  reason?: string | null;
  fee_adjustment_id?: string | null;
  created_at: string;
  updated_at: string;
  book_title?: string | null;
  user_name?: string | null;
  loan_due_date?: string | null;
}

// Nutrition & Wallet Types
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
  student_name?: string | null;
}

export interface StudentWallet {
  student_id: string;
  balance: number;
  last_updated: string;
  student_name?: string | null;
}

export interface Merchant {
  id: number;
  name: string;
  gl_account_id?: number | null;
  created_at: string;
  updated_at: string;
  gl_account_name?: string | null;
}

// Backward compatibility types
export enum LibBookStatusEnum {
  AVAILABLE = 'Available',
  ON_LOAN = 'On Loan',
  RESERVED = 'Reserved',
  LOST = 'Lost',
  DAMAGED = 'Damaged',
  ARCHIVED = 'Archived'
}

export enum LibBookAvailabilityStatusEnum {
  AVAILABLE = 'Available',
  ON_LOAN = 'On Loan',
  RESERVED = 'Reserved'
}

export enum LibFineStatusEnum {
  PENDING = 'Pending',
  BILLED = 'Billed',
  PAID = 'Paid',
  WAIVED = 'Waived'
}

export interface LibBookCategoryType {
  id: number;
  name: string;
}

export interface LibBookType {
  id: string;
  category_id?: number;
  title: string;
  author?: string;
  publisher?: string;
  isbn?: string;
  accession_no: string;
  publication_year?: number;
  edition?: string;
  purchase_cost?: number;
  status: LibBookStatusEnum;
  location_shelf?: string;
  is_digital?: boolean;
  digital_access_url?: string;
  digital_format?: string;
  availability_status?: LibBookAvailabilityStatusEnum;
  damaged_status?: boolean;
  lost_status?: boolean;
  branch_id?: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
  category_name?: string;
}

export interface LibLoanType {
  id: string;
  book_id: string;
  user_id: string;
  loan_date: string;
  due_date: string;
  return_date?: string;
  extended_due_date?: string;
  userType: string;
  branch_id?: string;
  created_at: string;
  updated_at: string;
  book_title?: string;
  user_name?: string;
}

export interface LibFineType {
  id: string;
  loan_id: string;
  amount: number;
  status: LibFineStatusEnum;
  reason?: string;
  fee_adjustment_id?: string;
  paid_date?: string;
  payment_reference?: string;
  created_at: string;
  updated_at: string;
  book_title?: string;
  user_name?: string;
  loan_due_date?: string;
}

export interface LibrarySettingsType {
  id: string;
  name: string;
  description?: string;
  max_loan_days: number;
  max_renewals: number;
  fine_per_day: number;
  max_books_per_user: number;
  book_categories: string[];
  user_types: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}
