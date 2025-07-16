// ABOUTME: Self-contained hook for any data management
// ABOUTME: Provides CRUD operations for any without depending on AppDataContext

import { useState, useEffect } from 'react';
import { initialMockUsers } from '../../administration/data/mockData';
import { any } from '../../../core/types';

const useFeeTemplateItemData = () => {
  const [feeTemplateItems, setFeeTemplateItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      // Simulate fetching data from a mock source
      setFeeTemplateItems(initialMockUsers);
      setIsLoading(false);
    } catch (e) {
      setError('Failed to fetch fee template items');
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
    setFeeTemplateItems((prev: any[]) => [...prev, newDataItem]);
    return newDataItem;
  };

  const update = async (id: number, updatedData: Partial<any>) => {
    setFeeTemplateItems((prev: any[]) => prev.map((item: any) =>
      item.id === id
        ? { ...item, ...updatedData, updated_at: new Date().toISOString() }
        : item
    ));
  };

  const remove = async (id: number) => {
    setFeeTemplateItems((prev: any[]) => prev.filter((item: any) => item.id !== id));
  };

  return {
    data: feeTemplateItems,
    isLoading,
    error,
    create,
    update,
    remove
  };
};

export { useFeeTemplateItemData };