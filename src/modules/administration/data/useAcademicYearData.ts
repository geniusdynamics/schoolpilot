// ABOUTME: Self-contained hook for academicyear data management
// ABOUTME: Provides CRUD operations for academicyear without depending on AppDataContext

import { initialMockAcademicYears } from './mockData';
import { AcademicYear } from '@/core/types';
import { useState } from 'react';

export const useAcademicYearData = () => {
  const [data, setData] = useState<AcademicYear[]>(initialMockAcademicYears);

  const create = async (newItem: Partial<AcademicYear>) => {
    const newDataItem: AcademicYear = {
      ...newItem,
      id: Date.now(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    } as AcademicYear;
    setData((prev: AcademicYear[]) => [...prev, newDataItem]);
    return newDataItem;
  };

  const update = async (id: number, updatedData: Partial<AcademicYear>) => {
    setData((prev: AcademicYear[]) => prev.map((item: AcademicYear) => 
      item.id === id 
        ? { ...item, ...updatedData, updated_at: new Date().toISOString() }
        : item
    ));
  };

  const remove = async (id: number) => {
    setData((prev: AcademicYear[]) => prev.filter((item: AcademicYear) => item.id !== id));
  };

  return {
    data,
    create,
    update,
    remove
  };
};

// Mark this as a global provider for cross-module use
export const isGlobalProvider = true;
