// ABOUTME: Self-contained hook for any data management
// ABOUTME: Provides CRUD operations for any without depending on AppDataContext

import { useState, useEffect } from 'react';
import { initialMockClubsAndSocieties } from './mockData';
import { AdminClubAndSocietyType } from './types';

const useClubAndSocietyData = () => {
  const [clubsAndSocieties, setClubsAndSocieties] = useState<AdminClubAndSocietyType[]>([]);
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

  const create = async (newItem: Partial<AdminClubAndSocietyType>) => {
    const newDataItem: AdminClubAndSocietyType = {
      ...newItem,
      id: Date.now(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    } as AdminClubAndSocietyType;
    setClubsAndSocieties((prev: AdminClubAndSocietyType[]) => [...prev, newDataItem]);
    return newDataItem;
  };

  const update = async (id: number, updatedData: Partial<AdminClubAndSocietyType>) => {
    setClubsAndSocieties((prev: AdminClubAndSocietyType[]) => prev.map((item: AdminClubAndSocietyType) =>
      item.id === id
        ? { ...item, ...updatedData, updated_at: new Date().toISOString() }
        : item
    ));
  };

  const remove = async (id: number) => {
    setClubsAndSocieties((prev: AdminClubAndSocietyType[]) => prev.filter((item: AdminClubAndSocietyType) => item.id !== id));
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