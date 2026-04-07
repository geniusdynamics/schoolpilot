// ABOUTME: Self-contained hook for gradingscheme data management
// ABOUTME: Provides CRUD operations for gradingscheme without depending on AppDataContext

import { useState, useEffect } from 'react';
import { initialMockGradingSchemes } from './mockData';
import { GradingScheme } from '@/core/types';

export const useGradingSchemeData = () => {
  const [data, setData] = useState<GradingScheme[]>(initialMockGradingSchemes);

  const create = async (newItem: Partial<GradingScheme>) => {
    const newDataItem: GradingScheme = {
      ...newItem,
      id: Date.now(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    } as GradingScheme;
    setData((prev: GradingScheme[]) => [...prev, newDataItem]);
    return newDataItem;
  };

  const update = async (id: number, updatedData: Partial<GradingScheme>) => {
    setData((prev: GradingScheme[]) => prev.map((item: GradingScheme) => 
      item.id === id 
        ? { ...item, ...updatedData, updated_at: new Date().toISOString() }
        : item
    ));
  };

  const remove = async (id: number) => {
    setData((prev: GradingScheme[]) => prev.filter((item: GradingScheme) => item.id !== id));
  };

  return {
    data,
    create,
    update,
    remove
  };
};
