// ABOUTME: Self-contained hook for fee adjustment data management
// ABOUTME: Provides CRUD operations for fee adjustments without depending on AppDataContext

import { useState, useEffect } from 'react';
import { initialMockFeeAdjustments } from './mockData';
import { FeeAdjustment } from '../../../core/types';

const useFeeAdjustmentData = () => {
  const [feeAdjustments, setFeeAdjustments] = useState<FeeAdjustment[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      // Simulate fetching data from a mock source
      setFeeAdjustments(initialMockFeeAdjustments);
      setIsLoading(false);
    } catch (e) {
      setError('Failed to fetch fee adjustments');
      setIsLoading(false);
    }
  }, []);

  const create = async (newItem: Partial<FeeAdjustment>) => {
    const newDataItem: FeeAdjustment = {
      ...newItem,
      id: `ADJ${Date.now()}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    } as FeeAdjustment;
    setFeeAdjustments((prev) => [...prev, newDataItem]);
    return newDataItem;
  };

  const update = async (id: string, updatedData: Partial<FeeAdjustment>) => {
    setFeeAdjustments((prev) => prev.map((item) =>
      item.id === id
        ? { ...item, ...updatedData, updated_at: new Date().toISOString() }
        : item
    ));
  };

  const remove = async (id: string) => {
    setFeeAdjustments((prev) => prev.filter((item) => item.id !== id));
  };

  return {
    data: feeAdjustments,
    isLoading,
    error,
    create,
    update,
    remove
  };
};

export { useFeeAdjustmentData };