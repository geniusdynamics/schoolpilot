// ABOUTME: Self-contained hook for requisition data management
// ABOUTME: Provides CRUD operations for requisition without depending on AppDataContext

import { useState, useEffect } from 'react';
import { initialMockRequisitions } from './mockData';
import { Requisition } from '@/core/types';

export const useRequisitionData = () => {
  const [data, setData] = useState<Requisition[]>(initialMockRequisitions);

  const create = async (newItem: Partial<Requisition>) => {
    const newDataItem: Requisition = {
      ...newItem,
      id: Date.now(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    } as Requisition;
    setData((prev: Requisition[]) => [...prev, newDataItem]);
    return newDataItem;
  };

  const update = async (id: number, updatedData: Partial<Requisition>) => {
    setData((prev: Requisition[]) => prev.map((item: Requisition) => 
      item.id === id 
        ? { ...item, ...updatedData, updated_at: new Date().toISOString() }
        : item
    ));
  };

  const remove = async (id: number) => {
    setData((prev: Requisition[]) => prev.filter((item: Requisition) => item.id !== id));
  };

  return {
    data,
    create,
    update,
    remove
  };
};
