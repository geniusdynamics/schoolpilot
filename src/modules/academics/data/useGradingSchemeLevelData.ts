// ABOUTME: Self-contained hook for gradingschemelevel data management
// ABOUTME: Provides CRUD operations for gradingschemelevel without depending on AppDataContext

import { useState, useEffect } from 'react';
import { initialMockGradingSchemes } from './mockData';
import { GradingSchemeLevel } from '@/core/types';

// Flatten all levels from all grading schemes
const initialMockGradingSchemeLevels: GradingSchemeLevel[] = initialMockGradingSchemes.flatMap(s => s.levels ?? []).filter((l): l is GradingSchemeLevel => !!l);

export const useGradingSchemeLevelData = () => {
  const [data, setData] = useState<GradingSchemeLevel[]>(initialMockGradingSchemeLevels);

  const create = async (newItem: Partial<GradingSchemeLevel>) => {
    const newDataItem: GradingSchemeLevel = {
      ...newItem,
      id: Date.now(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    } as GradingSchemeLevel;
    setData((prev: GradingSchemeLevel[]) => [...prev, newDataItem]);
    return newDataItem;
  };

  const update = async (id: number, updatedData: Partial<GradingSchemeLevel>) => {
    setData((prev: GradingSchemeLevel[]) => prev.map((item: GradingSchemeLevel) => 
      item.id === id 
        ? { ...item, ...updatedData, updated_at: new Date().toISOString() }
        : item
    ));
  };

  const remove = async (id: number) => {
    setData((prev: GradingSchemeLevel[]) => prev.filter((item: GradingSchemeLevel) => item.id !== id));
  };

  return {
    data,
    create,
    update,
    remove
  };
};
