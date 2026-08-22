// ABOUTME: Self-contained hook for examsession data management
// ABOUTME: Provides CRUD operations for examsession without depending on AppDataContext

import { initialMockExamSessions } from './mockData';
import { ExamSession } from '@/core/types';
import { useState } from 'react';

export const useExamSessionData = () => {
  const [data, setData] = useState<ExamSession[]>(initialMockExamSessions);

  const create = async (newItem: Partial<ExamSession>) => {
    const newDataItem: ExamSession = {
      ...newItem,
      id: String(Date.now()),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    } as ExamSession;
    setData((prev: ExamSession[]) => [...prev, newDataItem]);
    return newDataItem;
  };

  const update = async (id: string, updatedData: Partial<ExamSession>) => {
    setData((prev: ExamSession[]) => prev.map((item: ExamSession) => 
      item.id === id 
        ? { ...item, ...updatedData, updated_at: new Date().toISOString() }
        : item
    ));
  };

  const remove = async (id: string) => {
    setData((prev: ExamSession[]) => prev.filter((item: ExamSession) => item.id !== id));
  };

  return {
    data,
    create,
    update,
    remove
  };
};
