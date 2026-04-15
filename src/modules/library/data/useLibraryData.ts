// ABOUTME: Library domain hook — Books, BookCategories, Loans, Fines
// ABOUTME: Uses real database-backed hooks for persistent data

import { useCallback } from 'react';
import { databaseService } from '@/services/database/databaseService';
import { useDatabaseCollection } from '@/hooks/useDatabaseCollection';
import * as allTypes from '@/types';

export function useLibraryData() {
  const bookCategoriesCollection = useDatabaseCollection<any>('book_categories');
  const booksCollection = useDatabaseCollection<any>('books');
  const bookLoansCollection = useDatabaseCollection<allTypes.Loan>('book_loans');
  const libraryMembersCollection = useDatabaseCollection<any>('library_members');
  const finesCollection = useDatabaseCollection<allTypes.Fine>('fines');

  // ── Book Categories ───────────────────────────────────────────────────────────
  const addBookCategory = useCallback(async (data: any) => {
    return bookCategoriesCollection.insert(data);
  }, [bookCategoriesCollection]);

  const updateBookCategory = useCallback(async (id: string, data: any) => {
    return bookCategoriesCollection.update(id, data);
  }, [bookCategoriesCollection]);

  const deleteBookCategory = useCallback(async (id: string) => {
    return bookCategoriesCollection.remove(id);
  }, [bookCategoriesCollection]);

  // ── Books ─────────────────────────────────────────────────────────────────────
  const addBook = useCallback(async (data: any) => {
    return booksCollection.insert(data);
  }, [booksCollection]);

  const updateBook = useCallback(async (id: string, data: any) => {
    return booksCollection.update(id, data);
  }, [booksCollection]);

  const deleteBook = useCallback(async (id: string) => {
    return booksCollection.remove(id);
  }, [booksCollection]);

  // ── Book Loans ───────────────────────────────────────────────────────────────
  const addBookLoan = useCallback(async (loanData: Omit<allTypes.Loan, 'id'>) => {
    return bookLoansCollection.insert(loanData);
  }, [bookLoansCollection]);

  const updateBookLoan = useCallback(async (loanId: string, loanData: Partial<allTypes.Loan>) => {
    return bookLoansCollection.update(loanId, loanData);
  }, [bookLoansCollection]);

  const deleteBookLoan = useCallback(async (loanId: string) => {
    return bookLoansCollection.remove(loanId);
  }, [bookLoansCollection]);

  const returnBook = useCallback(async (loanId: string) => {
    return bookLoansCollection.update(loanId, {
      returned_at: new Date().toISOString(),
      status: 'Returned',
      updated_at: new Date().toISOString(),
    } as Partial<allTypes.Loan>);
  }, [bookLoansCollection]);

  // ── Fines ─────────────────────────────────────────────────────────────────────
  const addFine = useCallback(async (fineData: Omit<allTypes.Fine, 'id'>) => {
    return finesCollection.insert(fineData);
  }, [finesCollection]);

  const updateFineStatus = useCallback(async (fineId: string, status: string) => {
    return finesCollection.update(fineId, { status });
  }, [finesCollection]);

  return {
    // Data
    bookCategories: bookCategoriesCollection.data,
    books: booksCollection.data,
    bookLoans: bookLoansCollection.data,
    libraryMembers: libraryMembersCollection.data,
    fines: finesCollection.data,

    // CRUD
    addBookCategory, updateBookCategory, deleteBookCategory,
    addBook, updateBook, deleteBook,
    addBookLoan, updateBookLoan, deleteBookLoan, returnBook,
    addFine, updateFineStatus,
  };
}
