// ABOUTME: Self-contained hook for financialyear data management
// ABOUTME: Provides CRUD operations for financialyear without depending on AppDataContext

import { useState, useEffect } from 'react';
import { initialMockFinancialYears } from './mockData';
import { FinancialYear } from '../../../core/types';

export const useFinancialYearData = () => {
  const [data, setData] = useState<FinancialYear[]>(initialMockFinancialYears);

  const create = async (newItem: Partial<FinancialYear>) => {
    const newDataItem: FinancialYear = {
      ...newItem,
      id: Date.now(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    } as FinancialYear;
    setData((prev: FinancialYear[]) => [...prev, newDataItem]);
    return newDataItem;
  };

  const update = async (id: number, updatedData: Partial<FinancialYear>) => {
    setData((prev: FinancialYear[]) => prev.map((item: FinancialYear) => 
      item.id === id 
        ? { ...item, ...updatedData, updated_at: new Date().toISOString() }
        : item
    ));
  };

  const remove = async (id: number) => {
    setData((prev: FinancialYear[]) => prev.filter((item: FinancialYear) => item.id !== id));
  };

  return {
    data,
    create,
    update,
    remove
  };
};
