// ABOUTME: Global provider hook for ClubAndSociety entity with full CRUD using mock data.
// ABOUTME: Used for modular, plugin-ready data access across the system.

import { useState } from 'react';
import { AdminClubAndSocietyType } from './types';
import { initialMockClubsAndSocieties } from './mockData';

export const isGlobalProvider = true;

export function useClubAndSocietyData() {
  const [clubsAndSocieties, setClubsAndSocieties] = useState<AdminClubAndSocietyType[]>(initialMockClubsAndSocieties);

  const addClubAndSociety = (data: Omit<AdminClubAndSocietyType, 'id' | 'created_at' | 'updated_at'>) => {
    const newClub: AdminClubAndSocietyType = {
      ...data,
      id: Date.now(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setClubsAndSocieties(prev => [...prev, newClub]);
    return newClub;
  };

  const updateClubAndSociety = (updated: AdminClubAndSocietyType) => {
    setClubsAndSocieties(prev => prev.map(c => c.id === updated.id ? { ...updated } : c));
    return updated;
  };

  const deleteClubAndSociety = (id: number) => {
    setClubsAndSocieties(prev => prev.filter(c => c.id !== id));
  };

  return {
    clubsAndSocieties,
    addClubAndSociety,
    updateClubAndSociety,
    deleteClubAndSociety,
  };
} 