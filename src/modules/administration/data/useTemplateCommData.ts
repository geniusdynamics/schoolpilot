// ABOUTME: Self-contained hook for templatecomm data management
// ABOUTME: Provides CRUD operations for templatecomm without depending on AppDataContext

import { useState, useEffect } from 'react';
import { initialMockTemplateComms } from '../../administration/data/mockData';
import { AdminTemplateCommType } from './types';

export const useTemplateCommData = () => {
  const [data, setData] = useState<AdminTemplateCommType[]>(initialMockTemplateComms);

  const create = async (newItem: Partial<AdminTemplateCommType>) => {
    const newDataItem: AdminTemplateCommType = {
      ...newItem,
      id: Date.now(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    } as AdminTemplateCommType;
    setData((prev: AdminTemplateCommType[]) => [...prev, newDataItem]);
    return newDataItem;
  };

  const update = async (id: number, updatedData: Partial<AdminTemplateCommType>) => {
    setData((prev: AdminTemplateCommType[]) => prev.map((item: AdminTemplateCommType) => 
      item.id === id 
        ? { ...item, ...updatedData, updated_at: new Date().toISOString() }
        : item
    ));
  };

  const remove = async (id: number) => {
    setData((prev: AdminTemplateCommType[]) => prev.filter((item: AdminTemplateCommType) => item.id !== id));
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
