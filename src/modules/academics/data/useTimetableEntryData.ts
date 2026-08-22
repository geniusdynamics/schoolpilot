// ABOUTME: Self-contained hook for timetableentry data management
// ABOUTME: Provides CRUD operations for timetableentry without depending on AppDataContext

import { initialMockTimetableEntries } from './mockData';
import { TimetableEntry } from '@/core/types';
import { useState } from 'react';

export const useTimetableEntryData = () => {
  const [data, setData] = useState<TimetableEntry[]>(initialMockTimetableEntries);

  const create = async (newItem: Partial<TimetableEntry>) => {
    const newDataItem: TimetableEntry = {
      ...newItem,
      id: String(Date.now()),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    } as TimetableEntry;
    setData((prev: TimetableEntry[]) => [...prev, newDataItem]);
    return newDataItem;
  };

  const update = async (id: string, updatedData: Partial<TimetableEntry>) => {
    setData((prev: TimetableEntry[]) => prev.map((item: TimetableEntry) => 
      item.id === id 
        ? { ...item, ...updatedData, updated_at: new Date().toISOString() }
        : item
    ));
  };

  const remove = async (id: string) => {
    setData((prev: TimetableEntry[]) => prev.filter((item: TimetableEntry) => item.id !== id));
  };

  return {
    data,
    create,
    update,
    remove
  };
};
