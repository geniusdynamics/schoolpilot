// ABOUTME: Global provider hook for Campaign entity with full CRUD using mock data.
// ABOUTME: Used for modular, plugin-ready data access across the system.

import { useState } from 'react';
import { AdminCampaignType } from './types';
import { initialMockCampaigns } from './mockData';

export const isGlobalProvider = true;

export function useCampaignData() {
  const [campaigns, setCampaigns] = useState<AdminCampaignType[]>(initialMockCampaigns);

  const addCampaign = (data: Omit<AdminCampaignType, 'id' | 'created_at' | 'updated_at'>) => {
    const newCampaign: AdminCampaignType = {
      ...data,
      id: Date.now().toString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setCampaigns(prev => [...prev, newCampaign]);
    return newCampaign;
  };

  const updateCampaign = (updated: AdminCampaignType) => {
    setCampaigns(prev => prev.map(c => c.id === updated.id ? { ...updated } : c));
    return updated;
  };

  const deleteCampaign = (id: string) => {
    setCampaigns(prev => prev.filter(c => c.id !== id));
  };

  return {
    campaigns,
    addCampaign,
    updateCampaign,
    deleteCampaign,
  };
} 