// ABOUTME: Self-contained hook for class data management
// ABOUTME: Provides CRUD operations for class without depending on AppDataContext

import { useState, useEffect } from 'react';
import { initialMockClasses } from './mockData';
import { Class } from '../../../core/types';

export const useClassData = () => {
  const [data, setData] = useState<Class[]>(initialMockClasses);

  const create = async (newItem: Partial<Class>) => {
    const newDataItem: Class = {
      ...newItem,
      id: Date.now(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    } as Class;
    setData((prev: Class[]) => [...prev, newDataItem]);
    return newDataItem;
  };

  const update = async (id: number, updatedData: Partial<Class>) => {
    setData((prev: Class[]) => prev.map((item: Class) => 
      item.id === id 
        ? { ...item, ...updatedData, updated_at: new Date().toISOString() }
        : item
    ));
  };

  const remove = async (id: number) => {
    setData((prev: Class[]) => prev.filter((item: Class) => item.id !== id));
  };

  return {
    data,
    create,
    update,
    remove
  };
};

// Mark this as a global provider for cross-module use
export const isGlobalProvider = true;
