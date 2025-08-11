// ABOUTME: Self-contained hook for schoolperiod data management
// ABOUTME: Provides CRUD operations for schoolperiod without depending on AppDataContext

import { useState, useEffect } from 'react';
import { initialMockSchoolPeriods } from './mockData';
import { SchoolPeriod } from '../../../core/types';

export const useSchoolPeriodData = () => {
  const [data, setData] = useState<SchoolPeriod[]>(initialMockSchoolPeriods);

  const create = async (newItem: Partial<SchoolPeriod>) => {
    const newDataItem: SchoolPeriod = {
      ...newItem,
      id: Date.now(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    } as SchoolPeriod;
    setData((prev: SchoolPeriod[]) => [...prev, newDataItem]);
    return newDataItem;
  };

  const update = async (id: number, updatedData: Partial<SchoolPeriod>) => {
    setData((prev: SchoolPeriod[]) => prev.map((item: SchoolPeriod) => 
      item.id === id 
        ? { ...item, ...updatedData, updated_at: new Date().toISOString() }
        : item
    ));
  };

  const remove = async (id: number) => {
    setData((prev: SchoolPeriod[]) => prev.filter((item: SchoolPeriod) => item.id !== id));
  };

  return {
    schoolPeriods: data,
    addSchoolPeriod: create,
    updateSchoolPeriod: update,
    deleteSchoolPeriod: remove
  };
};

// Mark this as a global provider for cross-module use
export const isGlobalProvider = true;
