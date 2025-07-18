// ABOUTME: Self-contained hook for templatecomm data management
// ABOUTME: Provides CRUD operations for templatecomm without depending on AppDataContext

import { useState, useEffect } from 'react';
import { initialMockTemplateComms } from '../../administration/data/mockData';
import { TemplateComm } from '../../../core/types';

export const useTemplateCommData = () => {
  const [data, setData] = useState<TemplateComm[]>(initialMockTemplateComms);

  const create = async (newItem: Partial<TemplateComm>) => {
    const newDataItem: TemplateComm = {
      ...newItem,
      id: Date.now(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    } as TemplateComm;
    setData((prev: TemplateComm[]) => [...prev, newDataItem]);
    return newDataItem;
  };

  const update = async (id: number, updatedData: Partial<TemplateComm>) => {
    setData((prev: TemplateComm[]) => prev.map((item: TemplateComm) => 
      item.id === id 
        ? { ...item, ...updatedData, updated_at: new Date().toISOString() }
        : item
    ));
  };

  const remove = async (id: number) => {
    setData((prev: TemplateComm[]) => prev.filter((item: TemplateComm) => item.id !== id));
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
