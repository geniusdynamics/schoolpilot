// ABOUTME: Provides CRUD and data provider logic for TimetableEntry in Academics.
// ABOUTME: Exports a global provider hook for system-wide use.
import { useState } from 'react';
import { AcademicsTimetableEntryType } from './types';
import { initialMockTimetableEntries } from './mockData';

export const isGlobalProvider = true;

export function useTimetableEntryData() {
  const [data, setData] = useState<AcademicsTimetableEntryType[]>(initialMockTimetableEntries);

  const create = (item: AcademicsTimetableEntryType) => setData(prev => [...prev, item]);
  const update = (id: string, updates: Partial<AcademicsTimetableEntryType>) => setData(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item));
  const remove = (id: string) => setData(prev => prev.filter(item => item.id !== id));
  const get = (id: string) => data.find(item => item.id === id);
  return { data, create, update, remove, get };
} 