// ABOUTME: Global provider hook for Dormitory entity with full CRUD using mock data.
// ABOUTME: Used for modular, plugin-ready data access across the system.

import { useState } from 'react';
import { Dormitory } from '../../../core/types';
import { initialMockDormitories } from './mockData';

export const isGlobalProvider = true;

export function useDormitoryData() {
  const [dormitories, setDormitories] = useState<Dormitory[]>(initialMockDormitories);

  const addDormitory = (data: Omit<Dormitory, 'id' | 'created_at' | 'updated_at'>) => {
    const newDorm: Dormitory = {
      ...data,
      id: Date.now(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setDormitories(prev => [...prev, newDorm]);
    return newDorm;
  };

  const updateDormitory = (updated: Dormitory) => {
    setDormitories(prev => prev.map(d => d.id === updated.id ? { ...updated, updated_at: new Date().toISOString() } : d));
    return updated;
  };

  const deleteDormitory = (id: number) => {
    setDormitories(prev => prev.filter(d => d.id !== id));
  };

  return {
    dormitories,
    addDormitory,
    updateDormitory,
    deleteDormitory,
  };
} 