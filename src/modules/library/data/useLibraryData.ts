// ABOUTME: Library domain hook — Books, BookCategories, Loans, Members, Fines read from the database.
// ABOUTME: The only data API library pages use; every update takes (id, patch) and ids are strings.

import { useCallback, useMemo } from 'react';

import { useDatabaseCollection } from '@/hooks/useDatabaseCollection';
import * as allTypes from '@/types';

/** A book category as stored in the database (string id, unlike the legacy numeric type). */
export interface LibraryBookCategory {
  id: string;
  name: string;
  description?: string | null;
}

export function useLibraryData() {
  const bookCategoriesCollection = useDatabaseCollection<LibraryBookCategory>('book_categories');
  const booksCollection = useDatabaseCollection<any>('books');
  // `loans` is the canonical collection; `book_loans` is only a legacy alias (SO-24).
  const loansCollection = useDatabaseCollection<allTypes.Loan>('loans');
  const libraryMembersCollection = useDatabaseCollection<any>('library_members');
  const finesCollection = useDatabaseCollection<allTypes.Fine>('fines');

  // ── Book Categories ───────────────────────────────────────────────────────────
  const addBookCategory = useCallback(async (data: Omit<LibraryBookCategory, 'id'>) => {
    return bookCategoriesCollection.insert(data);
  }, [bookCategoriesCollection]);

  const updateBookCategory = useCallback(async (id: string, data: Partial<LibraryBookCategory>) => {
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
    return loansCollection.insert(loanData);
  }, [loansCollection]);

  const updateBookLoan = useCallback(async (loanId: string, loanData: Partial<allTypes.Loan>) => {
    return loansCollection.update(loanId, loanData);
  }, [loansCollection]);

  const deleteBookLoan = useCallback(async (loanId: string) => {
    return loansCollection.remove(loanId);
  }, [loansCollection]);

  // The loan schema records a return with `return_date` (it has no status field).
  const returnBook = useCallback(async (loanId: string) => {
    const now = new Date().toISOString();
    return loansCollection.update(loanId, { return_date: now, updated_at: now });
  }, [loansCollection]);

  // ── Fines ─────────────────────────────────────────────────────────────────────
  const addFine = useCallback(async (fineData: Omit<allTypes.Fine, 'id'>) => {
    return finesCollection.insert(fineData);
  }, [finesCollection]);

  const updateFineStatus = useCallback(async (fineId: string, status: allTypes.Fine['status']) => {
    return finesCollection.update(fineId, { status });
  }, [finesCollection]);

  const loading = useMemo(() => ({
    bookCategories: bookCategoriesCollection.loading,
    books: booksCollection.loading,
    loans: loansCollection.loading,
    libraryMembers: libraryMembersCollection.loading,
    fines: finesCollection.loading,
  }), [
    bookCategoriesCollection.loading,
    booksCollection.loading,
    loansCollection.loading,
    libraryMembersCollection.loading,
    finesCollection.loading,
  ]);

  return {
    // Data
    bookCategories: bookCategoriesCollection.data,
    books: booksCollection.data,
    loans: loansCollection.data,
    /** @deprecated alias of `loans`, kept for existing callers */
    bookLoans: loansCollection.data,
    libraryMembers: libraryMembersCollection.data,
    fines: finesCollection.data,
    loading,

    // CRUD
    addBookCategory, updateBookCategory, deleteBookCategory,
    addBook, updateBook, deleteBook,
    addBookLoan, updateBookLoan, deleteBookLoan, returnBook,
    addFine, updateFineStatus,
  };
}
