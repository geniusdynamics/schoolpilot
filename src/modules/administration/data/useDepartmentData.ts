// ABOUTME: Self-contained hook for department data management
// ABOUTME: Provides CRUD operations for department without depending on AppDataContext

import { useState, useEffect } from 'react';
import { initialMockDepartments } from '../../administration/data/mockData';
import { Department } from '../../../core/types';

export const useDepartmentData = () => {
  const [data, setData] = useState<Department[]>(initialMockDepartments);

  const create = async (newItem: Partial<Department>) => {
    const newDataItem: Department = {
      ...newItem,
      id: Date.now(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    } as Department;
    setData((prev: Department[]) => [...prev, newDataItem]);
    return newDataItem;
  };

  const update = async (id: number, updatedData: Partial<Department>) => {
    setData((prev: Department[]) => prev.map((item: Department) => 
      item.id === id 
        ? { ...item, ...updatedData, updated_at: new Date().toISOString() }
        : item
    ));
  };

  const remove = async (id: number) => {
    setData((prev: Department[]) => prev.filter((item: Department) => item.id !== id));
  };

  return {
    data,
    create,
    update,
    remove
  };
};
