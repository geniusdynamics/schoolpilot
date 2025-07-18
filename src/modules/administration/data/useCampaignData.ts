// ABOUTME: Self-contained hook for campaign data management
// ABOUTME: Provides CRUD operations for campaign without depending on AppDataContext

import { useState, useEffect } from 'react';
import { initialMockCampaigns } from './mockData';
import { Campaign } from '../../../core/types';

export const useCampaignData = () => {
  const [data, setData] = useState<Campaign[]>(initialMockCampaigns);

  const create = async (newItem: Partial<Campaign>) => {
    const newDataItem: Campaign = {
      ...newItem,
      id: Date.now(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    } as Campaign;
    setData((prev: Campaign[]) => [...prev, newDataItem]);
    return newDataItem;
  };

  const update = async (id: number, updatedData: Partial<Campaign>) => {
    setData((prev: Campaign[]) => prev.map((item: Campaign) => 
      item.id === id 
        ? { ...item, ...updatedData, updated_at: new Date().toISOString() }
        : item
    ));
  };

  const remove = async (id: number) => {
    setData((prev: Campaign[]) => prev.filter((item: Campaign) => item.id !== id));
  };

  return {
    data,
    create,
    update,
    remove
  };
};

// Mark this as a global provider for cross-module use
export const isGlobalProvider = true;
