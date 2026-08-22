// ABOUTME: React hook wrapper for StockLevelService
// ABOUTME: Wires StockLevelService to database collections via useDatabaseCollection
// ABOUTME: Provides processTransaction, processTransactions, getStockLevel, getStockLevelsForItem

import { useCallback, useState } from 'react';
import { useDatabaseCollection } from '@/hooks/useDatabaseCollection';
import { databaseService } from '@/services/database/databaseService';
import {
  StockLevelService,
  type StockLevelUpdateResult,
  type StockLevelServiceDependencies,
  type StockLevelRecord,
} from '../services/StockLevelService';
import type { StockTransactionType, StockTransaction, StockLevel } from '../data/types';

/**
 * Hook that provides StockLevelService methods connected to the database.
 *
 * Usage:
 *   const { processTransaction, processTransactions, getStockLevel, isProcessing } = useStockLevelService();
 *   await processTransaction(transaction);
 *   const level = await getStockLevel('item-1', 'warehouse-1');
 */
export function useStockLevelService() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const stockLevelsCollection = useDatabaseCollection<StockLevel>('stock_levels');

  const createService = useCallback((): StockLevelService => {
    const deps: StockLevelServiceDependencies = {
      findStockLevel: async (itemId: string, warehouseId: string): Promise<StockLevelRecord | null> => {
        const levels = stockLevelsCollection.data;
        const existing = levels.find(
          sl => String(sl.item_id) === itemId && String(sl.warehouse_id) === warehouseId
        );
        if (!existing) return null;
        return {
          id: String(existing.id),
          item_id: String(existing.item_id),
          warehouse_id: String(existing.warehouse_id),
          quantity: Number(existing.quantity) || 0,
          item_name: existing.item_name ?? null,
          warehouse_name: existing.warehouse_name ?? null,
          category_name: existing.category_name ?? null,
        };
      },
      insertStockLevel: async (record) => {
        const result = await stockLevelsCollection.insert({
          ...record,
          item_id: record.item_id,
          warehouse_id: Number(record.warehouse_id),
          quantity: record.quantity,
        } as any);
        return result as StockLevelRecord | null;
      },
      updateStockLevel: async (id: string, changes: { quantity: number }) => {
        const result = await stockLevelsCollection.update(id, {
          quantity: changes.quantity,
        });
        return result as StockLevelRecord | null;
      },
      generateId: () => databaseService.generateId(),
    };
    return new StockLevelService(deps);
  }, [stockLevelsCollection.data, stockLevelsCollection.insert, stockLevelsCollection.update]);

  const processTransaction = useCallback(async (
    transaction: {
      id?: string;
      item_id: string;
      warehouse_id: number | string;
      transaction_type: StockTransactionType;
      quantity: number;
      source_table?: string | null;
      source_id?: string | null;
      transaction_date?: string | null;
      notes?: string | null;
    }
  ): Promise<StockLevelUpdateResult | null> => {
    setIsProcessing(true);
    setError(null);
    try {
      const service = createService();
      const txRecord = {
        id: transaction.id || databaseService.generateId(),
        item_id: transaction.item_id,
        warehouse_id: transaction.warehouse_id,
        transaction_type: transaction.transaction_type,
        quantity: transaction.quantity,
        source_table: transaction.source_table ?? null,
        source_id: transaction.source_id ?? null,
        transaction_date: transaction.transaction_date ?? null,
        notes: transaction.notes ?? null,
      };
      const result = await service.onStockTransaction(txRecord);
      // Refresh the collection to reflect changes
      await stockLevelsCollection.refresh();
      return result;
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error(String(err));
      setError(errorObj);
      return null;
    } finally {
      setIsProcessing(false);
    }
  }, [createService, stockLevelsCollection.refresh]);

  const processTransactions = useCallback(async (
    transactions: Array<{
      id?: string;
      item_id: string;
      warehouse_id: number | string;
      transaction_type: StockTransactionType;
      quantity: number;
      source_table?: string | null;
      source_id?: string | null;
      transaction_date?: string | null;
      notes?: string | null;
    }>
  ): Promise<StockLevelUpdateResult[]> => {
    setIsProcessing(true);
    setError(null);
    try {
      const service = createService();
      const txRecords = transactions.map(tx => ({
        id: tx.id || databaseService.generateId(),
        item_id: tx.item_id,
        warehouse_id: tx.warehouse_id,
        transaction_type: tx.transaction_type,
        quantity: tx.quantity,
        source_table: tx.source_table ?? null,
        source_id: tx.source_id ?? null,
        transaction_date: tx.transaction_date ?? null,
        notes: tx.notes ?? null,
      }));
      const results = await service.onStockTransactions(txRecords);
      // Refresh the collection to reflect changes
      await stockLevelsCollection.refresh();
      return results;
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error(String(err));
      setError(errorObj);
      return [];
    } finally {
      setIsProcessing(false);
    }
  }, [createService, stockLevelsCollection.refresh]);

  const getStockLevel = useCallback(async (itemId: string, warehouseId: string): Promise<StockLevelRecord | null> => {
    try {
      const service = createService();
      return await service.getStockLevel(itemId, warehouseId);
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error(String(err));
      setError(errorObj);
      return null;
    }
  }, [createService]);

  const getStockLevelsForItem = useCallback(async (itemId: string): Promise<StockLevelRecord[]> => {
    const levels = stockLevelsCollection.data;
    return levels
      .filter(sl => String(sl.item_id) === itemId)
      .map(sl => ({
        id: String(sl.id),
        item_id: String(sl.item_id),
        warehouse_id: String(sl.warehouse_id),
        quantity: Number(sl.quantity) || 0,
        item_name: sl.item_name ?? null,
        warehouse_name: sl.warehouse_name ?? null,
        category_name: sl.category_name ?? null,
      }));
  }, [stockLevelsCollection.data]);

  return {
    processTransaction,
    processTransactions,
    getStockLevel,
    getStockLevelsForItem,
    isProcessing,
    error,
  };
}

export default useStockLevelService;