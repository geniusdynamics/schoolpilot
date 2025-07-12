// ABOUTME: Self-contained hook for bank data management
// ABOUTME: Provides CRUD operations for bank without depending on AppDataContext

import { useState, useEffect } from 'react';
import { initialMockBanks } from '../../administration/data/mockData';
import { Bank } from '../../../core/types';

export const useBankData = () => {
  const [data, setData] = useState<Bank[]>(initialMockBanks);

  const create = async (newItem: Partial<Bank>) => {
    const newDataItem: Bank = {
      ...newItem,
      id: Date.now(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    } as Bank;
    setData((prev: Bank[]) => [...prev, newDataItem]);
    return newDataItem;
  };

  const update = async (id: number, updatedData: Partial<Bank>) => {
    setData((prev: Bank[]) => prev.map((item: Bank) => 
      item.id === id 
        ? { ...item, ...updatedData, updated_at: new Date().toISOString() }
        : item
    ));
  };

  const remove = async (id: number) => {
    setData((prev: Bank[]) => prev.filter((item: Bank) => item.id !== id));
  };

  return {
    data,
    create,
    update,
    remove
  };
};
