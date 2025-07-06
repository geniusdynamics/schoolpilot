// ABOUTME: Provides a global provider hook for HR Payslip Items with full CRUD logic.
// ABOUTME: Used for managing payslip items in the HR module.

import { useState } from 'react';
import { HRPayslipItemType } from './types';
import { initialMockPayslipItems } from './mockData';

export const isGlobalProvider = true;

const convertNulls = (item: any) => ({
  ...item,
  description: item.description === null ? undefined : item.description,
});

export function usePayslipItemData() {
  const [data, setData] = useState<HRPayslipItemType[]>(initialMockPayslipItems.map(convertNulls));

  const create = (item: Omit<HRPayslipItemType, 'id'>) => {
    const newItem = { ...item, id: `PSLI${Date.now()}` };
    setData(prev => [...prev, newItem]);
    return newItem;
  };

  const read = () => data;

  const update = (updated: HRPayslipItemType) => {
    setData(prev => prev.map(item => item.id === updated.id ? updated : item));
  };

  const remove = (id: string) => {
    setData(prev => prev.filter(item => item.id !== id));
  };

  return { data, create, read, update, remove };
}
