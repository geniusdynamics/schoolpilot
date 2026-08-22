// ABOUTME: Self-contained hook for exampapersetting data management
// ABOUTME: Provides CRUD operations for exampapersetting without depending on AppDataContext

import { initialMockExamPaperSettings } from './mockData';
import { ExamPaperSetting } from '@/core/types';
import { useState } from 'react';

export const useExamPaperSettingData = () => {
  const [data, setData] = useState<ExamPaperSetting[]>(initialMockExamPaperSettings);

  const create = async (newItem: Partial<ExamPaperSetting>) => {
    const newDataItem: ExamPaperSetting = {
      ...newItem,
      id: String(Date.now()),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    } as ExamPaperSetting;
    setData((prev: ExamPaperSetting[]) => [...prev, newDataItem]);
    return newDataItem;
  };

  const update = async (id: string, updatedData: Partial<ExamPaperSetting>) => {
    setData((prev: ExamPaperSetting[]) => prev.map((item: ExamPaperSetting) => 
      item.id === id 
        ? { ...item, ...updatedData, updated_at: new Date().toISOString() }
        : item
    ));
  };

  const remove = async (id: string) => {
    setData((prev: ExamPaperSetting[]) => prev.filter((item: ExamPaperSetting) => item.id !== id));
  };

  return {
    data,
    create,
    update,
    remove
  };
};
