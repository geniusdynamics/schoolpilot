// ABOUTME: Self-contained hook for customer data management
// ABOUTME: Provides CRUD operations for customer without depending on AppDataContext

import { useState, useEffect } from 'react';
import { initialMockCustomers } from '../../administration/data/mockData';
import { Customer } from '../../../core/types';

export const useCustomerData = () => {
  const [data, setData] = useState<Customer[]>(initialMockCustomers || []);
  const [loading, setLoading] = useState({ customers: false });

  const addCustomer = async (newItem: Omit<Customer, 'id' | 'created_at' | 'updated_at'>) => {
    setLoading(prev => ({ ...prev, customers: true }));
    try {
      const newDataItem: Customer = {
        ...newItem,
        id: Date.now(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      setData((prev: Customer[]) => [...prev, newDataItem]);
      return newDataItem;
    } finally {
      setLoading(prev => ({ ...prev, customers: false }));
    }
  };

  const updateCustomer = async (updatedItem: Customer) => {
    setLoading(prev => ({ ...prev, customers: true }));
    try {
      setData((prev: Customer[]) => prev.map((item: Customer) => 
        item.id === updatedItem.id 
          ? { ...updatedItem, updated_at: new Date().toISOString() }
          : item
      ));
    } finally {
      setLoading(prev => ({ ...prev, customers: false }));
    }
  };

  const deleteCustomer = async (id: number) => {
    setLoading(prev => ({ ...prev, customers: true }));
    try {
      setData((prev: Customer[]) => prev.filter((item: Customer) => item.id !== id));
    } finally {
      setLoading(prev => ({ ...prev, customers: false }));
    }
  };

  return {
    customers: data,
    loading,
    addCustomer,
    updateCustomer,
    deleteCustomer,
    // Legacy compatibility
    data,
    create: addCustomer,
    update: updateCustomer,
    remove: deleteCustomer
  };
};
