// ABOUTME: Database-backed hook for stock transaction data management
// ABOUTME: Provides CRUD operations for stock transactions against the 'stock_transactions' collection

import { useCallback } from 'react';
import { useDatabaseCollection } from '@/hooks/useDatabaseCollection';
import { StockTransaction } from './types';

const useStockTransactionData = () => {
  const stockTransactionsCollection = useDatabaseCollection<StockTransaction>('stock_transactions');

  const create = useCallback(async (newItem: Partial<StockTransaction>) => {
    return stockTransactionsCollection.insert(newItem as Omit<StockTransaction, 'id'> & { id?: string });
  }, [stockTransactionsCollection]);

  const update = useCallback(async (id: number | string, updatedData: Partial<StockTransaction>) => {
    return stockTransactionsCollection.update(String(id), updatedData);
  }, [stockTransactionsCollection]);

  const remove = useCallback(async (id: number | string) => {
    return stockTransactionsCollection.remove(String(id));
  }, [stockTransactionsCollection]);

  return {
    data: stockTransactionsCollection.data,
    isLoading: stockTransactionsCollection.loading,
    error: stockTransactionsCollection.error,
    create,
    update,
    remove
  };
};

export { useStockTransactionData };
