// ABOUTME: Self-contained hook for supplier data management
// ABOUTME: Provides CRUD operations for supplier without depending on AppDataContext

import { useState, useEffect } from 'react';
import { suppliers } from '../../finance/data/mockData';
import { Supplier } from '../../../core/types';

export const useSupplierData = () => {
  const [data, setData] = useState<Supplier[]>(suppliers);

  const create = async (newItem: Partial<Supplier>) => {
    const newDataItem: Supplier = {
      ...newItem,
      id: Date.now(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    } as Supplier;
    setData((prev: Supplier[]) => [...prev, newDataItem]);
    return newDataItem;
  };

  const update = async (id: number, updatedData: Partial<Supplier>) => {
    setData((prev: Supplier[]) => prev.map((item: Supplier) => 
      item.id === id 
        ? { ...item, ...updatedData, updated_at: new Date().toISOString() }
        : item
    ));
  };

  const remove = async (id: number) => {
    setData((prev: Supplier[]) => prev.filter((item: Supplier) => item.id !== id));
  };

  return {
    data,
    create,
    update,
    remove
  };
};
