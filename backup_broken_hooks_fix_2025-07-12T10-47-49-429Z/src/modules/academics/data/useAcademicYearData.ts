// ABOUTME: Self-contained hook for academic year data management
// ABOUTME: Provides CRUD operations for academic years without depending on AppDataContext

import { useState, useEffect } from 'react';
import { initialMockAcademicYears } from '../../administration/data/mockData';
import { AcademicYear } from '../../../core/types';

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
