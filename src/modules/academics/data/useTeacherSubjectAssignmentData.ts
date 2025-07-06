// ABOUTME: Provides CRUD and data provider logic for TeacherSubjectAssignment in Academics.
// ABOUTME: Exports a global provider hook for system-wide use.

import { useState } from 'react';
import { AcademicsTeacherSubjectAssignmentType } from './types';
import { initialMockTeacherSubjectAssignments } from './mockData';

export const isGlobalProvider = true;

export function useTeacherSubjectAssignmentData() {
  const [data, setData] = useState<AcademicsTeacherSubjectAssignmentType[]>(initialMockTeacherSubjectAssignments);

  const create = (item: AcademicsTeacherSubjectAssignmentType) => setData(prev => [...prev, item]);
  const update = (id: string, updates: Partial<AcademicsTeacherSubjectAssignmentType>) => setData(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item));
  const remove = (id: string) => setData(prev => prev.filter(item => item.id !== id));
  const get = (id: string) => data.find(item => item.id === id);
  return { data, create, update, remove, get };
} 