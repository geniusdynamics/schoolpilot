// ABOUTME: Self-contained hook for any data management
// ABOUTME: Provides CRUD operations for any without depending on AppDataContext

import { useState, useEffect } from 'react';
import { initialMockFeeTemplateItems } from './mockData';
import { FinFeeTemplateItemType } from '@/types';

const useFeeTemplateItemData = () => {
  const [feeTemplateItems, setFeeTemplateItems] = useState<FinFeeTemplateItemType[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      // Simulate fetching data from a mock source
      setFeeTemplateItems(initialMockFeeTemplateItems);
      setIsLoading(false);
    } catch (e) {
      setError('Failed to fetch fee template items');
      setIsLoading(false);
    }
  }, []);

  const create = async (newItem: Partial<FinFeeTemplateItemType>) => {
    const newDataItem: FinFeeTemplateItemType = {
      ...newItem,
      id: Date.now(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    } as FinFeeTemplateItemType;
    setFeeTemplateItems((prev: FinFeeTemplateItemType[]) => [...prev, newDataItem]);
    return newDataItem;
  };

  const update = async (id: number, updatedData: Partial<FinFeeTemplateItemType>) => {
    setFeeTemplateItems((prev: FinFeeTemplateItemType[]) => prev.map((item: FinFeeTemplateItemType) =>
      item.id === id
        ? { ...item, ...updatedData, updated_at: new Date().toISOString() }
        : item
    ));
  };

  const remove = async (id: number) => {
    setFeeTemplateItems((prev: FinFeeTemplateItemType[]) => prev.filter((item: FinFeeTemplateItemType) => item.id !== id));
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