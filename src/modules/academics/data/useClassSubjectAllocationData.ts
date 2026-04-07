// ABOUTME: Self-contained hook for classsubjectallocation data management
// ABOUTME: Provides CRUD operations for classsubjectallocation without depending on AppDataContext

import { useState, useEffect } from 'react';
import { initialMockClassSubjectAllocations } from './mockData';
import { ClassSubjectAllocation } from '@/core/types';

export const useClassSubjectAllocationData = () => {
  const [data, setData] = useState<ClassSubjectAllocation[]>(initialMockClassSubjectAllocations);

  const create = async (newItem: Partial<ClassSubjectAllocation>) => {
    const newDataItem: ClassSubjectAllocation = {
      ...newItem,
      id: Date.now(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    } as ClassSubjectAllocation;
    setData((prev: ClassSubjectAllocation[]) => [...prev, newDataItem]);
    return newDataItem;
  };

  const update = async (id: number, updatedData: Partial<ClassSubjectAllocation>) => {
    setData((prev: ClassSubjectAllocation[]) => prev.map((item: ClassSubjectAllocation) => 
      item.id === id 
        ? { ...item, ...updatedData, updated_at: new Date().toISOString() }
        : item
    ));
  };

  const remove = async (id: number) => {
    setData((prev: ClassSubjectAllocation[]) => prev.filter((item: ClassSubjectAllocation) => item.id !== id));
  };

  return {
    data,
    create,
    update,
    remove
  };
};
