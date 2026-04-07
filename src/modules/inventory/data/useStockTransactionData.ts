// ABOUTME: Self-contained hook for stock transaction data management
// ABOUTME: Provides CRUD operations for stock transactions without depending on AppDataContext

import { useState, useEffect } from 'react';
import { initialMockStockTransactions } from './mockData';
import { StockTransaction } from '@/core/types';

const useStockTransactionData = () => {
  const [stockTransactions, setStockTransactions] = useState<StockTransaction[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      // Simulate fetching data from a mock source
      setStockTransactions(initialMockStockTransactions);
      setIsLoading(false);
    } catch (e) {
      setError('Failed to fetch StockTransactions');
      setIsLoading(false);
    }
  }, []);

  const create = async (newItem: Partial<StockTransaction>) => {
    const newDataItem: StockTransaction = {
      ...newItem,
      id: Date.now().toString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    } as StockTransaction;
    setStockTransactions((prev: StockTransaction[]) => [...prev, newDataItem]);
    return newDataItem;
  };

  const update = async (id: string, updatedData: Partial<StockTransaction>) => {
    setStockTransactions((prev: StockTransaction[]) => prev.map((item: StockTransaction) =>
      item.id === id
        ? { ...item, ...updatedData, updated_at: new Date().toISOString() }
        : item
    ));
  };

  const remove = async (id: string) => {
    setStockTransactions((prev: StockTransaction[]) => prev.filter((item: StockTransaction) => item.id !== id));
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