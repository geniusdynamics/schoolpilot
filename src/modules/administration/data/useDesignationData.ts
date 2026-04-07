// ABOUTME: Self-contained hook for designation data management
// ABOUTME: Provides CRUD operations for designation without depending on AppDataContext

import { useState, useEffect } from 'react';
import { initialMockDesignations } from './mockData';
import { Designation } from '@/core/types';

export const useDesignationData = () => {
  const [data, setData] = useState<Designation[]>(initialMockDesignations || []);
  const [loading, setLoading] = useState({ designations: false });

  const addDesignation = async (newItem: Omit<Designation, 'id' | 'created_at' | 'updated_at'>) => {
    setLoading(prev => ({ ...prev, designations: true }));
    try {
      const newDataItem: Designation = {
        ...newItem,
        id: Date.now(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      setData((prev: Designation[]) => [...prev, newDataItem]);
      return newDataItem;
    } finally {
      setLoading(prev => ({ ...prev, designations: false }));
    }
  };

  const updateDesignation = async (updatedItem: Designation) => {
    setLoading(prev => ({ ...prev, designations: true }));
    try {
      setData((prev: Designation[]) => prev.map((item: Designation) => 
        item.id === updatedItem.id 
          ? { ...updatedItem, updated_at: new Date().toISOString() }
          : item
      ));
    } finally {
      setLoading(prev => ({ ...prev, designations: false }));
    }
  };

  const deleteDesignation = async (id: number) => {
    setLoading(prev => ({ ...prev, designations: true }));
    try {
      setData((prev: Designation[]) => prev.filter((item: Designation) => item.id !== id));
    } finally {
      setLoading(prev => ({ ...prev, designations: false }));
    }
  };

  return {
    designations: data,
    loading,
    addDesignation,
    updateDesignation,
    deleteDesignation,
    // Legacy compatibility
    data,
    create: addDesignation,
    update: updateDesignation,
    remove: deleteDesignation
  };
};

// Mark this as a global provider for cross-module use
export const isGlobalProvider = true;
