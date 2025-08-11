// ABOUTME: This file defines TypeScript interfaces, enums, and type aliases for the Library module.
// ABOUTME: It ensures all library-related data structures are managed in one place.

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

// MOVED FROM core/types.ts (module-specific):
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
  status: LibBookStatusEnum;
  location_shelf?: string | null;
  is_digital?: boolean;
  digital_access_url?: string | null;
  digital_format?: string | null;
  availability_status?: LibBookAvailabilityStatusEnum;
  damaged_status?: boolean;
  lost_status?: boolean;
  branch_id?: string | null;
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
  extended_due_date?: string | null;
  userType: string;
  branch_id?: string | null;
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
  status: LibFineStatusEnum;
  reason?: string | null;
  fee_adjustment_id?: string | null;
  created_at: string;
  updated_at: string;
  // Denormalized
  book_title?: string | null;
  user_name?: string | null;
  loan_due_date?: string | null;
}

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
