// ABOUTME: Self-contained hook for dormitory data management
// ABOUTME: Provides CRUD operations for dormitory without depending on AppDataContext

import { useState, useEffect } from 'react';
import { initialMockDormitories } from '../../administration/data/mockData';
import { Dormitory } from '../../../core/types';

export const useDormitoryData = () => {
  const [data, setData] = useState<Dormitory[]>(initialMockDormitories);

  const create = async (newItem: Partial<Dormitory>) => {
    const newDataItem: Dormitory = {
      ...newItem,
      id: Date.now(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    } as Dormitory;
    setData((prev: Dormitory[]) => [...prev, newDataItem]);
    return newDataItem;
  };

  const update = async (id: number, updatedData: Partial<Dormitory>) => {
    setData((prev: Dormitory[]) => prev.map((item: Dormitory) => 
      item.id === id 
        ? { ...item, ...updatedData, updated_at: new Date().toISOString() }
        : item
    ));
  };

  const remove = async (id: number) => {
    setData((prev: Dormitory[]) => prev.filter((item: Dormitory) => item.id !== id));
  };

  return {
    data,
    create,
    update,
    remove
  };
};
