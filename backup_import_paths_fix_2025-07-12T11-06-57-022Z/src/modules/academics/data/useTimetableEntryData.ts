// ABOUTME: Self-contained hook for timetableentry data management
// ABOUTME: Provides CRUD operations for timetableentry without depending on AppDataContext

import { useState, useEffect } from 'react';
import { initialMockTimetableEntries } from '../../administration/data/mockData';
import { TimetableEntry } from '../../../core/types';

export const useTimetableEntryData = () => {
  const [data, setData] = useState<TimetableEntry[]>(initialMockTimetableEntries);

  const create = async (newItem: Partial<TimetableEntry>) => {
    const newDataItem: TimetableEntry = {
      ...newItem,
      id: Date.now(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    } as TimetableEntry;
    setData((prev: TimetableEntry[]) => [...prev, newDataItem]);
    return newDataItem;
  };

  const update = async (id: number, updatedData: Partial<TimetableEntry>) => {
    setData((prev: TimetableEntry[]) => prev.map((item: TimetableEntry) => 
      item.id === id 
        ? { ...item, ...updatedData, updated_at: new Date().toISOString() }
        : item
    ));
  };

  const remove = async (id: number) => {
    setData((prev: TimetableEntry[]) => prev.filter((item: TimetableEntry) => item.id !== id));
  };

  return {
    data,
    create,
    update,
    remove
  };
};
