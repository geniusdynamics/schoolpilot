/**
 * Student Invoice Item Data Hook
 * 
 * Provides CRUD operations for student invoice item management.
 * 
 * @module finance/data/useStudentInvoiceItemData
 */

import { useState, useEffect } from 'react';

interface StudentInvoiceItem {
  id: number;
  invoice_id: number;
  description: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  created_at: string;
  updated_at: string;
}

interface UseStudentInvoiceItemDataResult {
  data: StudentInvoiceItem[];
  isLoading: boolean;
  error: string | null;
  create: (newItem: Partial<StudentInvoiceItem>) => Promise<StudentInvoiceItem>;
  update: (id: number, updatedData: Partial<StudentInvoiceItem>) => Promise<void>;
  remove: (id: number) => Promise<void>;
}

/**
 * Hook for managing student invoice item data
 * @returns Student invoice item data and CRUD operations
 */
const useStudentInvoiceItemData = (): UseStudentInvoiceItemDataResult => {
  const [studentInvoiceItems, setStudentInvoiceItems] = useState<StudentInvoiceItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        // TODO: Fetch from database
        setStudentInvoiceItems([]);
        setIsLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch student invoice items');
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  const create = async (newItem: Partial<StudentInvoiceItem>): Promise<StudentInvoiceItem> => {
    const newDataItem: StudentInvoiceItem = {
      id: Date.now(),
      invoice_id: newItem.invoice_id || 0,
      description: newItem.description || '',
      quantity: newItem.quantity || 1,
      unit_price: newItem.unit_price || 0,
      total_amount: (newItem.quantity || 1) * (newItem.unit_price || 0),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...newItem
    };
    setStudentInvoiceItems((prev) => [...prev, newDataItem]);
    return newDataItem;
  };

  const update = async (id: number, updatedData: Partial<StudentInvoiceItem>): Promise<void> => {
    setStudentInvoiceItems((prev) => prev.map((item) =>
      item.id === id
        ? { 
            ...item, 
            ...updatedData, 
            total_amount: (updatedData.quantity || item.quantity) * (updatedData.unit_price || item.unit_price),
            updated_at: new Date().toISOString() 
          }
        : item
    ));
  };

  const remove = async (id: number): Promise<void> => {
    setStudentInvoiceItems((prev) => prev.filter((item) => item.id !== id));
  };

  return {
    data: studentInvoiceItems,
    isLoading,
    error,
    create,
    update,
    remove
  };
};

export { useStudentInvoiceItemData };
export type { StudentInvoiceItem, UseStudentInvoiceItemDataResult };
