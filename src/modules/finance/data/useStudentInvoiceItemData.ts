// ABOUTME: Self-contained hook for any data management
// ABOUTME: Provides CRUD operations for any without depending on AppDataContext

import { useState, useEffect } from 'react';
import { initialMockUsers } from '../../administration/data/mockData';

const useStudentInvoiceItemData = () => {
  const [studentInvoiceItems, setStudentInvoiceItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      // Simulate fetching data from a mock source
      setStudentInvoiceItems(initialMockUsers);
      setIsLoading(false);
    } catch (e) {
      setError('Failed to fetch student invoice items');
      setIsLoading(false);
    }
  }, []);

  const create = async (newItem: Partial<any>) => {
    const newDataItem: any = {
      ...newItem,
      id: Date.now(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    } as any;
    setStudentInvoiceItems((prev: any[]) => [...prev, newDataItem]);
    return newDataItem;
  };

  const update = async (id: number, updatedData: Partial<any>) => {
    setStudentInvoiceItems((prev: any[]) => prev.map((item: any) =>
      item.id === id
        ? { ...item, ...updatedData, updated_at: new Date().toISOString() }
        : item
    ));
  };

  const remove = async (id: number) => {
    setStudentInvoiceItems((prev: any[]) => prev.filter((item: any) => item.id !== id));
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