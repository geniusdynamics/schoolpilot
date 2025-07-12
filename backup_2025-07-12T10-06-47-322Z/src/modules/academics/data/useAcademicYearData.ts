import { useState } from 'react';
import { AcademicYear } from '../../../core/types';
import { initialMockAcademicYears } from '../../administration/data/mockData';

export const isGlobalProvider = true;

export function useAcademicYearData() {
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>(initialMockAcademicYears);

  const addAcademicYear = (year: Omit<AcademicYear, 'id' | 'created_at' | 'updated_at'>) => {
    const newYear: AcademicYear = {
      ...year,
      id: Date.now(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setAcademicYears(prev => [...prev, newYear]);
    return newYear;
  };

  const updateAcademicYear = (updated: AcademicYear) => {
    setAcademicYears(prev => prev.map(y => y.id === updated.id ? { ...updated, updated_at: new Date().toISOString() } : y));
  };

  const deleteAcademicYear = (id: number) => {
    setAcademicYears(prev => prev.filter(y => y.id !== id));
  };

  return {
    academicYears,
    addAcademicYear,
    updateAcademicYear,
    deleteAcademicYear,
  };
} 