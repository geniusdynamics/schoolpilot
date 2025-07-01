// ABOUTME: Provides CRUD and data provider logic for StudentWallet in Nutrition.
// ABOUTME: Exports a global provider hook for system-wide use.
import { useState } from 'react';
import { initialMockStudentWallets } from './mockData';

export const isGlobalProvider = true;

export function useStudentWalletData() {
  const [data, setData] = useState<any[]>(initialMockStudentWallets);

  const create = (item: any) => setData(prev => [...prev, item]);
  const update = (student_id: string, updates: Partial<any>) => setData(prev => prev.map(item => item.student_id === student_id ? { ...item, ...updates } : item));
  const remove = (student_id: string) => setData(prev => prev.filter(item => item.student_id !== student_id));
  const get = (student_id: string) => data.find(item => item.student_id === student_id);
  return { data, create, update, remove, get };
} 