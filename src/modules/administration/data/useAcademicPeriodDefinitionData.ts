// ABOUTME: Self-contained hook for academicperioddefinition data management
// ABOUTME: Provides CRUD operations for academicperioddefinition without depending on AppDataContext

import { useState, useEffect } from 'react';
import { initialMockAcademicPeriodDefinitions } from './mockData';
import { AcademicPeriodDefinition } from '../../../core/types';

export const useAcademicPeriodDefinitionData = () => {
  const [data, setData] = useState<AcademicPeriodDefinition[]>(initialMockAcademicPeriodDefinitions);

  const create = async (newItem: Partial<AcademicPeriodDefinition>) => {
    const newDataItem: AcademicPeriodDefinition = {
      ...newItem,
      id: Date.now(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    } as AcademicPeriodDefinition;
    setData((prev: AcademicPeriodDefinition[]) => [...prev, newDataItem]);
    return newDataItem;
  };

  const update = async (id: number, updatedData: Partial<AcademicPeriodDefinition>) => {
    setData((prev: AcademicPeriodDefinition[]) => prev.map((item: AcademicPeriodDefinition) => 
      item.id === id 
        ? { ...item, ...updatedData, updated_at: new Date().toISOString() }
        : item
    ));
  };

  const remove = async (id: number) => {
    setData((prev: AcademicPeriodDefinition[]) => prev.filter((item: AcademicPeriodDefinition) => item.id !== id));
  };

  return {
    data,
    create,
    update,
    remove
  };
};

// Mark this as a global provider for cross-module use
export const isGlobalProvider = true;
