// ABOUTME: Self-contained hook for chartofaccount data management
// ABOUTME: Provides CRUD operations for chartofaccount without depending on AppDataContext

import { useState, useEffect } from 'react';
import { initialMockChartOfAccounts } from '../../administration/data/mockData';
import { ChartOfAccount } from '../../../core/types';

export const useChartOfAccountData = () => {
  const [data, setData] = useState<ChartOfAccount[]>(initialMockChartOfAccounts);

  const create = async (newItem: Partial<ChartOfAccount>) => {
    const newDataItem: ChartOfAccount = {
      ...newItem,
      id: Date.now(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    } as ChartOfAccount;
    setData((prev: ChartOfAccount[]) => [...prev, newDataItem]);
    return newDataItem;
  };

  const update = async (id: number, updatedData: Partial<ChartOfAccount>) => {
    setData((prev: ChartOfAccount[]) => prev.map((item: ChartOfAccount) => 
      item.id === id 
        ? { ...item, ...updatedData, updated_at: new Date().toISOString() }
        : item
    ));
  };

  const remove = async (id: number) => {
    setData((prev: ChartOfAccount[]) => prev.filter((item: ChartOfAccount) => item.id !== id));
  };

  return {
    data,
    create,
    update,
    remove
  };
};
