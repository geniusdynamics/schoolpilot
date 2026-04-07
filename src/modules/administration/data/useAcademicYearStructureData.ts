// ABOUTME: Self-contained hook for academicyearstructure data management
// ABOUTME: Provides CRUD operations for academicyearstructure without depending on AppDataContext

import { useState, useEffect } from 'react';
import { initialMockAcademicYearStructures } from './mockData';
import { AcademicYearStructure } from '@/core/types';

export const useAcademicYearStructureData = () => {
  const [data, setData] = useState<AcademicYearStructure[]>(initialMockAcademicYearStructures);

  const create = async (newItem: Partial<AcademicYearStructure>) => {
    const newDataItem: AcademicYearStructure = {
      ...newItem,
      id: Date.now(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    } as AcademicYearStructure;
    setData((prev: AcademicYearStructure[]) => [...prev, newDataItem]);
    return newDataItem;
  };

  const update = async (id: number, updatedData: Partial<AcademicYearStructure>) => {
    setData((prev: AcademicYearStructure[]) => prev.map((item: AcademicYearStructure) => 
      item.id === id 
        ? { ...item, ...updatedData, updated_at: new Date().toISOString() }
        : item
    ));
  };

  const remove = async (id: number) => {
    setData((prev: AcademicYearStructure[]) => prev.filter((item: AcademicYearStructure) => item.id !== id));
  };

  return {
    data,
    create,
    update,
    remove
  };
};
