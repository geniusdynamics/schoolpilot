// ABOUTME: Self-contained hook for itemcategory data management
// ABOUTME: Provides CRUD operations for itemcategory without depending on AppDataContext

import { useState, useEffect } from 'react';
import { initialMockItemCategoriesInv } from './mockData';
import { ItemCategoryInv } from '../../../core/types';

export const useItemCategoryData = () => {
  const [data, setData] = useState<ItemCategoryInv[]>(initialMockItemCategoriesInv);

  const create = async (newItem: Partial<ItemCategoryInv>) => {
    const newDataItem: ItemCategoryInv = {
      ...newItem,
      id: Date.now(),
    } as ItemCategoryInv;
    setData((prev: ItemCategoryInv[]) => [...prev, newDataItem]);
    return newDataItem;
  };

  const update = async (id: number, updatedData: Partial<ItemCategoryInv>) => {
    setData((prev: ItemCategoryInv[]) => prev.map((item: ItemCategoryInv) => 
      item.id === id 
        ? { ...item, ...updatedData }
        : item
    ));
  };

  const remove = async (id: number) => {
    setData((prev: ItemCategoryInv[]) => prev.filter((item: ItemCategoryInv) => item.id !== id));
  };

  return {
    data,
    create,
    update,
    remove
  };
};
