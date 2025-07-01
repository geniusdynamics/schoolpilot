// ABOUTME: Global provider hook for GradingScheme entity with full CRUD using mock data.
// ABOUTME: Used for modular, plugin-ready data access across the system.

import { useState } from 'react';
import { GradingScheme } from '../../../core/types';
import { initialMockGradingSchemes } from './mockData';

export const isGlobalProvider = true;

export function useGradingSchemeData() {
  const [gradingSchemes, setGradingSchemes] = useState<GradingScheme[]>(initialMockGradingSchemes);

  const addGradingScheme = (data: Omit<GradingScheme, 'id'>) => {
    const newScheme: GradingScheme = {
      ...data,
      id: Date.now(),
    };
    setGradingSchemes(prev => [...prev, newScheme]);
    return newScheme;
  };

  const updateGradingScheme = (updated: GradingScheme) => {
    setGradingSchemes(prev => prev.map(g => g.id === updated.id ? { ...updated } : g));
    return updated;
  };

  const deleteGradingScheme = (id: number) => {
    setGradingSchemes(prev => prev.filter(g => g.id !== id));
  };

  return {
    gradingSchemes,
    addGradingScheme,
    updateGradingScheme,
    deleteGradingScheme,
  };
} 