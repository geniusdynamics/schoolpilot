// ABOUTME: Self-contained hook for classsubjectallocation data management
// ABOUTME: Provides CRUD operations for classsubjectallocation without depending on AppDataContext

import { initialMockClassSubjectAllocations } from './mockData';
import { ClassSubjectAllocation } from '@/core/types';
import { useState } from 'react';

export const useClassSubjectAllocationData = () => {
  const [data, setData] = useState<ClassSubjectAllocation[]>(initialMockClassSubjectAllocations);

  const create = async (newItem: Partial<ClassSubjectAllocation>) => {
    const newDataItem: ClassSubjectAllocation = {
      ...newItem,
      id: String(Date.now()),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    } as ClassSubjectAllocation;
    setData((prev: ClassSubjectAllocation[]) => [...prev, newDataItem]);
    return newDataItem;
  };

  const update = async (id: string, updatedData: Partial<ClassSubjectAllocation>) => {
    setData((prev: ClassSubjectAllocation[]) => prev.map((item: ClassSubjectAllocation) => 
      item.id === id 
        ? { ...item, ...updatedData, updated_at: new Date().toISOString() }
        : item
    ));
  };

  const remove = async (id: string) => {
    setData((prev: ClassSubjectAllocation[]) => prev.filter((item: ClassSubjectAllocation) => item.id !== id));
  };

  return {
    data,
    create,
    update,
    remove
  };
};
