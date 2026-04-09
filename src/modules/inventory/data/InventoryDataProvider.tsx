// ABOUTME: Inventory Data Provider
// ABOUTME: Provides module-specific CRUD operations for Inventory

import React, { createContext, useContext, ReactNode, useCallback, useState } from 'react';
import { databaseService } from '@/services/database/databaseService';
import { useToast } from '@/hooks/useToast';
import * as types from './types';

interface InventoryDataContextType {
  warehouses: types.Warehouse[];
  items: types.ItemInv[];
  stockTransactions: types.StockTransaction[];
  requisitions: types.Requisition[];
  purchaseOrders: types.PurchaseOrder[];
  loading: boolean;
  
  // Warehouse CRUD
  addWarehouse: (data: Omit<types.Warehouse, 'id'>) => Promise<types.Warehouse>;
  updateWarehouse: (id: number, data: Partial<types.Warehouse>) => Promise<types.Warehouse>;
  deleteWarehouse: (id: number) => Promise<void>;
  
  // Item CRUD
  addItem: (data: Omit<types.ItemInv, 'id' | 'created_at' | 'updated_at'>) => Promise<types.ItemInv>;
  updateItem: (id: string, data: Partial<types.ItemInv>) => Promise<types.ItemInv>;
  deleteItem: (id: string) => Promise<void>;
  
  // Stock Transaction CRUD
  addStockTransaction: (data: Omit<types.StockTransaction, 'id' | 'created_at' | 'updated_at'>) => Promise<types.StockTransaction>;
  updateStockTransaction: (id: string, data: Partial<types.StockTransaction>) => Promise<types.StockTransaction>;
  deleteStockTransaction: (id: string) => Promise<void>;
}

const InventoryDataContext = createContext<InventoryDataContextType | undefined>(undefined);

export const useInventoryDataContext = () => {
  const context = useContext(InventoryDataContext);
  if (!context) throw new Error('useInventoryDataContext must be used within InventoryDataProvider');
  return context;
};

interface Props {
  children: ReactNode;
  warehouses: types.Warehouse[];
  items: types.ItemInv[];
  stockTransactions: types.StockTransaction[];
  requisitions: types.Requisition[];
  purchaseOrders: types.PurchaseOrder[];
  loading: boolean;
}

export const InventoryDataProvider: React.FC<Props> = ({
  children, warehouses, items, stockTransactions, requisitions, purchaseOrders, loading: parentLoading
}) => {
  const toast = useToast();
  const [localLoading, setLocalLoading] = useState(false);
  const loading = parentLoading || localLoading;

  const withToast = async <T,>(fn: () => Promise<T>, successMsg: string): Promise<T> => {
    setLocalLoading(true);
    try {
      const result = await fn();
      toast.showSuccess(successMsg);
      return result;
    } catch (error) {
      toast.showError(`Failed: ${error}`);
      throw error;
    } finally {
      setLocalLoading(false);
    }
  };

  const withConfirm = async <T,>(fn: () => Promise<T>, confirmMsg: string): Promise<T | void> => {
    if (!window.confirm(confirmMsg)) return;
    return fn();
  };

  // Warehouse CRUD
  const addWarehouse = useCallback((data) =>
    withToast(async () => {
      const db = await databaseService.getDatabase();
      const newItem: types.Warehouse = { ...data, id: Date.now() };
      await db.warehouses?.insert(newItem);
      return newItem;
    }, 'Warehouse created'), [toast]);

  const updateWarehouse = useCallback((id, data) =>
    withToast(async () => {
      const db = await databaseService.getDatabase();
      const updates = { ...data };
      await db.warehouses?.update(String(id), updates);
      return { ...warehouses.find(w => w.id === id), ...updates } as types.Warehouse;
    }, 'Warehouse updated'), [warehouses, toast]);

  const deleteWarehouse = useCallback((id) =>
    withConfirm(() =>
      withToast(async () => {
        const db = await databaseService.getDatabase();
        await db.warehouses?.remove(String(id));
      }, 'Warehouse deleted'), 'Delete this warehouse?'), [toast]);

  // Item CRUD
  const addItem = useCallback((data) =>
    withToast(async () => {
      const db = await databaseService.getDatabase();
      const newItem: types.ItemInv = {
        ...data,
        id: crypto.randomUUID(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      await db.items?.insert(newItem);
      return newItem;
    }, 'Item created'), [toast]);

  const updateItem = useCallback((id, data) =>
    withToast(async () => {
      const db = await databaseService.getDatabase();
      const updates = { ...data, updated_at: new Date().toISOString() };
      await db.items?.update(id, updates);
      return { ...items.find(i => i.id === id), ...updates } as types.ItemInv;
    }, 'Item updated'), [items, toast]);

  const deleteItem = useCallback((id) =>
    withConfirm(() =>
      withToast(async () => {
        const db = await databaseService.getDatabase();
        await db.items?.remove(id);
      }, 'Item deleted'), 'Delete this item?'), [toast]);

  // Stock Transaction CRUD
  const addStockTransaction = useCallback((data) =>
    withToast(async () => {
      const db = await databaseService.getDatabase();
      const newTx: types.StockTransaction = {
        ...data,
        id: crypto.randomUUID(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      await db.stock_transactions?.insert(newTx);
      return newTx;
    }, 'Stock transaction created'), [toast]);

  const updateStockTransaction = useCallback((id, data) =>
    withToast(async () => {
      const db = await databaseService.getDatabase();
      const updates = { ...data, updated_at: new Date().toISOString() };
      await db.stock_transactions?.update(id, updates);
      return { ...stockTransactions.find(t => t.id === id), ...updates } as types.StockTransaction;
    }, 'Stock transaction updated'), [stockTransactions, toast]);

  const deleteStockTransaction = useCallback((id) =>
    withConfirm(() =>
      withToast(async () => {
        const db = await databaseService.getDatabase();
        await db.stock_transactions?.remove(id);
      }, 'Stock transaction deleted'), 'Delete this transaction?'), [toast]);

  return (
    <InventoryDataContext.Provider value={{
      warehouses, items, stockTransactions, requisitions, purchaseOrders, loading,
      addWarehouse, updateWarehouse, deleteWarehouse,
      addItem, updateItem, deleteItem,
      addStockTransaction, updateStockTransaction, deleteStockTransaction,
    }}>
      {children}
    </InventoryDataContext.Provider>
  );
};

export default InventoryDataProvider;
