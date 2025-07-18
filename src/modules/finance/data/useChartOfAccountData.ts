// ABOUTME: Self-contained hook for chartofaccount data management
// ABOUTME: Provides CRUD operations for chartofaccount without depending on AppDataContext

import { useState, useEffect } from 'react';
import { initialMockChartOfAccounts } from './mockData';
import { FinChartOfAccountType } from './types';

export const useChartOfAccountData = () => {
  const [data, setData] = useState<FinChartOfAccountType[]>(initialMockChartOfAccounts);

  const create = async (newItem: Partial<FinChartOfAccountType>) => {
    const newDataItem: FinChartOfAccountType = {
      ...newItem,
      id: Date.now(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    } as FinChartOfAccountType;
    setData((prev: FinChartOfAccountType[]) => [...prev, newDataItem]);
    return newDataItem;
  };

  const update = async (id: number, updatedData: Partial<FinChartOfAccountType>) => {
    setData((prev: FinChartOfAccountType[]) => prev.map((item: FinChartOfAccountType) =>
      item.id === id
        ? { ...item, ...updatedData, updated_at: new Date().toISOString() }
        : item
    ));
  };

  const remove = async (id: number) => {
    setData((prev: FinChartOfAccountType[]) => prev.filter((item: FinChartOfAccountType) => item.id !== id));
  };

  return {
    data,
    create,
    update,
    remove
  };
};
