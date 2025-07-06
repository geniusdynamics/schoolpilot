import { useState } from 'react';
import { SchoolPeriod } from '../../../core/types';
import { initialMockSchoolPeriods } from './mockData';

export const isGlobalProvider = true;

export function useSchoolPeriodData() {
  const [schoolPeriods, setSchoolPeriods] = useState<SchoolPeriod[]>(initialMockSchoolPeriods);

  const addSchoolPeriod = (period: Omit<SchoolPeriod, 'id' | 'created_at' | 'updated_at'>) => {
    const newPeriod: SchoolPeriod = {
      ...period,
      id: Date.now(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setSchoolPeriods(prev => [...prev, newPeriod]);
    return newPeriod;
  };

  const updateSchoolPeriod = (updated: SchoolPeriod) => {
    setSchoolPeriods(prev => prev.map(p => p.id === updated.id ? { ...updated, updated_at: new Date().toISOString() } : p));
  };

  const deleteSchoolPeriod = (id: number) => {
    setSchoolPeriods(prev => prev.filter(p => p.id !== id));
  };

  return {
    schoolPeriods,
    addSchoolPeriod,
    updateSchoolPeriod,
    deleteSchoolPeriod,
  };
} 