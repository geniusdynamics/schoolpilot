// ABOUTME: Self-contained hook for book data management
// ABOUTME: Provides CRUD operations for book without depending on AppDataContext

import { useEffect, useState } from 'react';
import { getDatabase } from '../../../services/databaseService';
import { LibBookType } from './types';

export const useBookData = () => {
  const [data, setData] = useState<LibBookType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let subscription: any = null;
    
    const initializeData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const db = await getDatabase();
        subscription = db.collections.books.find().$.subscribe(books => {
          if (books) {
            setData(books);
          }
          setIsLoading(false);
        });
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to initialize database'));
        setIsLoading(false);
      }
    };
    
    initializeData();
    
    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, []);

  const create = async (newItem: Partial<LibBookType>) => {
    try {
      const db = await getDatabase();
      const book = await db.collections.books.insert({
        ...newItem,
        id: newItem.id || Date.now().toString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as LibBookType);
      return book;
    } catch (err) {
      throw err instanceof Error ? err : new Error('Failed to create book');
    }
  };

  const update = async (id: string, updatedData: Partial<LibBookType>) => {
    try {
      const db = await getDatabase();
      const book = await db.collections.books.findOne(id).exec();
      if (book) {
        await book.update({
          $set: {
            ...updatedData,
            updated_at: new Date().toISOString(),
          },
        });
      }
    } catch (err) {
      throw err instanceof Error ? err : new Error('Failed to update book');
    }
  };

  const remove = async (id: string) => {
    try {
      const db = await getDatabase();
      const book = await db.collections.books.findOne(id).exec();
      if (book) {
        await book.remove();
      }
    } catch (err) {
      throw err instanceof Error ? err : new Error('Failed to remove book');
    }
  };

  const search = async (query: string) => {
    if (!query) {
      return data; // Return all data if query is empty
    }
    const lowerCaseQuery = query.toLowerCase();
    return data.filter(book =>
      book.title.toLowerCase().includes(lowerCaseQuery) ||
      book.author?.toLowerCase().includes(lowerCaseQuery) ||
      book.isbn?.toLowerCase().includes(lowerCaseQuery) ||
      book.accession_no.toLowerCase().includes(lowerCaseQuery) ||
      book.status.toLowerCase().includes(lowerCaseQuery) ||
      book.category_name?.toLowerCase().includes(lowerCaseQuery) ||
      book.branch_id?.toLowerCase().includes(lowerCaseQuery) ||
      book.damaged_status.toString().toLowerCase().includes(lowerCaseQuery) ||
      book.lost_status.toString().toLowerCase().includes(lowerCaseQuery)
    );
  };

  // Advanced search helpers for new fields
  const searchByBranchId = async (branchId: string) => {
    return data.filter(book => book.branch_id === branchId);
  };

  const getDamagedBooks = async () => {
    return data.filter(book => book.damaged_status === true);
  };

  const getLostBooks = async () => {
    return data.filter(book => book.lost_status === true);
  };

  const getDigitalBooks = async () => {
    return data.filter(book => book.is_digital === true);
  };

  const getBooksByAvailabilityStatus = async (status: string) => {
    return data.filter(book => book.availability_status === status);
  };

  // Bulk update helpers
  const markAsDamaged = async (id: string) => {
    return update(id, { damaged_status: true });
  };

  const markAsLost = async (id: string) => {
    return update(id, { lost_status: true });
  };

  const updateBranchId = async (id: string, branchId: string) => {
    return update(id, { branch_id: branchId });
  };

  const updateDigitalStatus = async (id: string, isDigital: boolean, digitalUrl?: string, digitalFormat?: string) => {
    return update(id, { 
      is_digital: isDigital,
      digital_access_url: digitalUrl,
      digital_format: digitalFormat
    });
  };

  return {
    data,
    isLoading,
    error,
    create,
    update,
    remove,
    search,
    // New field helpers
    searchByBranchId,
    getDamagedBooks,
    getLostBooks,
    getDigitalBooks,
    getBooksByAvailabilityStatus,
    markAsDamaged,
    markAsLost,
    updateBranchId,
    updateDigitalStatus
  };
};

// Mark this as a global provider for cross-module use
export const isGlobalProvider = true;
