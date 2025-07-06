// ABOUTME: Global provider hook for StudentCategory entity with full CRUD using mock data.
// ABOUTME: Used for modular, plugin-ready data access across the system.

import { useState } from 'react';
import { StudentCategory } from '../../../core/types';
import { initialMockStudentCategories } from './mockData';

export const isGlobalProvider = true;

export function useStudentCategoryData() {
  const [studentCategories, setStudentCategories] = useState<StudentCategory[]>(initialMockStudentCategories);

  const addStudentCategory = (data: Omit<StudentCategory, 'id'>) => {
    const newCategory: StudentCategory = {
      ...data,
      id: Date.now(),
    };
    setStudentCategories(prev => [...prev, newCategory]);
    return newCategory;
  };

  const updateStudentCategory = (updated: StudentCategory) => {
    setStudentCategories(prev => prev.map(c => c.id === updated.id ? { ...updated } : c));
    return updated;
  };

  const deleteStudentCategory = (id: number) => {
    setStudentCategories(prev => prev.filter(c => c.id !== id));
  };

  return {
    studentCategories,
    addStudentCategory,
    updateStudentCategory,
    deleteStudentCategory,
  };
} 