// ABOUTME: Self-contained hook for student payment data management
// ABOUTME: Provides CRUD operations for student payments without depending on AppDataContext

import { useState, useEffect } from 'react';
import { initialMockStudentPayments } from './mockData';
import { StudentPayment } from '@/core/types';

const useStudentPaymentData = () => {
  const [studentPayments, setStudentPayments] = useState<StudentPayment[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      // Simulate fetching data from a mock source
      setStudentPayments(initialMockStudentPayments);
      setIsLoading(false);
    } catch (e) {
      setError('Failed to fetch student payments');
      setIsLoading(false);
    }
  }, []);

  const create = async (newItem: Partial<StudentPayment>) => {
    const newDataItem: StudentPayment = {
      ...newItem,
      id: `SPAY${Date.now()}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    } as StudentPayment;
    setStudentPayments((prev) => [...prev, newDataItem]);
    return newDataItem;
  };

  const update = async (id: string, updatedData: Partial<StudentPayment>) => {
    setStudentPayments((prev) => prev.map((item) =>
      item.id === id
        ? { ...item, ...updatedData, updated_at: new Date().toISOString() }
        : item
    ));
  };

  const remove = async (id: string) => {
    setStudentPayments((prev) => prev.filter((item) => item.id !== id));
  };

  return {
    data: studentPayments,
    isLoading,
    error,
    create,
    update,
    remove
  };
};

export { useStudentPaymentData };