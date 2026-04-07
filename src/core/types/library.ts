// src/core/types/library.ts
// ABOUTME: Library, Nutrition, and Wallet types used across SchoolPilot modules.

import type {
  BookStatus,
  FineStatus,
  StudentMealPlanStatus,
  MealType,
  WalletTransactionType,
} from './enums';

// --- Library Interfaces ---

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
    // Denormalized
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
    // Denormalized
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
    // Denormalized
    book_title?: string | null;
    user_name?: string | null;
    loan_due_date?: string | null;
}

// --- Nutrition & Wallet Interfaces ---

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
