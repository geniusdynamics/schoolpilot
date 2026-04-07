// ABOUTME: Inventory domain context — Warehouses, ItemCategories, StockItems, FixedAssets,
// ABOUTME: AssetDepreciationLogs, Requisitions, PurchaseOrders, StockTransactions, RFQs
// ABOUTME: Wraps useInventoryData hook and exposes it via React Context

import React, { createContext, useContext, useMemo, ReactNode } from 'react';
import { useInventoryData } from '@/hooks/data/useInventoryData';

export type InventoryDataContextValue = ReturnType<typeof useInventoryData>;

const InventoryDataContext = createContext<InventoryDataContextValue | undefined>(undefined);

export const InventoryDataProvider: React.FC<{ children: ReactNode; mockData?: any }> = ({
  children,
  mockData,
}) => {
  const data = useInventoryData(mockData);

  const value = useMemo(() => data, [data]);

  return (
    <InventoryDataContext.Provider value={value}>
      {children}
    </InventoryDataContext.Provider>
  );
};

export const useInventoryDataContext = (): InventoryDataContextValue => {
  const context = useContext(InventoryDataContext);
  if (context === undefined) {
    throw new Error('useInventoryDataContext must be used within an InventoryDataProvider');
  }
  return context;
};

export { InventoryDataContext };
