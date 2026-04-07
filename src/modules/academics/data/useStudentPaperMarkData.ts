// ABOUTME: Self-contained hook for studentpapermark data management
// ABOUTME: Provides CRUD operations for studentpapermark without depending on AppDataContext

import { useState, useEffect } from 'react';
import { initialMockStudentPaperMarks } from './mockData';
import { StudentPaperMark } from '@/core/types';

export const useStudentPaperMarkData = () => {
  const [data, setData] = useState<StudentPaperMark[]>(initialMockStudentPaperMarks);

  const create = async (newItem: Partial<StudentPaperMark>) => {
    const newDataItem: StudentPaperMark = {
      ...newItem,
      id: Date.now(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    } as StudentPaperMark;
    setData((prev: StudentPaperMark[]) => [...prev, newDataItem]);
    return newDataItem;
  };

  const update = async (id: number, updatedData: Partial<StudentPaperMark>) => {
    setData((prev: StudentPaperMark[]) => prev.map((item: StudentPaperMark) => 
      item.id === id 
        ? { ...item, ...updatedData, updated_at: new Date().toISOString() }
        : item
    ));
  };

  const remove = async (id: number) => {
    setData((prev: StudentPaperMark[]) => prev.filter((item: StudentPaperMark) => item.id !== id));
  };

  return {
    data,
    create,
    update,
    remove
  };
};
