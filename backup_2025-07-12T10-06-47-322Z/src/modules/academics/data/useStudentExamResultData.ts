// ABOUTME: Global provider hook for StudentExamResult entity with full CRUD using mock data.
// ABOUTME: Used for modular, plugin-ready data access across the system.

import { useState } from 'react';
import { StudentExamResultWithDetails } from '../../../core/types';
import { initialMockStudentExamResults } from './mockData';

export const isGlobalProvider = true;

export function useStudentExamResultData() {
  const [studentExamResults, setStudentExamResults] = useState<StudentExamResultWithDetails[]>(initialMockStudentExamResults);

  const addStudentExamResult = (data: Omit<StudentExamResultWithDetails, 'id'>) => {
    const newResult: StudentExamResultWithDetails = {
      ...data,
      id: `SER${Date.now()}`,
    };
    setStudentExamResults(prev => [...prev, newResult]);
    return newResult;
  };

  const updateStudentExamResult = (updated: StudentExamResultWithDetails) => {
    setStudentExamResults(prev => prev.map(r => r.id === updated.id ? { ...updated } : r));
    return updated;
  };

  const deleteStudentExamResult = (id: string) => {
    setStudentExamResults(prev => prev.filter(r => r.id !== id));
  };

  return {
    studentExamResults,
    addStudentExamResult,
    updateStudentExamResult,
    deleteStudentExamResult,
  };
} 