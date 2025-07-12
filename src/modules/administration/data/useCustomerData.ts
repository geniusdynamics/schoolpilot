// ABOUTME: Self-contained hook for customer data management
// ABOUTME: Provides CRUD operations for customer without depending on AppDataContext

import { useState, useEffect } from 'react';
import { initialMockCustomers } from '../../administration/data/mockData';
import { Customer } from '../../../core/types';

export const useCustomerData = () => {
  const [data, setData] = useState<Customer[]>(initialMockCustomers);

  const create = async (newItem: Partial<Customer>) => {
    const newDataItem: Customer = {
      ...newItem,
      id: Date.now(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    } as Customer;
    setData((prev: Customer[]) => [...prev, newDataItem]);
    return newDataItem;
  };

  const update = async (id: number, updatedData: Partial<Customer>) => {
    setData((prev: Customer[]) => prev.map((item: Customer) => 
      item.id === id 
        ? { ...item, ...updatedData, updated_at: new Date().toISOString() }
        : item
    ));
  };

  const remove = async (id: number) => {
    setData((prev: Customer[]) => prev.filter((item: Customer) => item.id !== id));
  };

  return {
    data,
    create,
    update,
    remove
  };
};
