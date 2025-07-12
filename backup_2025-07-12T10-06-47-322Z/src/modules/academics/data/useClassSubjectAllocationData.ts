// ABOUTME: Global provider hook for ClassSubjectAllocation entity with full CRUD using mock data.
// ABOUTME: Used for modular, plugin-ready data access across the system.

import { useState } from 'react';
import { ClassSubjectAllocation } from '../../../core/types';
import { initialMockClassSubjectAllocations } from './mockData';

export const isGlobalProvider = true;

export function useClassSubjectAllocationData() {
  const [classSubjectAllocations, setClassSubjectAllocations] = useState<ClassSubjectAllocation[]>(initialMockClassSubjectAllocations);

  const addClassSubjectAllocation = (data: Omit<ClassSubjectAllocation, 'id'>) => {
    const newAllocation: ClassSubjectAllocation = {
      ...data,
      id: `CSA${Date.now()}`,
    };
    setClassSubjectAllocations(prev => [...prev, newAllocation]);
    return newAllocation;
  };

  const updateClassSubjectAllocation = (updated: ClassSubjectAllocation) => {
    setClassSubjectAllocations(prev => prev.map(a => a.id === updated.id ? { ...updated } : a));
    return updated;
  };

  const deleteClassSubjectAllocation = (id: string) => {
    setClassSubjectAllocations(prev => prev.filter(a => a.id !== id));
  };

  return {
    classSubjectAllocations,
    addClassSubjectAllocation,
    updateClassSubjectAllocation,
    deleteClassSubjectAllocation,
  };
} 