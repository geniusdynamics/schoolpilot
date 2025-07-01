import { useState } from 'react';
import { Designation } from '../../../core/types';
import { initialMockDesignations } from './mockData';

export const isGlobalProvider = true;

export function useDesignationData() {
  const [designations, setDesignations] = useState<Designation[]>(initialMockDesignations);

  const addDesignation = (designation: Omit<Designation, 'id' | 'created_at' | 'updated_at'>) => {
    const newDesignation: Designation = {
      ...designation,
      id: Date.now().toString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setDesignations(prev => [...prev, newDesignation]);
    return newDesignation;
  };

  const updateDesignation = (updated: Designation) => {
    setDesignations(prev => prev.map(d => d.id === updated.id ? { ...updated, updated_at: new Date().toISOString() } : d));
  };

  const deleteDesignation = (id: string) => {
    setDesignations(prev => prev.filter(d => d.id !== id));
  };

  return {
    designations,
    addDesignation,
    updateDesignation,
    deleteDesignation,
  };
} 