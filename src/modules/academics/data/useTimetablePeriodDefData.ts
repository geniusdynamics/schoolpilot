// ABOUTME: Provides CRUD and data provider logic for TimetablePeriodDef in Academics.
// ABOUTME: Exports a global provider hook for system-wide use.
import { useState } from 'react';
import { TimetablePeriodDef } from '../../../core/types';
import { initialMockTimetablePeriodDefs } from './mockData';

export const isGlobalProvider = true;

export function useTimetablePeriodDefData() {
  const [data, setData] = useState<TimetablePeriodDef[]>(initialMockTimetablePeriodDefs);

  const create = (item: TimetablePeriodDef) => setData(prev => [...prev, item]);
  const update = (id: number, updates: Partial<TimetablePeriodDef>) => setData(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item));
  const remove = (id: number) => setData(prev => prev.filter(item => item.id !== id));
  const get = (id: number) => data.find(item => item.id === id);
  return { data, create, update, remove, get };
}