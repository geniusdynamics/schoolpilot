// ABOUTME: Self-contained hook for studentexamresult data management
// ABOUTME: Provides CRUD operations for studentexamresult without depending on AppDataContext

import { initialMockStudentExamResults } from './mockData';
import { StudentExamResult } from '@/core/types';
import { useState } from 'react';

export const useStudentExamResultData = () => {
  const [data, setData] = useState<StudentExamResult[]>(initialMockStudentExamResults);

  const create = async (newItem: Partial<StudentExamResult>) => {
    const newDataItem: StudentExamResult = {
      ...newItem,
      id: String(Date.now()),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    } as StudentExamResult;
    setData((prev: StudentExamResult[]) => [...prev, newDataItem]);
    return newDataItem;
  };

  const update = async (id: string, updatedData: Partial<StudentExamResult>) => {
    setData((prev: StudentExamResult[]) => prev.map((item: StudentExamResult) => 
      item.id === id 
        ? { ...item, ...updatedData, updated_at: new Date().toISOString() }
        : item
    ));
  };

  const remove = async (id: string) => {
    setData((prev: StudentExamResult[]) => prev.filter((item: StudentExamResult) => item.id !== id));
  };

  return {
    data,
    create,
    update,
    remove
  };
};
