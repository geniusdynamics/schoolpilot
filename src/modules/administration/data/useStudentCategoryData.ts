// ABOUTME: Self-contained hook for studentcategory data management
// ABOUTME: Provides CRUD operations for studentcategory without depending on AppDataContext

import { useState, useEffect } from 'react';
import { initialMockStudentCategories } from '../../administration/data/mockData';
import { StudentCategory } from '@/core/types';

export const useStudentCategoryData = () => {
  const [data, setData] = useState<StudentCategory[]>(initialMockStudentCategories);

  const create = async (newItem: Partial<StudentCategory>) => {
    const newDataItem: StudentCategory = {
      ...newItem,
      id: Date.now(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    } as StudentCategory;
    setData((prev: StudentCategory[]) => [...prev, newDataItem]);
    return newDataItem;
  };

  const update = async (id: number, updatedData: Partial<StudentCategory>) => {
    setData((prev: StudentCategory[]) => prev.map((item: StudentCategory) => 
      item.id === id 
        ? { ...item, ...updatedData, updated_at: new Date().toISOString() }
        : item
    ));
  };

  const remove = async (id: number) => {
    setData((prev: StudentCategory[]) => prev.filter((item: StudentCategory) => item.id !== id));
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
