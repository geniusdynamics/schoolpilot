// ABOUTME: Self-contained hook for fine data management
// ABOUTME: Provides CRUD operations for fine without depending on AppDataContext

import { useState, useEffect } from 'react';
import { getDatabase } from '../../../services/databaseService';
import { LibFineType } from './types';

const useFineData = () => {
  const [data, setData] = useState<LibFineType[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let subscription: any = null;
    
    const initializeData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const db = await getDatabase();
        subscription = db.collections.fines.find().$.subscribe(fines => {
          if (fines) {
            setData(fines);
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

  const create = async (newItem: Partial<LibFineType>) => {
    try {
      const db = await getDatabase();
      const fine = await db.collections.fines.insert({
        ...newItem,
        id: newItem.id || Date.now().toString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as LibFineType);
      return fine;
    } catch (err) {
      throw err instanceof Error ? err : new Error('Failed to create fine');
    }
  };

  const update = async (id: string, updatedData: Partial<LibFineType>) => {
    try {
      const db = await getDatabase();
      const fine = await db.collections.fines.findOne(id).exec();
      if (fine) {
        await fine.update({
          $set: {
            ...updatedData,
            updated_at: new Date().toISOString(),
          },
        });
      }
    } catch (err) {
      throw err instanceof Error ? err : new Error('Failed to update fine');
    }
  };

  const remove = async (id: string) => {
    try {
      const db = await getDatabase();
      const fine = await db.collections.fines.findOne(id).exec();
      if (fine) {
        await fine.remove();
      }
    } catch (err) {
      throw err instanceof Error ? err : new Error('Failed to remove fine');
    }
  };

  // Search functionality
  const search = async (query: string) => {
    if (!query) {
      return data;
    }
    const lowerCaseQuery = query.toLowerCase();
    return data.filter(fine =>
      fine.book_title?.toLowerCase().includes(lowerCaseQuery) ||
      fine.user_name?.toLowerCase().includes(lowerCaseQuery) ||
      fine.reason?.toLowerCase().includes(lowerCaseQuery) ||
      fine.status.toLowerCase().includes(lowerCaseQuery)
    );
  };

  // Advanced search helpers
  const getPendingFines = async () => {
    return data.filter(fine => fine.status === 'Pending');
  };

  const getPaidFines = async () => {
    return data.filter(fine => fine.status === 'Paid');
  };

  const getBilledFines = async () => {
    return data.filter(fine => fine.status === 'Billed');
  };

  const getWaivedFines = async () => {
    return data.filter(fine => fine.status === 'Waived');
  };

  const getFinesByStatus = async (status: string) => {
    return data.filter(fine => fine.status === status);
  };

  const markAsPaid = async (id: string, paymentDate?: string, paymentReference?: string) => {
    return update(id, {
      status: 'Paid' as any,
      paid_date: paymentDate || new Date().toISOString().split('T')[0],
      payment_reference: paymentReference
    });
  };

  const waiveFine = async (id: string) => {
    return update(id, { status: 'Waived' as any });
  };

  const billFine = async (id: string) => {
    return update(id, { status: 'Billed' as any });
  };

  return {
    data,
    isLoading,
    error,
    create,
    update,
    remove,
    search,
    // Status-specific helpers
    getPendingFines,
    getPaidFines,
    getBilledFines,
    getWaivedFines,
    getFinesByStatus,
    markAsPaid,
    waiveFine,
    billFine
  };
};

export { useFineData };

// Mark this as a global provider for cross-module use
export const isGlobalProvider = true;