// ABOUTME: Global provider hook for AcademicYearStructure entity with full CRUD using mock data.
// ABOUTME: Used for modular, plugin-ready data access across the system.

import { useState } from 'react';
import { AcademicYearStructure } from '../../../core/types';
import { initialMockAcademicYearStructures } from './mockData';

export const isGlobalProvider = true;

export function useAcademicYearStructureData() {
  const [academicYearStructures, setAcademicYearStructures] = useState<AcademicYearStructure[]>(initialMockAcademicYearStructures);

  const addAcademicYearStructure = (data: Omit<AcademicYearStructure, 'id'>) => {
    const newStructure: AcademicYearStructure = {
      ...data,
      id: Date.now().toString(),
    };
    setAcademicYearStructures(prev => [...prev, newStructure]);
    return newStructure;
  };

  const updateAcademicYearStructure = (updated: AcademicYearStructure) => {
    setAcademicYearStructures(prev => prev.map(s => s.id === updated.id ? { ...updated } : s));
    return updated;
  };

  const deleteAcademicYearStructure = (id: string) => {
    setAcademicYearStructures(prev => prev.filter(s => s.id !== id));
  };

  return {
    academicYearStructures,
    addAcademicYearStructure,
    updateAcademicYearStructure,
    deleteAcademicYearStructure,
  };
} 