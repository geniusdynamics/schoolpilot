// ABOUTME: Self-contained hook for any data management
// ABOUTME: Provides CRUD operations for any without depending on AppDataContext

import { useState, useEffect } from 'react';
import { initialMockUsers } from '../../administration/data/mockData';
import { any } from '../../../core/types';

const useStockTransactionData = () => {
  const [stockTransactions, setStockTransactions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      // Simulate fetching data from a mock source
      setStockTransactions(initialMockUsers);
      setIsLoading(false);
    } catch (e) {
      setError('Failed to fetch stock transactions');
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
    setStockTransactions((prev: any[]) => [...prev, newDataItem]);
    return newDataItem;
  };

  const update = async (id: number, updatedData: Partial<any>) => {
    setStockTransactions((prev: any[]) => prev.map((item: any) =>
      item.id === id
        ? { ...item, ...updatedData, updated_at: new Date().toISOString() }
        : item
    ));
  };

  const remove = async (id: number) => {
    setStockTransactions((prev: any[]) => prev.filter((item: any) => item.id !== id));
  };

  return {
    data: stockTransactions,
    isLoading,
    error,
    create,
    update,
    remove
  };
};

export { useStockTransactionData };