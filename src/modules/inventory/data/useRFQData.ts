// ABOUTME: Self-contained hook for RFQ data management
// ABOUTME: Provides CRUD operations for RFQs without depending on AppDataContext

import { useState, useEffect } from 'react';
import { initialMockRFQs } from './mockData';
import { RFQ } from '@/core/types';

const useRFQData = () => {
  const [rfqs, setRfqs] = useState<RFQ[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      // Simulate fetching data from a mock source
      setRfqs(initialMockRFQs);
      setIsLoading(false);
    } catch (e) {
      setError('Failed to fetch RFQs');
      setIsLoading(false);
    }
  }, []);

  const create = async (newItem: Partial<RFQ>) => {
    const newDataItem: RFQ = {
      ...newItem,
      id: Date.now().toString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    } as RFQ;
    setRfqs((prev: RFQ[]) => [...prev, newDataItem]);
    return newDataItem;
  };

  const update = async (id: string, updatedData: Partial<RFQ>) => {
    setRfqs((prev: RFQ[]) => prev.map((item: RFQ) =>
      item.id === id
        ? { ...item, ...updatedData, updated_at: new Date().toISOString() }
        : item
    ));
  };

  const remove = async (id: string) => {
    setRfqs((prev: RFQ[]) => prev.filter((item: RFQ) => item.id !== id));
  };

  return {
    data: rfqs,
    isLoading,
    error,
    create,
    update,
    remove
  };
};

export { useRFQData };