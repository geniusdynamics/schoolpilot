// ABOUTME: Provides a global provider hook for HR Staff Salary Settings with full CRUD logic.
// ABOUTME: Used for managing staff salary settings in the HR module.

import { useState } from 'react';
import { HRStaffSalarySettingType } from './types';
import { initialMockStaffSalarySettings } from './mockData';

export const isGlobalProvider = true;

const convertNulls = (item: any) => ({
  ...item,
  payment_bank: item.payment_bank === null ? undefined : item.payment_bank,
  bank_account_no: item.bank_account_no === null ? undefined : item.bank_account_no,
});

export function useStaffSalarySettingData() {
  const [data, setData] = useState<HRStaffSalarySettingType[]>(initialMockStaffSalarySettings.map(convertNulls));

  const create = (item: Omit<HRStaffSalarySettingType, 'id'>) => {
    const newItem = { ...item, id: `SSS${Date.now()}` };
    setData(prev => [...prev, newItem]);
    return newItem;
  };

  const read = () => data;

  const update = (updated: HRStaffSalarySettingType) => {
    setData(prev => prev.map(item => item.id === updated.id ? updated : item));
  };

  const remove = (id: string) => {
    setData(prev => prev.filter(item => item.id !== id));
  };

  return { data, create, read, update, remove };
}
