// ABOUTME: Self-contained hook for general payment data management
// ABOUTME: Provides CRUD operations for general payments without depending on AppDataContext

import { useState, useEffect } from 'react';
import { initialMockGeneralPayments } from './mockData';
import { FinGeneralPaymentType } from './types';

const useGeneralPaymentData = () => {
  const [generalPayments, setGeneralPayments] = useState<FinGeneralPaymentType[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      // Simulate fetching data from a mock source
      setGeneralPayments(initialMockGeneralPayments);
      setIsLoading(false);
    } catch (e) {
      setError('Failed to fetch GeneralPayments');
      setIsLoading(false);
    }
  }, []);

  const create = async (newItem: Partial<FinGeneralPaymentType>) => {
    const newDataItem: FinGeneralPaymentType = {
      ...newItem,
      id: Date.now().toString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    } as FinGeneralPaymentType;
    setGeneralPayments((prev: FinGeneralPaymentType[]) => [...prev, newDataItem]);
    return newDataItem;
  };

  const update = async (id: string, updatedData: Partial<FinGeneralPaymentType>) => {
    setGeneralPayments((prev: FinGeneralPaymentType[]) => prev.map((item: FinGeneralPaymentType) =>
      item.id === id
        ? { ...item, ...updatedData, updated_at: new Date().toISOString() }
        : item
    ));
  };

  const remove = async (id: string) => {
    setGeneralPayments((prev: FinGeneralPaymentType[]) => prev.filter((item: FinGeneralPaymentType) => item.id !== id));
  };

  return {
    data: generalPayments,
    isLoading,
    error,
    create,
    update,
    remove
  };
};

export { useGeneralPaymentData };