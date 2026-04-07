// ABOUTME: Self-contained hook for staff data management
// ABOUTME: Provides CRUD operations for staff without depending on AppDataContext

import { useState, useEffect } from 'react';
import { initialMockStaff } from './mockData';
import { Staff } from '@/core/types';

export const useStaffData = () => {
  const [data, setData] = useState<Staff[]>(initialMockStaff || []);
  const [loading, setLoading] = useState({ staff: false });

  const addStaffMember = async (newItem: Omit<Staff, 'id' | 'created_at' | 'updated_at'>) => {
    setLoading(prev => ({ ...prev, staff: true }));
    try {
      const newDataItem: Staff = {
        ...newItem,
        id: Date.now().toString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      setData((prev: Staff[]) => [...prev, newDataItem]);
      return newDataItem;
    } finally {
      setLoading(prev => ({ ...prev, staff: false }));
    }
  };

  const updateStaffMember = async (updatedItem: Staff) => {
    setLoading(prev => ({ ...prev, staff: true }));
    try {
      setData((prev: Staff[]) => prev.map((item: Staff) => 
        item.id === updatedItem.id 
          ? { ...updatedItem, updated_at: new Date().toISOString() }
          : item
      ));
    } finally {
      setLoading(prev => ({ ...prev, staff: false }));
    }
  };

  const deleteStaffMember = async (id: string) => {
    setLoading(prev => ({ ...prev, staff: true }));
    try {
      setData((prev: Staff[]) => prev.filter((item: Staff) => item.id !== id));
    } finally {
      setLoading(prev => ({ ...prev, staff: false }));
    }
  };

  return {
    staff: data,
    loading,
    addStaffMember,
    updateStaffMember,
    deleteStaffMember,
    // Legacy compatibility
    data,
    create: addStaffMember,
    update: updateStaffMember,
    remove: deleteStaffMember
  };
};

// Mark this as a global provider for cross-module use
export const isGlobalStaffProvider = true;