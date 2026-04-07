// ABOUTME: Self-contained hook for payrollitemtype data management
// ABOUTME: Provides CRUD operations for payrollitemtype without depending on AppDataContext

import { useState, useEffect } from 'react';
import { initialMockPayrollItemTypes } from './mockData';
import { PayrollItemType } from '@/core/types';

export const usePayrollItemTypeData = () => {
  const [data, setData] = useState<PayrollItemType[]>(initialMockPayrollItemTypes);

  const create = async (newItem: Partial<PayrollItemType>) => {
    const newDataItem: PayrollItemType = {
      ...newItem,
      id: Date.now(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    } as PayrollItemType;
    setData((prev: PayrollItemType[]) => [...prev, newDataItem]);
    return newDataItem;
  };

  const update = async (id: number, updatedData: Partial<PayrollItemType>) => {
    setData((prev: PayrollItemType[]) => prev.map((item: PayrollItemType) => 
      item.id === id 
        ? { ...item, ...updatedData, updated_at: new Date().toISOString() }
        : item
    ));
  };

  const remove = async (id: number) => {
    setData((prev: PayrollItemType[]) => prev.filter((item: PayrollItemType) => item.id !== id));
  };

  return {
    data,
    create,
    update,
    remove
  };
};
