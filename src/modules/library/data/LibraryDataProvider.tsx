// ABOUTME: Library Data Provider
import React, { createContext, useContext, ReactNode, useCallback, useState } from 'react';
import { databaseService } from '@/services/database/databaseService';
import { useToast } from '@/hooks/useToast';
import * as types from './types';

interface LibraryDataContextType {
  books: types.Book[];
  bookLoans: types.BookLoan[];
  libraryMembers: types.LibraryMember[];
  loading: boolean;
  addBook: (data: Omit<types.Book, 'id' | 'created_at' | 'updated_at'>) => Promise<types.Book>;
  updateBook: (id: string, data: Partial<types.Book>) => Promise<types.Book>;
  deleteBook: (id: string) => Promise<void>;
  addBookLoan: (data: Omit<types.BookLoan, 'id' | 'created_at' | 'updated_at'>) => Promise<types.BookLoan>;
  updateBookLoan: (id: string, data: Partial<types.BookLoan>) => Promise<types.BookLoan>;
  deleteBookLoan: (id: string) => Promise<void>;
  returnBook: (id: string) => Promise<types.BookLoan>;
}

const LibraryDataContext = createContext<LibraryDataContextType | undefined>(undefined);

export const useLibraryDataContext = () => {
  const context = useContext(LibraryDataContext);
  if (!context) throw new Error('useLibraryDataContext must be used within LibraryDataProvider');
  return context;
};

interface Props {
  children: ReactNode;
  books: types.Book[];
  bookLoans: types.BookLoan[];
  libraryMembers: types.LibraryMember[];
  loading: boolean;
}

export const LibraryDataProvider: React.FC<Props> = ({
  children, books, bookLoans, libraryMembers, loading: parentLoading
}) => {
  const toast = useToast();
  const [localLoading, setLocalLoading] = useState(false);
  const loading = parentLoading || localLoading;

  const withToast = async <T,>(fn: () => Promise<T>, successMsg: string): Promise<T> => {
    setLocalLoading(true);
    try {
      const result = await fn();
      toast.showSuccess(successMsg);
      return result;
    } catch (error) {
      toast.showError(`Failed: ${error}`);
      throw error;
    } finally {
      setLocalLoading(false);
    }
  };

  const withConfirm = async <T,>(fn: () => Promise<T>, confirmMsg: string): Promise<T | void> => {
    if (!window.confirm(confirmMsg)) return;
    return fn();
  };

  const addBook = useCallback((data) =>
    withToast(async () => {
      const db = await databaseService.getDatabase();
      const newItem: types.Book = { ...data, id: crypto.randomUUID(), created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
      await db.books?.insert(newItem);
      return newItem;
    }, 'Book created'), [toast]);

  const updateBook = useCallback((id, data) =>
    withToast(async () => {
      const db = await databaseService.getDatabase();
      const updates = { ...data, updated_at: new Date().toISOString() };
      await db.books?.update(id, updates);
      return { ...books.find(b => b.id === id), ...updates } as types.Book;
    }, 'Book updated'), [books, toast]);

  const deleteBook = useCallback((id) =>
    withConfirm(() =>
      withToast(async () => { const db = await databaseService.getDatabase(); await db.books?.remove(id); }, 'Book deleted'),
      'Delete this book?'), [toast]);

  const addBookLoan = useCallback((data) =>
    withToast(async () => {
      const db = await databaseService.getDatabase();
      const newItem: types.BookLoan = { ...data, id: crypto.randomUUID(), created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
      await db.book_loans?.insert(newItem);
      return newItem;
    }, 'Book loan created'), [toast]);

  const updateBookLoan = useCallback((id, data) =>
    withToast(async () => {
      const db = await databaseService.getDatabase();
      const updates = { ...data, updated_at: new Date().toISOString() };
      await db.book_loans?.update(id, updates);
      return { ...bookLoans.find(l => l.id === id), ...updates } as types.BookLoan;
    }, 'Book loan updated'), [bookLoans, toast]);

  const deleteBookLoan = useCallback((id) =>
    withConfirm(() =>
      withToast(async () => { const db = await databaseService.getDatabase(); await db.book_loans?.remove(id); }, 'Book loan deleted'),
      'Delete this loan?'), [toast]);

  const returnBook = useCallback((id) =>
    withToast(async () => {
      const db = await databaseService.getDatabase();
      const updates = { returned_at: new Date().toISOString(), status: 'Returned' as types.LoanStatus, updated_at: new Date().toISOString() };
      await db.book_loans?.update(id, updates);
      return { ...bookLoans.find(l => l.id === id), ...updates } as types.BookLoan;
    }, 'Book returned'), [bookLoans, toast]);

  return (
    <LibraryDataContext.Provider value={{
      books, bookLoans, libraryMembers, loading,
      addBook, updateBook, deleteBook,
      addBookLoan, updateBookLoan, deleteBookLoan, returnBook,
    }}>
      {children}
    </LibraryDataContext.Provider>
  );
};

export default LibraryDataProvider;
