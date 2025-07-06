// ABOUTME: Provides CRUD and data provider logic for GeneralLedgerEntry in Finance.
// ABOUTME: Exports a global provider hook for system-wide use.
import { useState } from 'react';
import { initialMockGeneralLedgerEntries } from './mockData';

export const isGlobalProvider = true;

export function useGeneralLedgerEntryData() {
  const [data, setData] = useState<any[]>(initialMockGeneralLedgerEntries);

  const create = (item: any) => setData(prev => [...prev, item]);
  const update = (id: string, updates: Partial<any>) => setData(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item));
  const remove = (id: string) => setData(prev => prev.filter(item => item.id !== id));
  const get = (id: string) => data.find(item => item.id === id);
  return { data, create, update, remove, get };
} 