// ABOUTME: Self-contained hook for designation data management
// ABOUTME: Provides CRUD operations for designation without depending on AppDataContext

import { useState, useEffect } from 'react';
import { initialMockDesignations } from '../../administration/data/mockData';
import { Designation } from '../../../core/types';

export const useDesignationData = () => {
  const [data, setData] = useState<Designation[]>(initialMockDesignations);

  const create = async (newItem: Partial<Designation>) => {
    const newDataItem: Designation = {
      ...newItem,
      id: Date.now(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    } as Designation;
    setData((prev: Designation[]) => [...prev, newDataItem]);
    return newDataItem;
  };

  const update = async (id: number, updatedData: Partial<Designation>) => {
    setData((prev: Designation[]) => prev.map((item: Designation) => 
      item.id === id 
        ? { ...item, ...updatedData, updated_at: new Date().toISOString() }
        : item
    ));
  };

  const remove = async (id: number) => {
    setData((prev: Designation[]) => prev.filter((item: Designation) => item.id !== id));
  };

  return {
    data,
    create,
    update,
    remove
  };
};
