// ABOUTME: Provides a global provider hook for HR Payslips with full CRUD logic.
// ABOUTME: Used for managing payslips in the HR module.

import { useState } from 'react';
import { HRPayslipType } from './types';
import { initialMockPayslips } from './mockData';

export const isGlobalProvider = true;

const convertNulls = (item: any) => ({
  ...item,
  gross_salary: item.gross_salary === null ? undefined : item.gross_salary,
  total_deductions: item.total_deductions === null ? undefined : item.total_deductions,
  net_salary: item.net_salary === null ? undefined : item.net_salary,
  status: item.status === null ? undefined : item.status,
  processed_at: item.processed_at === null ? undefined : item.processed_at,
  paid_at: item.paid_at === null ? undefined : item.paid_at,
});

export function usePayslipData() {
  const [data, setData] = useState<HRPayslipType[]>(initialMockPayslips.map(convertNulls));

  const create = (item: Omit<HRPayslipType, 'id'>) => {
    const newItem = { ...item, id: `PSLP${Date.now()}` };
    setData(prev => [...prev, newItem]);
    return newItem;
  };

  const read = () => data;

  const update = (updated: HRPayslipType) => {
    setData(prev => prev.map(item => item.id === updated.id ? updated : item));
  };

  const remove = (id: string) => {
    setData(prev => prev.filter(item => item.id !== id));
  };

  return { data, create, read, update, remove };
}
