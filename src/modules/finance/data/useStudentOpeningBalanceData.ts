// ABOUTME: Self-contained hook for student opening balance data management.
// ABOUTME: Provides CRUD operations for student opening balances without depending on AppDataContext.

import { useState, useEffect } from 'react';
import { initialMockStudentOpeningBalances } from './mockData';
import { FinStudentOpeningBalanceType as StudentOpeningBalance } from './types';

const useStudentOpeningBalanceData = () => {
  const [studentOpeningBalances, setStudentOpeningBalances] = useState<StudentOpeningBalance[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      setStudentOpeningBalances(initialMockStudentOpeningBalances);
      setIsLoading(false);
    } catch {
      setError('Failed to fetch student opening balances');
      setIsLoading(false);
    }
  }, []);

  const create = async (newItem: Partial<StudentOpeningBalance>) => {
    const newDataItem: StudentOpeningBalance = {
      ...newItem,
      id: `SOB${Date.now()}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    } as StudentOpeningBalance;
    setStudentOpeningBalances((prev) => [...prev, newDataItem]);
    return newDataItem;
  };

  const update = async (
    idOrItem: string | StudentOpeningBalance,
    updatedData?: Partial<StudentOpeningBalance>
  ) => {
    const targetId = typeof idOrItem === 'string' ? idOrItem : idOrItem.id;
    const nextData = typeof idOrItem === 'string' ? updatedData : idOrItem;

    setStudentOpeningBalances((prev) => prev.map((item) =>
      item.id === targetId
        ? { ...item, ...nextData, updated_at: new Date().toISOString() }
        : item
    ));
  };

  const remove = async (id: string) => {
    setStudentOpeningBalances((prev) => prev.filter((item) => item.id !== id));
  };

  return {
    data: studentOpeningBalances,
    isLoading,
    error,
    create,
    update,
    remove
  };
};

export { useStudentOpeningBalanceData };
