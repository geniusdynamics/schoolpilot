// ABOUTME: This file defines TypeScript interfaces, enums, and type aliases for the Library module.
// ABOUTME: It ensures all library-related data structures are managed in one place.
import { UserType } from "../../../types";

export enum LibBookStatusEnum {
    AVAILABLE = 'Available',
    ON_LOAN = 'On Loan',
    RESERVED = 'Reserved',
    LOST = 'Lost',
    DAMAGED = 'Damaged',
    ARCHIVED = 'Archived'
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
  created_at: string;
  updated_at: string;
  deleted_at?: string;
  category_name?: string;
}

export interface LibLoanType {
  id: string;
  book_id: string;
  user_id: string;
  user_type: UserType;
  loan_date: string;
  due_date: string;
  return_date?: string;
  extended_due_date?: string;
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
