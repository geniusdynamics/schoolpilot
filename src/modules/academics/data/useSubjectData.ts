// ABOUTME: Global provider hook for Subject entity with full CRUD using mock data.
// ABOUTME: Used for modular, plugin-ready data access across the system.

import { useState } from 'react';
import { Subject } from '../../../core/types';
import { initialMockSubjects } from './mockData';

export const isGlobalProvider = true;

export function useSubjectData() {
  const [subjects, setSubjects] = useState<Subject[]>(initialMockSubjects);

  const addSubject = (data: Omit<Subject, 'id'>) => {
    const newSubject: Subject = {
      ...data,
      id: Date.now(),
    };
    setSubjects(prev => [...prev, newSubject]);
    return newSubject;
  };

  const updateSubject = (updated: Subject) => {
    setSubjects(prev => prev.map(s => s.id === updated.id ? { ...updated } : s));
    return updated;
  };

  const deleteSubject = (id: number) => {
    setSubjects(prev => prev.filter(s => s.id !== id));
  };

  return {
    subjects,
    addSubject,
    updateSubject,
    deleteSubject,
  };
} 