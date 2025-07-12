// ABOUTME: Self-contained hook for menu data management
// ABOUTME: Provides CRUD operations for menu without depending on AppDataContext

import { useState, useEffect } from 'react';
import { initialMockMenus } from '../../administration/data/mockData';
import { Menu } from '../../../core/types';

export const useMenuData = () => {
  const [data, setData] = useState<Menu[]>(initialMockMenus);

  const create = async (newItem: Partial<Menu>) => {
    const newDataItem: Menu = {
      ...newItem,
      id: Date.now(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    } as Menu;
    setData((prev: Menu[]) => [...prev, newDataItem]);
    return newDataItem;
  };

  const update = async (id: number, updatedData: Partial<Menu>) => {
    setData((prev: Menu[]) => prev.map((item: Menu) => 
      item.id === id 
        ? { ...item, ...updatedData, updated_at: new Date().toISOString() }
        : item
    ));
  };

  const remove = async (id: number) => {
    setData((prev: Menu[]) => prev.filter((item: Menu) => item.id !== id));
  };

  return {
    data,
    create,
    update,
    remove
  };
};
