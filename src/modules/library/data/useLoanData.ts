// ABOUTME: Self-contained hook for loan data management
// ABOUTME: Provides CRUD operations for loan without depending on AppDataContext

import { useState, useEffect } from 'react';
import { getDatabase } from '@/services/database/databaseService';
import { LibLoanType } from './types';
import { useToast } from '@/hooks/useToast';

const useLoanData = () => {
  const [data, setData] = useState<LibLoanType[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const { showToast } = useToast();

  const notifyOverdueLoans = (loans: LibLoanType[]) => {
    const today = new Date().toISOString().split('T')[0];
    loans.forEach(loan => {
      if (!loan.return_date && loan.due_date < today) {
        showToast({
          title: 'Overdue Alert',
          message: `Loan for '${loan.book_title}' is overdue!`,
          variant: 'warning',
        });
      }
    });
  };

  useEffect(() => {
    let subscription: any = null;
    
    const initializeData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const db = await getDatabase();
        subscription = db.collections.loans.find().$.subscribe(loans => {
          if (loans) {
            setData(loans);
            notifyOverdueLoans(loans);
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
  }, [showToast]);

  const create = async (newItem: Partial<LibLoanType>) => {
    try {
      const db = await getDatabase();
      const loan = await db.collections.loans.insert({
        ...newItem,
        id: newItem.id || Date.now().toString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as LibLoanType);
      return loan;
    } catch (err) {
      throw err instanceof Error ? err : new Error('Failed to create loan');
    }
  };

  const update = async (id: string, updatedData: Partial<LibLoanType>) => {
    try {
      const db = await getDatabase();
      const loan = await db.collections.loans.findOne(id).exec();
      if (loan) {
        await loan.update({
          $set: {
            ...updatedData,
            updated_at: new Date().toISOString(),
          },
        });
      }
    } catch (err) {
      throw err instanceof Error ? err : new Error('Failed to update loan');
    }
  };

  const remove = async (id: string) => {
    try {
      const db = await getDatabase();
      const loan = await db.collections.loans.findOne(id).exec();
      if (loan) {
        await loan.remove();
      }
    } catch (err) {
      throw err instanceof Error ? err : new Error('Failed to remove loan');
    }
  };

  // Search functionality
  const search = async (query: string) => {
    if (!query) {
      return data;
    }
    const lowerCaseQuery = query.toLowerCase();
    return data.filter(loan =>
      loan.book_title?.toLowerCase().includes(lowerCaseQuery) ||
      loan.user_name?.toLowerCase().includes(lowerCaseQuery) ||
      loan.branch_id?.toLowerCase().includes(lowerCaseQuery) ||
      loan.userType.toLowerCase().includes(lowerCaseQuery)
    );
  };

  // Advanced search helpers for new fields
  const searchByBranchId = async (branchId: string) => {
    return data.filter(loan => loan.branch_id === branchId);
  };

  const getOverdueLoans = async () => {
    const today = new Date().toISOString().split('T')[0];
    return data.filter(loan => !loan.return_date && loan.due_date < today);
  };

  const getActiveLoans = async () => {
    return data.filter(loan => !loan.return_date);
  };

  const getLoansByUserType = async (userType: string) => {
    return data.filter(loan => loan.userType === userType);
  };

  const updateBranchId = async (id: string, branchId: string) => {
    return update(id, { branch_id: branchId });
  };

  const extendLoan = async (id: string, newDueDate: string) => {
    return update(id, { extended_due_date: newDueDate });
  };

  const returnBook = async (id: string) => {
    const returnDate = new Date().toISOString().split('T')[0];
    return update(id, { return_date: returnDate });
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
    getOverdueLoans,
    getActiveLoans,
    getLoansByUserType,
    updateBranchId,
    extendLoan,
    returnBook
  };
};

export { useLoanData };

// Mark this as a global provider for cross-module use
export const isGlobalProvider = true;