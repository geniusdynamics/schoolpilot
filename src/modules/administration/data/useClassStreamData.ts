// ABOUTME: Self-contained hook for classstream data management
// ABOUTME: Provides CRUD operations for classstream without depending on AppDataContext

import { initialMockClassStreams } from './mockData';
import { ClassStream } from '@/core/types';
import { useState } from 'react';

export const useClassStreamData = () => {
  const [data, setData] = useState<ClassStream[]>(initialMockClassStreams);

  const create = async (newItem: Partial<ClassStream>) => {
    const newDataItem: ClassStream = {
      ...newItem,
      id: Date.now(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    } as ClassStream;
    setData((prev: ClassStream[]) => [...prev, newDataItem]);
    return newDataItem;
  };

  const update = async (id: number, updatedData: Partial<ClassStream>) => {
    setData((prev: ClassStream[]) => prev.map((item: ClassStream) => 
      item.id === id 
        ? { ...item, ...updatedData, updated_at: new Date().toISOString() }
        : item
    ));
  };

  const remove = async (id: number) => {
    setData((prev: ClassStream[]) => prev.filter((item: ClassStream) => item.id !== id));
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
