// ABOUTME: Global provider hook for Class entity with full CRUD using mock data.
// ABOUTME: Used for modular, plugin-ready data access across the system.

import { useState } from 'react';
import { Class } from '../../../core/types';
import { initialMockClasses } from './mockData';

export const isGlobalProvider = true;

export function useClassData() {
  const [classes, setClasses] = useState<Class[]>(initialMockClasses);

  const addClass = (data: Omit<Class, 'id'>) => {
    const newClass: Class = {
      ...data,
      id: Math.max(...classes.map(c => c.id), 0) + 1,
    };
    setClasses(prev => [...prev, newClass]);
    return newClass;
  };

  const updateClass = (updated: Class) => {
    setClasses(prev => prev.map(c => c.id === updated.id ? updated : c));
    return updated;
  };

  const deleteClass = (id: number) => {
    setClasses(prev => prev.filter(c => c.id !== id));
  };

  return {
    classes,
    addClass,
    updateClass,
    deleteClass,
  };
}