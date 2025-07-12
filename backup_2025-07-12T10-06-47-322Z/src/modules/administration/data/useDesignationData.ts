import { useState, useEffect } from 'react';
import { Designation } from '../../../core/types';
import { initialMockDesignations } from './mockData';

export const isGlobalProvider = true;

export function useDesignationData() {
  const [designations, setDesignations] = useState<Designation[]>(initialMockDesignations || []);
  const [loading, setLoading] = useState({ designations: true });

  useEffect(() => {
    // Simulate loading
    const timer = setTimeout(() => {
      setLoading({ designations: false });
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  const addDesignation = async (designation: Omit<Designation, 'id' | 'created_at' | 'updated_at'>) => {
    const newId = Math.max(...designations.map(d => d.id), 0) + 1;
    const newDesignation: Designation = {
      ...designation,
      id: newId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setDesignations(prev => [...prev, newDesignation]);
    return newDesignation;
  };

  const updateDesignation = async (updated: Designation) => {
    setDesignations(prev => prev.map(d => d.id === updated.id ? { ...updated, updated_at: new Date().toISOString() } : d));
  };

  const deleteDesignation = async (id: number) => {
    setDesignations(prev => prev.filter(d => d.id !== id));
  };

  return {
    designations,
    loading,
    addDesignation,
    updateDesignation,
    deleteDesignation,
  };
}