// ABOUTME: Self-contained hook for subjectpaper data management
// ABOUTME: Provides CRUD operations for subjectpaper without depending on AppDataContext

import { initialMockSubjectPapers } from './mockData';
import { SubjectPaper } from '@/core/types';
import { useState } from 'react';

export const useSubjectPaperData = () => {
  const [data, setData] = useState<SubjectPaper[]>(initialMockSubjectPapers);

  const create = async (newItem: Partial<SubjectPaper>) => {
    const newDataItem: SubjectPaper = {
      ...newItem,
      id: Date.now(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    } as SubjectPaper;
    setData((prev: SubjectPaper[]) => [...prev, newDataItem]);
    return newDataItem;
  };

  const update = async (id: number, updatedData: Partial<SubjectPaper>) => {
    setData((prev: SubjectPaper[]) => prev.map((item: SubjectPaper) => 
      item.id === id 
        ? { ...item, ...updatedData, updated_at: new Date().toISOString() }
        : item
    ));
  };

  const remove = async (id: number) => {
    setData((prev: SubjectPaper[]) => prev.filter((item: SubjectPaper) => item.id !== id));
  };

  return {
    data,
    create,
    update,
    remove
  };
};
