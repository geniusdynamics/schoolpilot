// ABOUTME: Library domain hook — Books, BookCategories, Loans, Fines

import { useState, useCallback } from 'react';
import type { AppDataContextType } from '../../types';
import { databaseService } from '../../services/database/databaseService';
import * as allTypes from '../../types';

type RawInitialData = AppDataContextType['rawInitialData'];

export function useLibraryData(_mockDataForSeeding: RawInitialData) {
  const [libraryData] = useState<{
    bookCategories: any[];
    books: any[];
    loans: allTypes.Loan[];
    fines: allTypes.Fine[];
  }>({
    bookCategories: [],
    books: [],
    loans: [],
    fines: [],
  });

  // ── Book Categories ───────────────────────────────────────────────────────────
  const addBookCategory = useCallback(async (data: any) => {
    try {
      const db = await databaseService.getDatabase();
      const d = { ...data, id: databaseService.generateId() };
      const result = await db.book_categories?.insert(d);
      return result?.doc || null;
    } catch (error) { console.error('Error adding book category:', error); throw error; }
  }, []);

  const updateBookCategory = useCallback(async (id: string, data: any) => {
    try {
      const db = await databaseService.getDatabase();
      const result = await db.book_categories?.update(id, data);
      return result?.doc || null;
    } catch (error) { console.error('Error updating book category:', error); throw error; }
  }, []);

  const deleteBookCategory = useCallback(async (id: string) => {
    try {
      const db = await databaseService.getDatabase();
      await db.book_categories?.remove(id);
      return true;
    } catch (error) { console.error('Error deleting book category:', error); throw error; }
  }, []);

  // ── Books ─────────────────────────────────────────────────────────────────────
  const addBook = useCallback(async (data: any) => {
    try {
      const db = await databaseService.getDatabase();
      const d = { ...data, id: databaseService.generateId() };
      const result = await db.books?.insert(d);
      return result?.doc || null;
    } catch (error) { console.error('Error adding book:', error); throw error; }
  }, []);

  const updateBook = useCallback(async (id: string, data: any) => {
    try {
      const db = await databaseService.getDatabase();
      const result = await db.books?.update(id, data);
      return result?.doc || null;
    } catch (error) { console.error('Error updating book:', error); throw error; }
  }, []);

  const deleteBook = useCallback(async (id: string) => {
    try {
      const db = await databaseService.getDatabase();
      await db.books?.remove(id);
      return true;
    } catch (error) { console.error('Error deleting book:', error); throw error; }
  }, []);

  // ── Loans ─────────────────────────────────────────────────────────────────────
  const addLoan = useCallback(async (loanData: Omit<allTypes.Loan, 'id'>) => {
    try {
      const db = await databaseService.getDatabase();
      const loanWithId = { ...loanData, id: databaseService.generateId() };
      const result = await db.loans?.insert(loanWithId);
      return result?.doc || null;
    } catch (error) { console.error('Error adding loan:', error); throw error; }
  }, []);

  const updateLoan = useCallback(async (loanId: string, loanData: Partial<allTypes.Loan>) => {
    try {
      const db = await databaseService.getDatabase();
      const result = await db.loans?.update(loanId, loanData);
      return result?.doc || null;
    } catch (error) { console.error('Error updating loan:', error); throw error; }
  }, []);

  // ── Fines ─────────────────────────────────────────────────────────────────────
  const addFine = useCallback(async (fineData: Omit<allTypes.Fine, 'id'>) => {
    try {
      const db = await databaseService.getDatabase();
      const fineWithId = { ...fineData, id: databaseService.generateId() };
      const result = await db.fines?.insert(fineWithId);
      return result?.doc || null;
    } catch (error) { console.error('Error adding fine:', error); throw error; }
  }, []);

  const updateFineStatus = useCallback(async (fineId: string, status: string) => {
    try {
      const db = await databaseService.getDatabase();
      const result = await db.fines?.update(fineId, { status });
      return result?.doc || null;
    } catch (error) { console.error('Error updating fine status:', error); throw error; }
  }, []);

  return {
    // Data
    bookCategories: libraryData.bookCategories,
    books: libraryData.books,
    loans: libraryData.loans,
    fines: libraryData.fines,

    // CRUD
    addBookCategory, updateBookCategory, deleteBookCategory,
    addBook, updateBook, deleteBook,
    addLoan, updateLoan,
    addFine, updateFineStatus,
  };
}
