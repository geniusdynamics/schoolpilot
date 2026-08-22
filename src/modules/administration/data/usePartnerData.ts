// ABOUTME: Self-contained hook for partner data management
// ABOUTME: Provides CRUD operations for partner without depending on AppDataContext

import { initialMockPartners } from '../../administration/data/mockData';
import { AdminPartnerType } from './types';
import { useState } from 'react';

export const usePartnerData = () => {
  const [data, setData] = useState<AdminPartnerType[]>(initialMockPartners || []);

  const create = async (newItem: Omit<AdminPartnerType, 'id' | 'created_at' | 'updated_at'>) => {
    const newDataItem: AdminPartnerType = {
      ...newItem,
      id: Date.now().toString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    setData((prev: AdminPartnerType[]) => [...prev, newDataItem]);
    return newDataItem;
  };

  const update = async (updatedItem: AdminPartnerType) => {
    setData((prev: AdminPartnerType[]) => prev.map((item: AdminPartnerType) => 
      item.id === updatedItem.id 
        ? { ...updatedItem, updated_at: new Date().toISOString() }
        : item
    ));
  };

  const remove = async (id: string) => {
    setData((prev: AdminPartnerType[]) => prev.filter((item: AdminPartnerType) => item.id !== id));
  };

  return {
    data,
    create,
    update,
    remove
  };
};
