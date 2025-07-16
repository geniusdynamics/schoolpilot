// ABOUTME: Self-contained hook for any data management
// ABOUTME: Provides CRUD operations for any without depending on AppDataContext

import { useState, useEffect } from 'react';
import { initialMockUsers } from '../../administration/data/mockData';
import { any } from '../../../core/types';

const useWarehouseData = () => {
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      // Simulate fetching data from a mock source
      setWarehouses(initialMockUsers);
      setIsLoading(false);
    } catch (e) {
      setError('Failed to fetch warehouses');
      setIsLoading(false);
    }
  }, []);

  const create = async (newItem: Partial<any>) => {
    const newDataItem: any = {
      ...newItem,
      id: Date.now(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    } as any;
    setWarehouses((prev: any[]) => [...prev, newDataItem]);
    return newDataItem;
  };

  const update = async (id: number, updatedData: Partial<any>) => {
    setWarehouses((prev: any[]) => prev.map((item: any) =>
      item.id === id
        ? { ...item, ...updatedData, updated_at: new Date().toISOString() }
        : item
    ));
  };

  const remove = async (id: number) => {
    setWarehouses((prev: any[]) => prev.filter((item: any) => item.id !== id));
  };

  return {
    data: warehouses,
    isLoading,
    error,
    create,
    update,
    remove
  };
};

export { useWarehouseData };