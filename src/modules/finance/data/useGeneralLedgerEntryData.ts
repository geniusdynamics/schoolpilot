// ABOUTME: Self-contained hook for any data management
// ABOUTME: Provides CRUD operations for any without depending on AppDataContext

import { useState, useEffect } from 'react';
import { initialMockGeneralLedgerEntries } from './mockData';
import { GeneralLedgerEntry } from '@/core/types';

const useGeneralLedgerEntryData = () => {
  const [generalLedgerEntries, setGeneralLedgerEntries] = useState<GeneralLedgerEntry[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      setGeneralLedgerEntries(initialMockGeneralLedgerEntries);
      setIsLoading(false);
    } catch (e) {
      setError('Failed to fetch general ledger entries');
      setIsLoading(false);
    }
  }, []);

  const create = async (newItem: Partial<GeneralLedgerEntry>) => {
    const newDataItem: GeneralLedgerEntry = {
      ...newItem,
      id: newItem.id || `GLE${Date.now()}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    } as GeneralLedgerEntry;
    setGeneralLedgerEntries((prev) => [...prev, newDataItem]);
    return newDataItem;
  };

  const update = async (id: string, updatedData: Partial<GeneralLedgerEntry>) => {
    setGeneralLedgerEntries((prev) => prev.map((item) =>
      item.id === id
        ? { ...item, ...updatedData, updated_at: new Date().toISOString() }
        : item
    ));
  };

  const remove = async (id: string) => {
    setGeneralLedgerEntries((prev) => prev.filter((item) => item.id !== id));
  };

  return {
    data: generalLedgerEntries,
    isLoading,
    error,
    create,
    update,
    remove
  };
};

export { useGeneralLedgerEntryData };
