// ABOUTME: This file defines TypeScript interfaces, enums, and type aliases for the Library module.
// ABOUTME: It ensures all library-related data structures are managed in one place.

import { Loan, Book, BookCategory, Fine } from '../../core/types';

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

// Note: BookCategory and Book interfaces are now imported from core/types to avoid conflicts

// Note: Loan interface is now imported from core/types to avoid conflicts

// Note: Fine interface is now imported from core/types to avoid conflicts

export interface LibrarySettingsType {
  id: string;
  name: string;
  description?: string;
  max_loan_days: number;
  max_renewals: number;
  fine_per_day: number;
  max_books_per_user: number;
  book_categories: string[]; // Categories this rule applies to
  user_types: string[]; // User types this rule applies to (Staff, Student, etc.)
  is_active: boolean;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}
