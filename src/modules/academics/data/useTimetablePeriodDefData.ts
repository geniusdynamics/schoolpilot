// ABOUTME: Self-contained hook for timetableperioddef data management
// ABOUTME: Provides CRUD operations for timetableperioddef without depending on AppDataContext

import { useState, useEffect } from 'react';
import { initialMockTimetablePeriodDefs } from './mockData';
import { TimetablePeriodDef } from '@/core/types';

export const useTimetablePeriodDefData = () => {
  const [data, setData] = useState<TimetablePeriodDef[]>(initialMockTimetablePeriodDefs);

  const create = async (newItem: Partial<TimetablePeriodDef>) => {
    const newDataItem: TimetablePeriodDef = {
      ...newItem,
      id: Date.now(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    } as TimetablePeriodDef;
    setData((prev: TimetablePeriodDef[]) => [...prev, newDataItem]);
    return newDataItem;
  };

  const update = async (id: number, updatedData: Partial<TimetablePeriodDef>) => {
    setData((prev: TimetablePeriodDef[]) => prev.map((item: TimetablePeriodDef) => 
      item.id === id 
        ? { ...item, ...updatedData, updated_at: new Date().toISOString() }
        : item
    ));
  };

  const remove = async (id: number) => {
    setData((prev: TimetablePeriodDef[]) => prev.filter((item: TimetablePeriodDef) => item.id !== id));
  };

  return {
    data,
    create,
    update,
    remove
  };
};
