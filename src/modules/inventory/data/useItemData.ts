// ABOUTME: Self-contained hook for item data management
// ABOUTME: Provides CRUD operations for item without depending on AppDataContext

import { initialMockItemsInv } from './mockData';
import { ItemInv } from '@/core/types';
import { useState } from 'react';

export const useItemData = () => {
  const [data, setData] = useState<ItemInv[]>(initialMockItemsInv);

  const create = async (newItem: Partial<ItemInv>) => {
    const newDataItem: ItemInv = {
      ...newItem,
      id: Date.now().toString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    } as ItemInv;
    setData((prev: ItemInv[]) => [...prev, newDataItem]);
    return newDataItem;
  };

  const update = async (id: string, updatedData: Partial<ItemInv>) => {
    setData((prev: ItemInv[]) => prev.map((item: ItemInv) => 
      item.id === id 
        ? { ...item, ...updatedData, updated_at: new Date().toISOString() }
        : item
    ));
  };

  const remove = async (id: string) => {
    setData((prev: ItemInv[]) => prev.filter((item: ItemInv) => item.id !== id));
  };

  return {
    data,
    create,
    update,
    remove
  };
};
