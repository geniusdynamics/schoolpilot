// ABOUTME: Self-contained hook for any data management
// ABOUTME: Provides CRUD operations for any without depending on AppDataContext

import { useState, useEffect } from 'react';
import { initialMockFeeTemplates } from './mockData';
import { FinFeeTemplateType as FeeTemplate } from '@/types';

const useFeeTemplateData = () => {
  const [feeTemplates, setFeeTemplates] = useState<FeeTemplate[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      // Simulate fetching data from a mock source
      setFeeTemplates(initialMockFeeTemplates);
      setIsLoading(false);
    } catch (e) {
      setError('Failed to fetch fee templates');
      setIsLoading(false);
    }
  }, []);

  const create = async (newItem: Partial<FeeTemplate>) => {
    const newDataItem: FeeTemplate = {
      ...newItem,
      id: Date.now(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    } as FeeTemplate;
    setFeeTemplates((prev: FeeTemplate[]) => [...prev, newDataItem]);
    return newDataItem;
  };

  const update = async (id: number, updatedData: Partial<FeeTemplate>) => {
    setFeeTemplates((prev: FeeTemplate[]) => prev.map((item: FeeTemplate) =>
      item.id === id
        ? { ...item, ...updatedData, updated_at: new Date().toISOString() }
        : item
    ));
  };

  const remove = async (id: number) => {
    setFeeTemplates((prev: FeeTemplate[]) => prev.filter((item: FeeTemplate) => item.id !== id));
  };

  return {
    data: feeTemplates,
    isLoading,
    error,
    create,
    update,
    remove
  };
};

export { useFeeTemplateData };