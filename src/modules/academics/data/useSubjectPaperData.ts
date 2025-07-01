// ABOUTME: Global provider hook for SubjectPaper entity with full CRUD using mock data.
// ABOUTME: Used for modular, plugin-ready data access across the system.

import { useState } from 'react';
import { SubjectPaper } from '../../../core/types';
import { initialMockSubjectPapers } from './mockData';

export const isGlobalProvider = true;

export function useSubjectPaperData() {
  const [subjectPapers, setSubjectPapers] = useState<SubjectPaper[]>(initialMockSubjectPapers);

  const addSubjectPaper = (data: Omit<SubjectPaper, 'id'>) => {
    const newSubjectPaper: SubjectPaper = {
      ...data,
      id: Date.now(),
    };
    setSubjectPapers(prev => [...prev, newSubjectPaper]);
    return newSubjectPaper;
  };

  const updateSubjectPaper = (updated: SubjectPaper) => {
    setSubjectPapers(prev => prev.map(s => s.id === updated.id ? { ...updated } : s));
    return updated;
  };

  const deleteSubjectPaper = (id: number) => {
    setSubjectPapers(prev => prev.filter(s => s.id !== id));
  };

  return {
    subjectPapers,
    addSubjectPaper,
    updateSubjectPaper,
    deleteSubjectPaper,
  };
} 