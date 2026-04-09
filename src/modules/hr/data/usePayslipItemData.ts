/**
 * Payslip Item Data Hook
 * 
 * Provides CRUD operations for payslip item management.
 * Individual line items that make up a payslip.
 * 
 * @module hr/data/usePayslipItemData
 */

import { useState, useEffect } from 'react';

interface PayslipItem {
  id: number;
  payslip_id: number;
  name: string;
  type: 'earnings' | 'deductions' | 'taxes';
  amount: number;
  description?: string;
  created_at: string;
  updated_at: string;
}

interface UsePayslipItemDataResult {
  data: PayslipItem[];
  isLoading: boolean;
  error: string | null;
  create: (newItem: Partial<PayslipItem>) => Promise<PayslipItem>;
  update: (id: number, updatedData: Partial<PayslipItem>) => Promise<void>;
  remove: (id: number) => Promise<void>;
}

/**
 * Hook for managing payslip item data
 * @returns Payslip item data and CRUD operations
 */
const usePayslipItemData = (): UsePayslipItemDataResult => {
  const [payslipItems, setPayslipItems] = useState<PayslipItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        // TODO: Fetch from database
        setPayslipItems([]);
        setIsLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch payslip items');
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  const create = async (newItem: Partial<PayslipItem>): Promise<PayslipItem> => {
    const newDataItem: PayslipItem = {
      id: Date.now(),
      payslip_id: newItem.payslip_id || 0,
      name: newItem.name || '',
      type: newItem.type || 'earnings',
      amount: newItem.amount || 0,
      description: newItem.description,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...newItem
    };
    setPayslipItems((prev) => [...prev, newDataItem]);
    return newDataItem;
  };

  const update = async (id: number, updatedData: Partial<PayslipItem>): Promise<void> => {
    setPayslipItems((prev) => prev.map((item) =>
      item.id === id
        ? { ...item, ...updatedData, updated_at: new Date().toISOString() }
        : item
    ));
  };

  const remove = async (id: number): Promise<void> => {
    setPayslipItems((prev) => prev.filter((item) => item.id !== id));
  };

  return {
    data: payslipItems,
    isLoading,
    error,
    create,
    update,
    remove
  };
};

export { usePayslipItemData };
export type { PayslipItem, UsePayslipItemDataResult };
