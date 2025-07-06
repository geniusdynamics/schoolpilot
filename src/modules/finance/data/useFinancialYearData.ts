// ABOUTME: Provides CRUD and data provider logic for FinancialYear in Finance.
// ABOUTME: Exports a global provider hook for system-wide use.
import { useState } from 'react';
import { FinFinancialYearStatusEnum } from './types';
import { initialMockFinancialYears } from './mockData';

export const isGlobalProvider = true;

export function useFinancialYearData() {
  const [data, setData] = useState<any[]>(initialMockFinancialYears);

  const create = (item: any) => setData(prev => [...prev, item]);
  const update = (id: number, updates: Partial<any>) => setData(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item));
  const remove = (id: number) => setData(prev => prev.filter(item => item.id !== id));
  const get = (id: number) => data.find(item => item.id === id);
  return { data, create, update, remove, get };
} 