// ABOUTME: Global provider hook for Partner entity with full CRUD using mock data.
// ABOUTME: Used for modular, plugin-ready data access across the system.

import { useState } from 'react';
import { AdminPartnerType } from './types';
import { initialMockPartners } from './mockData';

export const isGlobalProvider = true;

export function usePartnerData() {
  const [partners, setPartners] = useState<AdminPartnerType[]>(initialMockPartners);

  const addPartner = (data: Omit<AdminPartnerType, 'id' | 'created_at' | 'updated_at'>) => {
    const newPartner: AdminPartnerType = {
      ...data,
      id: Date.now().toString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setPartners(prev => [...prev, newPartner]);
    return newPartner;
  };

  const updatePartner = (updated: AdminPartnerType) => {
    setPartners(prev => prev.map(p => p.id === updated.id ? { ...updated, updated_at: new Date().toISOString() } : p));
    return updated;
  };

  const deletePartner = (id: string) => {
    setPartners(prev => prev.filter(p => p.id !== id));
  };

  return {
    partners,
    addPartner,
    updatePartner,
    deletePartner,
  };
} 