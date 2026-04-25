// ABOUTME: Self-contained hook for payrollperiod data management
// ABOUTME: Provides CRUD operations for payrollperiod without depending on AppDataContext

import { useState, useEffect } from 'react';
import { initialMockPayrollPeriods } from './mockData';
import { PayrollPeriod } from './types';

export const usePayrollPeriodData = () => {
  const [data, setData] = useState<PayrollPeriod[]>(initialMockPayrollPeriods);

  const create = async (newItem: Partial<PayrollPeriod>) => {
    const newDataItem: PayrollPeriod = {
      ...newItem,
      id: Date.now(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    } as PayrollPeriod;
    setData((prev: PayrollPeriod[]) => [...prev, newDataItem]);
    return newDataItem;
  };

  const update = async (id: number, updatedData: Partial<PayrollPeriod>) => {
    setData((prev: PayrollPeriod[]) => prev.map((item: PayrollPeriod) => 
      item.id === id 
        ? { ...item, ...updatedData, updated_at: new Date().toISOString() }
        : item
    ));
  };

  const remove = async (id: number) => {
    setData((prev: PayrollPeriod[]) => prev.filter((item: PayrollPeriod) => item.id !== id));
  };

  return {
    data,
    create,
    update,
    remove
  };
};
