// ABOUTME: Provides CRUD and data provider logic for Bank in Finance.
// ABOUTME: Exports a global provider hook for system-wide use.
import { useState } from 'react';
import { initialMockBanks } from './mockData';

export const isGlobalProvider = true;

export function useBankData() {
  const [data, setData] = useState<any[]>(initialMockBanks);

  const create = (item: any) => setData(prev => [...prev, item]);
  const update = (id: number, updates: Partial<any>) => setData(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item));
  const remove = (id: number) => setData(prev => prev.filter(item => item.id !== id));
  const get = (id: number) => data.find(item => item.id === id);
  return { data, create, update, remove, get };
} 