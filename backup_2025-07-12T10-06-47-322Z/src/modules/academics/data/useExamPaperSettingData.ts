// ABOUTME: Global provider hook for ExamPaperSetting entity with full CRUD using mock data.
// ABOUTME: Used for modular, plugin-ready data access across the system.

import { useState } from 'react';
import { ExamPaperSetting } from '../../../core/types';
import { initialMockExamPaperSettings } from './mockData';

export const isGlobalProvider = true;

export function useExamPaperSettingData() {
  const [examPaperSettings, setExamPaperSettings] = useState<ExamPaperSetting[]>(initialMockExamPaperSettings);

  const addExamPaperSetting = (data: Omit<ExamPaperSetting, 'id'>) => {
    const newSetting: ExamPaperSetting = {
      ...data,
      id: `EPS${Date.now()}`,
    };
    setExamPaperSettings(prev => [...prev, newSetting]);
    return newSetting;
  };

  const updateExamPaperSetting = (updated: ExamPaperSetting) => {
    setExamPaperSettings(prev => prev.map(e => e.id === updated.id ? { ...updated } : e));
    return updated;
  };

  const deleteExamPaperSetting = (id: string) => {
    setExamPaperSettings(prev => prev.filter(e => e.id !== id));
  };

  return {
    examPaperSettings,
    addExamPaperSetting,
    updateExamPaperSetting,
    deleteExamPaperSetting,
  };
} 