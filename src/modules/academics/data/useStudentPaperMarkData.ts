// ABOUTME: Self-contained hook for studentpapermark data management
// ABOUTME: Provides CRUD operations for studentpapermark without depending on AppDataContext

import { initialMockStudentPaperMarks } from './mockData';
import { StudentPaperMark } from '@/core/types';
import { useState } from 'react';

export const useStudentPaperMarkData = () => {
  const [data, setData] = useState<StudentPaperMark[]>(initialMockStudentPaperMarks);

  const create = async (newItem: Partial<StudentPaperMark>) => {
    const newDataItem: StudentPaperMark = {
      ...newItem,
      id: String(Date.now()),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    } as StudentPaperMark;
    setData((prev: StudentPaperMark[]) => [...prev, newDataItem]);
    return newDataItem;
  };

  const update = async (id: string, updatedData: Partial<StudentPaperMark>) => {
    setData((prev: StudentPaperMark[]) => prev.map((item: StudentPaperMark) => 
      item.id === id 
        ? { ...item, ...updatedData, updated_at: new Date().toISOString() }
        : item
    ));
  };

  const remove = async (id: string) => {
    setData((prev: StudentPaperMark[]) => prev.filter((item: StudentPaperMark) => item.id !== id));
  };

  return {
    data,
    create,
    update,
    remove
  };
};
