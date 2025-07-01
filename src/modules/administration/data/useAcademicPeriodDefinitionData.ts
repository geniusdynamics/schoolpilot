// ABOUTME: Global provider hook for AcademicPeriodDefinition entity with full CRUD using mock data.
// ABOUTME: Used for modular, plugin-ready data access across the system.

import { useState } from 'react';
import { AcademicPeriodDefinition } from '../../../core/types';
import { initialMockAcademicPeriodDefinitions } from './mockData';

export const isGlobalProvider = true;

export function useAcademicPeriodDefinitionData() {
  const [academicPeriodDefinitions, setAcademicPeriodDefinitions] = useState<AcademicPeriodDefinition[]>(initialMockAcademicPeriodDefinitions);

  const addAcademicPeriodDefinition = (data: Omit<AcademicPeriodDefinition, 'id'>) => {
    const newDef: AcademicPeriodDefinition = {
      ...data,
      id: Date.now(),
    };
    setAcademicPeriodDefinitions(prev => [...prev, newDef]);
    return newDef;
  };

  const updateAcademicPeriodDefinition = (updated: AcademicPeriodDefinition) => {
    setAcademicPeriodDefinitions(prev => prev.map(d => d.id === updated.id ? { ...updated } : d));
    return updated;
  };

  const deleteAcademicPeriodDefinition = (id: number) => {
    setAcademicPeriodDefinitions(prev => prev.filter(d => d.id !== id));
  };

  return {
    academicPeriodDefinitions,
    addAcademicPeriodDefinition,
    updateAcademicPeriodDefinition,
    deleteAcademicPeriodDefinition,
  };
} 