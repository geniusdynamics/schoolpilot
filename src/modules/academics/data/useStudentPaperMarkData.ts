// ABOUTME: Global provider hook for StudentPaperMark entity with full CRUD using mock data.
// ABOUTME: Used for modular, plugin-ready data access across the system.

import { useState } from 'react';
import { StudentPaperMark } from '../../../core/types';

export const isGlobalProvider = true;

export function useStudentPaperMarkData() {
  const [studentPaperMarks, setStudentPaperMarks] = useState<StudentPaperMark[]>([]);

  const addStudentPaperMark = (data: Omit<StudentPaperMark, 'id'>) => {
    const newMark: StudentPaperMark = {
      ...data,
      id: `SPM${Date.now()}`,
    };
    setStudentPaperMarks(prev => [...prev, newMark]);
    return newMark;
  };

  const updateStudentPaperMark = (updated: StudentPaperMark) => {
    setStudentPaperMarks(prev => prev.map(m => m.id === updated.id ? { ...updated } : m));
    return updated;
  };

  const deleteStudentPaperMark = (id: string) => {
    setStudentPaperMarks(prev => prev.filter(m => m.id !== id));
  };

  return {
    studentPaperMarks,
    addStudentPaperMark,
    updateStudentPaperMark,
    deleteStudentPaperMark,
  };
} 