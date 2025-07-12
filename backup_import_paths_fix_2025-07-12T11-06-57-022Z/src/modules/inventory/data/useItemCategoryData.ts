// ABOUTME: Self-contained hook for itemcategory data management
// ABOUTME: Provides CRUD operations for itemcategory without depending on AppDataContext

import { useState, useEffect } from 'react';
import { initialMockItemCategories } from '../../administration/data/mockData';
import { ItemCategory } from '../../../core/types';

export const useItemCategoryData = () => {
  const [data, setData] = useState<ItemCategory[]>(initialMockItemCategories);

  const create = async (newItem: Partial<ItemCategory>) => {
    const newDataItem: ItemCategory = {
      ...newItem,
      id: Date.now(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    } as ItemCategory;
    setData((prev: ItemCategory[]) => [...prev, newDataItem]);
    return newDataItem;
  };

  const update = async (id: number, updatedData: Partial<ItemCategory>) => {
    setData((prev: ItemCategory[]) => prev.map((item: ItemCategory) => 
      item.id === id 
        ? { ...item, ...updatedData, updated_at: new Date().toISOString() }
        : item
    ));
  };

  const remove = async (id: number) => {
    setData((prev: ItemCategory[]) => prev.filter((item: ItemCategory) => item.id !== id));
  };

  return {
    data,
    create,
    update,
    remove
  };
};
