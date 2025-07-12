// ABOUTME: Self-contained hook for examsession data management
// ABOUTME: Provides CRUD operations for examsession without depending on AppDataContext

import { useState, useEffect } from 'react';
import { initialMockExamSessions } from '../../administration/data/mockData';
import { ExamSession } from '../../../core/types';

export const useExamSessionData = () => {
  const [data, setData] = useState<ExamSession[]>(initialMockExamSessions);

  const create = async (newItem: Partial<ExamSession>) => {
    const newDataItem: ExamSession = {
      ...newItem,
      id: Date.now(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    } as ExamSession;
    setData((prev: ExamSession[]) => [...prev, newDataItem]);
    return newDataItem;
  };

  const update = async (id: number, updatedData: Partial<ExamSession>) => {
    setData((prev: ExamSession[]) => prev.map((item: ExamSession) => 
      item.id === id 
        ? { ...item, ...updatedData, updated_at: new Date().toISOString() }
        : item
    ));
  };

  const remove = async (id: number) => {
    setData((prev: ExamSession[]) => prev.filter((item: ExamSession) => item.id !== id));
  };

  return {
    data,
    create,
    update,
    remove
  };
};
