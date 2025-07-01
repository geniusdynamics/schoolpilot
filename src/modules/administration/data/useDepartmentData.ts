import { useState } from 'react';
import { Department } from '../../../core/types';
import { initialMockDepartments } from './mockData';

export const isGlobalProvider = true;

export function useDepartmentData() {
  const [departments, setDepartments] = useState<Department[]>(initialMockDepartments);

  const addDepartment = (department: Omit<Department, 'id' | 'created_at' | 'updated_at'>) => {
    const newDepartment: Department = {
      ...department,
      id: Date.now().toString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setDepartments(prev => [...prev, newDepartment]);
    return newDepartment;
  };

  const updateDepartment = (updated: Department) => {
    setDepartments(prev => prev.map(d => d.id === updated.id ? { ...updated, updated_at: new Date().toISOString() } : d));
  };

  const deleteDepartment = (id: string) => {
    setDepartments(prev => prev.filter(d => d.id !== id));
  };

  return {
    departments,
    addDepartment,
    updateDepartment,
    deleteDepartment,
  };
} 