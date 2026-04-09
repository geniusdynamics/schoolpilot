/**
 * Staff Recurring Item Data Hook
 * 
 * Provides CRUD operations for staff recurring item management.
 * Recurring items are deductions or additions that apply to every payslip.
 * 
 * @module hr/data/useStaffRecurringItemData
 */

import { useState, useEffect } from 'react';

interface StaffRecurringItem {
  id: number;
  staff_id: number;
  name: string;
  type: 'deduction' | 'addition';
  amount: number;
  is_percentage: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface UseStaffRecurringItemDataResult {
  data: StaffRecurringItem[];
  isLoading: boolean;
  error: string | null;
  create: (newItem: Partial<StaffRecurringItem>) => Promise<StaffRecurringItem>;
  update: (id: number, updatedData: Partial<StaffRecurringItem>) => Promise<void>;
  remove: (id: number) => Promise<void>;
}

/**
 * Hook for managing staff recurring item data
 * @returns Staff recurring item data and CRUD operations
 */
const useStaffRecurringItemData = (): UseStaffRecurringItemDataResult => {
  const [staffRecurringItems, setStaffRecurringItems] = useState<StaffRecurringItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        // TODO: Fetch from database
        setStaffRecurringItems([]);
        setIsLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch staff recurring items');
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  const create = async (newItem: Partial<StaffRecurringItem>): Promise<StaffRecurringItem> => {
    const newDataItem: StaffRecurringItem = {
      id: Date.now(),
      staff_id: newItem.staff_id || 0,
      name: newItem.name || '',
      type: newItem.type || 'deduction',
      amount: newItem.amount || 0,
      is_percentage: newItem.is_percentage ?? false,
      is_active: newItem.is_active ?? true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...newItem
    };
    setStaffRecurringItems((prev) => [...prev, newDataItem]);
    return newDataItem;
  };

  const update = async (id: number, updatedData: Partial<StaffRecurringItem>): Promise<void> => {
    setStaffRecurringItems((prev) => prev.map((item) =>
      item.id === id
        ? { ...item, ...updatedData, updated_at: new Date().toISOString() }
        : item
    ));
  };

  const remove = async (id: number): Promise<void> => {
    setStaffRecurringItems((prev) => prev.filter((item) => item.id !== id));
  };

  return {
    data: staffRecurringItems,
    isLoading,
    error,
    create,
    update,
    remove
  };
};

export { useStaffRecurringItemData };
export type { StaffRecurringItem, UseStaffRecurringItemDataResult };
