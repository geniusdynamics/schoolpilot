// ABOUTME: Self-contained hook for subject data management
// ABOUTME: Provides CRUD operations for subject without depending on AppDataContext

import { useState, useEffect } from 'react';
import { initialMockSubjects } from '../../administration/data/mockData';
import { Subject } from '../../../core/types';

export const useSubjectData = () => {
  const [data, setData] = useState<Subject[]>(initialMockSubjects);

  const create = async (newItem: Partial<Subject>) => {
    const newDataItem: Subject = {
      ...newItem,
      id: Date.now(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    } as Subject;
    setData((prev: Subject[]) => [...prev, newDataItem]);
    return newDataItem;
  };

  const update = async (id: number, updatedData: Partial<Subject>) => {
    setData((prev: Subject[]) => prev.map((item: Subject) => 
      item.id === id 
        ? { ...item, ...updatedData, updated_at: new Date().toISOString() }
        : item
    ));
  };

  const remove = async (id: number) => {
    setData((prev: Subject[]) => prev.filter((item: Subject) => item.id !== id));
  };

  return {
    data,
    create,
    update,
    remove
  };
};
