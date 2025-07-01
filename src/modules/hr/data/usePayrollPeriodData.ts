// ABOUTME: Provides a global provider hook for HR Payroll Periods with full CRUD logic.
// ABOUTME: Used for managing payroll periods in the HR module.

import { useState } from 'react';
import { HRPayrollPeriodType } from './types';
import { initialMockPayrollPeriods } from './mockData';

export const isGlobalProvider = true;

const convertNulls = (item: any) => ({
  ...item,
  school_period_id: item.school_period_id === null ? undefined : item.school_period_id,
});

export function usePayrollPeriodData() {
  const [data, setData] = useState<HRPayrollPeriodType[]>(initialMockPayrollPeriods.map(convertNulls));

  const create = (item: Omit<HRPayrollPeriodType, 'id'>) => {
    const newItem = { ...item, id: Date.now() };
    setData(prev => [...prev, newItem]);
    return newItem;
  };

  const read = () => data;

  const update = (updated: HRPayrollPeriodType) => {
    setData(prev => prev.map(item => item.id === updated.id ? updated : item));
  };

  const remove = (id: number) => {
    setData(prev => prev.filter(item => item.id !== id));
  };

  return { data, create, read, update, remove };
}
