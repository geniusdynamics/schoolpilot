// ABOUTME: Provides CRUD and data provider logic for StockLevel in Inventory.
// ABOUTME: Exports a global provider hook for system-wide use.
import { useState } from 'react';
import { initialMockStockLevels } from './mockData';

export const isGlobalProvider = true;

export function useStockLevelData() {
  const [data, setData] = useState<any[]>(initialMockStockLevels);

  const create = (item: any) => setData(prev => [...prev, item]);
  const update = (compositeId: string, updates: Partial<any>) => setData(prev => prev.map(item => item.compositeId === compositeId ? { ...item, ...updates } : item));
  const remove = (compositeId: string) => setData(prev => prev.filter(item => item.compositeId !== compositeId));
  const get = (compositeId: string) => data.find(item => item.compositeId === compositeId);
  return { data, create, update, remove, get };
} 