// ABOUTME: Global provider hook for Customer entity with full CRUD using mock data.
// ABOUTME: Used for modular, plugin-ready data access across the system.

import { useState } from 'react';
import { AdminCustomerType } from './types';
import { initialMockCustomers } from './mockData';

export const isGlobalProvider = true;

export function useCustomerData() {
  const [customers, setCustomers] = useState<AdminCustomerType[]>(initialMockCustomers);

  const addCustomer = (data: Omit<AdminCustomerType, 'id' | 'created_at' | 'updated_at'>) => {
    const newCustomer: AdminCustomerType = {
      ...data,
      id: Date.now(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setCustomers(prev => [...prev, newCustomer]);
    return newCustomer;
  };

  const updateCustomer = (updated: AdminCustomerType) => {
    setCustomers(prev => prev.map(c => c.id === updated.id ? { ...updated } : c));
    return updated;
  };

  const deleteCustomer = (id: number) => {
    setCustomers(prev => prev.filter(c => c.id !== id));
  };

  return {
    customers,
    addCustomer,
    updateCustomer,
    deleteCustomer,
  };
} 