// ABOUTME: Self-contained hook for department data management
// ABOUTME: Provides CRUD operations for department without depending on AppDataContext

import { useState, useEffect } from 'react';
import { initialMockDepartments } from './mockData';
import { Department } from '../../../core/types';

export const useDepartmentData = () => {
  const [data, setData] = useState<Department[]>(initialMockDepartments || []);
  const [loading, setLoading] = useState({ departments: false });

  const addDepartment = async (newItem: Omit<Department, 'id' | 'created_at' | 'updated_at'>) => {
    setLoading(prev => ({ ...prev, departments: true }));
    try {
      const newDataItem: Department = {
        ...newItem,
        id: Date.now().toString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      setData((prev: Department[]) => [...prev, newDataItem]);
      return newDataItem;
    } finally {
      setLoading(prev => ({ ...prev, departments: false }));
    }
  };

  const updateDepartment = async (updatedItem: Department) => {
    setLoading(prev => ({ ...prev, departments: true }));
    try {
      setData((prev: Department[]) => prev.map((item: Department) => 
        item.id === updatedItem.id 
          ? { ...updatedItem, updated_at: new Date().toISOString() }
          : item
      ));
    } finally {
      setLoading(prev => ({ ...prev, departments: false }));
    }
  };

  const deleteDepartment = async (id: string) => {
    setLoading(prev => ({ ...prev, departments: true }));
    try {
      setData((prev: Department[]) => prev.filter((item: Department) => item.id !== id));
    } finally {
      setLoading(prev => ({ ...prev, departments: false }));
    }
  };

  return {
    departments: data,
    loading,
    addDepartment,
    updateDepartment,
    deleteDepartment,
    // Legacy compatibility
    data,
    create: addDepartment,
    update: updateDepartment,
    remove: deleteDepartment
  };
};

// Mark this as a global provider for cross-module use
export const isGlobalProvider = true;
