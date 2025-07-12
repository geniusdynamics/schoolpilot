// ABOUTME: Self-contained hook for item data management
// ABOUTME: Provides CRUD operations for item without depending on AppDataContext

import { useState, useEffect } from 'react';
import { initialMockItems } from '../../inventory/data/mockData';
import { Item } from '../../../core/types';

export const useItemData = () => {
  const [data, setData] = useState<Item[]>(initialMockItems);

  const create = async (newItem: Partial<Item>) => {
    const newDataItem: Item = {
      ...newItem,
      id: Date.now(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    } as Item;
    setData((prev: Item[]) => [...prev, newDataItem]);
    return newDataItem;
  };

  const update = async (id: number, updatedData: Partial<Item>) => {
    setData((prev: Item[]) => prev.map((item: Item) => 
      item.id === id 
        ? { ...item, ...updatedData, updated_at: new Date().toISOString() }
        : item
    ));
  };

  const remove = async (id: number) => {
    setData((prev: Item[]) => prev.filter((item: Item) => item.id !== id));
  };

  return {
    data,
    create,
    update,
    remove
  };
};
