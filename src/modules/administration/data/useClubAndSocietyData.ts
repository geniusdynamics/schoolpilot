// ABOUTME: Self-contained hook for any data management
// ABOUTME: Provides CRUD operations for any without depending on AppDataContext

import { useState, useEffect } from 'react';
import { initialMockClubsAndSocieties } from '../../administration/data/mockData';
import { any } from '../../../core/types';

const useClubAndSocietyData = () => {
  const [clubsAndSocieties, setClubsAndSocieties] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      // Simulate fetching data from a mock source
      setClubsAndSocieties(initialMockClubsAndSocieties);
      setIsLoading(false);
    } catch (e) {
      setError('Failed to fetch clubs and societies');
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
    setClubsAndSocieties((prev: any[]) => [...prev, newDataItem]);
    return newDataItem;
  };

  const update = async (id: number, updatedData: Partial<any>) => {
    setClubsAndSocieties((prev: any[]) => prev.map((item: any) =>
      item.id === id
        ? { ...item, ...updatedData, updated_at: new Date().toISOString() }
        : item
    ));
  };

  const remove = async (id: number) => {
    setClubsAndSocieties((prev: any[]) => prev.filter((item: any) => item.id !== id));
  };

  return {
    data: clubsAndSocieties,
    isLoading,
    error,
    create,
    update,
    remove
  };
};

export { useClubAndSocietyData };

// Mark this as a global provider for cross-module use
export const isGlobalProvider = true;