// ABOUTME: Provides CRUD and data provider logic for StudentSubjectEnrollment in Academics.
// ABOUTME: Exports a global provider hook for system-wide use.
import { useState } from 'react';
import { AcademicsStudentSubjectEnrollmentType } from './types';
import { initialMockStudentSubjectEnrollments } from './mockData';

export const isGlobalProvider = true;

export function useStudentSubjectEnrollmentData() {
  const [data, setData] = useState<AcademicsStudentSubjectEnrollmentType[]>(initialMockStudentSubjectEnrollments);

  const create = (item: AcademicsStudentSubjectEnrollmentType) => setData(prev => [...prev, item]);
  const update = (id: string, updates: Partial<AcademicsStudentSubjectEnrollmentType>) => setData(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item));
  const remove = (id: string) => setData(prev => prev.filter(item => item.id !== id));
  const get = (id: string) => data.find(item => item.id === id);
  return { data, create, update, remove, get };
} 