/**
 * Expense Claim Data Hook
 * 
 * Provides CRUD operations for expense claim management.
 * 
 * @module finance/data/useExpenseClaimData
 */

import { useState, useEffect } from 'react';

interface ExpenseClaim {
  id: number;
  staff_id: number;
  category_id: number;
  description: string;
  amount: number;
  claim_date: string;
  receipt_number?: string;
  status: 'pending' | 'approved' | 'rejected' | 'paid';
  approved_by?: number;
  approved_at?: string;
  created_at: string;
  updated_at: string;
}

interface UseExpenseClaimDataResult {
  data: ExpenseClaim[];
  isLoading: boolean;
  error: string | null;
  create: (newItem: Partial<ExpenseClaim>) => Promise<ExpenseClaim>;
  update: (id: number, updatedData: Partial<ExpenseClaim>) => Promise<void>;
  remove: (id: number) => Promise<void>;
}

/**
 * Hook for managing expense claim data
 * @returns Expense claim data and CRUD operations
 */
const useExpenseClaimData = (): UseExpenseClaimDataResult => {
  const [expenseClaims, setExpenseClaims] = useState<ExpenseClaim[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        // TODO: Fetch from database
        setExpenseClaims([]);
        setIsLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch expense claims');
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  const create = async (newItem: Partial<ExpenseClaim>): Promise<ExpenseClaim> => {
    const newDataItem: ExpenseClaim = {
      id: Date.now(),
      staff_id: newItem.staff_id || 0,
      category_id: newItem.category_id || 0,
      description: newItem.description || '',
      amount: newItem.amount || 0,
      claim_date: newItem.claim_date || new Date().toISOString(),
      receipt_number: newItem.receipt_number,
      status: newItem.status || 'pending',
      approved_by: newItem.approved_by,
      approved_at: newItem.approved_at,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...newItem
    };
    setExpenseClaims((prev) => [...prev, newDataItem]);
    return newDataItem;
  };

  const update = async (id: number, updatedData: Partial<ExpenseClaim>): Promise<void> => {
    setExpenseClaims((prev) => prev.map((item) =>
      item.id === id
        ? { ...item, ...updatedData, updated_at: new Date().toISOString() }
        : item
    ));
  };

  const remove = async (id: number): Promise<void> => {
    setExpenseClaims((prev) => prev.filter((item) => item.id !== id));
  };

  return {
    data: expenseClaims,
    isLoading,
    error,
    create,
    update,
    remove
  };
};

export { useExpenseClaimData };
export type { ExpenseClaim, UseExpenseClaimDataResult };
