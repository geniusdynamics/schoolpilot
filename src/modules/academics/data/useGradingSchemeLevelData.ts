// ABOUTME: Global provider hook for GradingSchemeLevel entity with full CRUD using mock data.
// ABOUTME: Used for modular, plugin-ready data access across the system.

import { useState } from 'react';
import { GradingSchemeLevel } from '../../../core/types';
import { initialMockGradingSchemes } from './mockData';

export const isGlobalProvider = true;

// Flatten all levels from all grading schemes
const initialMockGradingSchemeLevels: GradingSchemeLevel[] = initialMockGradingSchemes.flatMap(s => s.levels ?? []).filter((l): l is GradingSchemeLevel => !!l);

export function useGradingSchemeLevelData() {
  const [gradingSchemeLevels, setGradingSchemeLevels] = useState<GradingSchemeLevel[]>(initialMockGradingSchemeLevels);

  const addGradingSchemeLevel = (data: Omit<GradingSchemeLevel, 'id'>) => {
    const newLevel: GradingSchemeLevel = {
      ...data,
      id: Date.now(),
    };
    setGradingSchemeLevels(prev => [...prev, newLevel]);
    return newLevel;
  };

  const updateGradingSchemeLevel = (updated: GradingSchemeLevel) => {
    setGradingSchemeLevels(prev => prev.map(l => l.id === updated.id ? { ...updated } : l));
    return updated;
  };

  const deleteGradingSchemeLevel = (id: number) => {
    setGradingSchemeLevels(prev => prev.filter(l => l.id !== id));
  };

  return {
    gradingSchemeLevels,
    addGradingSchemeLevel,
    updateGradingSchemeLevel,
    deleteGradingSchemeLevel,
  };
} 