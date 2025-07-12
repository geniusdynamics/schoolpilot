// ABOUTME: Global provider hook for ExamSession entity with full CRUD using mock data.
// ABOUTME: Used for modular, plugin-ready data access across the system.

import { useState } from 'react';
import { ExamSession } from '../../../core/types';
import { initialMockExamSessions } from './mockData';

export const isGlobalProvider = true;

export function useExamSessionData() {
  const [examSessions, setExamSessions] = useState<ExamSession[]>(initialMockExamSessions);

  const addExamSession = (data: Omit<ExamSession, 'id'>) => {
    const newExamSession: ExamSession = {
      ...data,
      id: `ES${Date.now()}`,
    };
    setExamSessions(prev => [...prev, newExamSession]);
    return newExamSession;
  };

  const updateExamSession = (updated: ExamSession) => {
    setExamSessions(prev => prev.map(e => e.id === updated.id ? { ...updated } : e));
    return updated;
  };

  const deleteExamSession = (id: string) => {
    setExamSessions(prev => prev.filter(e => e.id !== id));
  };

  return {
    examSessions,
    addExamSession,
    updateExamSession,
    deleteExamSession,
  };
} 