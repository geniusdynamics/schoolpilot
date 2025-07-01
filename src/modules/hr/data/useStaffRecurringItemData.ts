// ABOUTME: Provides a global provider hook for HR Staff Recurring Items with full CRUD logic.
// ABOUTME: Used for managing staff recurring items in the HR module.

import { useState } from 'react';
import { HRStaffRecurringItemType } from './types';
import { initialMockStaffRecurringItems } from './mockData';

export const isGlobalProvider = true;

const convertNulls = (item: any) => ({
  ...item,
  created_at: item.created_at === null ? undefined : item.created_at,
});

export function useStaffRecurringItemData() {
  const [data, setData] = useState<HRStaffRecurringItemType[]>(initialMockStaffRecurringItems.map(convertNulls));

  const create = (item: Omit<HRStaffRecurringItemType, 'id'>) => {
    const newItem = { ...item, id: `SRI${Date.now()}` };
    setData(prev => [...prev, newItem]);
    return newItem;
  };

  const read = () => data;

  const update = (updated: HRStaffRecurringItemType) => {
    setData(prev => prev.map(item => item.id === updated.id ? updated : item));
  };

  const remove = (id: string) => {
    setData(prev => prev.filter(item => item.id !== id));
  };

  return { data, create, read, update, remove };
}
