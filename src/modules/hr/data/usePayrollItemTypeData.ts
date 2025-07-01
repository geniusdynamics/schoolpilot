// ABOUTME: Provides a global provider hook for HR Payroll Item Types with full CRUD logic.
// ABOUTME: Used for managing payroll item types in the HR module.

import { useState } from 'react';
import { HRPayrollItemTypeType } from './types';
import { initialMockPayrollItemTypes } from './mockData';

export const isGlobalProvider = true;

const convertEnums = (item: any) => ({
  ...item,
  category: typeof item.category === 'string' ? item.category : String(item.category),
  tax_implication: typeof item.tax_implication === 'string' ? item.tax_implication : String(item.tax_implication),
});

export function usePayrollItemTypeData() {
  const [data, setData] = useState<HRPayrollItemTypeType[]>(initialMockPayrollItemTypes.map(convertEnums));

  const create = (item: Omit<HRPayrollItemTypeType, 'id'>) => {
    const newItem = { ...item, id: Date.now(), created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
    setData(prev => [...prev, newItem]);
    return newItem;
  };

  const read = () => data;

  const update = (updated: HRPayrollItemTypeType) => {
    setData(prev => prev.map(item => item.id === updated.id ? updated : item));
  };

  const remove = (id: number) => {
    setData(prev => prev.filter(item => item.id !== id));
  };

  return { data, create, read, update, remove };
}
