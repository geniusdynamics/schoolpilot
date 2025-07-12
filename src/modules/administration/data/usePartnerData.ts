// ABOUTME: Self-contained hook for partner data management
// ABOUTME: Provides CRUD operations for partner without depending on AppDataContext

import { useState, useEffect } from 'react';
import { initialMockPartners } from '../../administration/data/mockData';
import { Partner } from '../../../core/types';

export const usePartnerData = () => {
  const [data, setData] = useState<Partner[]>(initialMockPartners);

  const create = async (newItem: Partial<Partner>) => {
    const newDataItem: Partner = {
      ...newItem,
      id: Date.now(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    } as Partner;
    setData((prev: Partner[]) => [...prev, newDataItem]);
    return newDataItem;
  };

  const update = async (id: number, updatedData: Partial<Partner>) => {
    setData((prev: Partner[]) => prev.map((item: Partner) => 
      item.id === id 
        ? { ...item, ...updatedData, updated_at: new Date().toISOString() }
        : item
    ));
  };

  const remove = async (id: number) => {
    setData((prev: Partner[]) => prev.filter((item: Partner) => item.id !== id));
  };

  return {
    data,
    create,
    update,
    remove
  };
};
