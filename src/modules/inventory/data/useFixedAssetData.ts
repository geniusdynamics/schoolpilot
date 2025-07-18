// ABOUTME: Self-contained hook for fixedasset data management
// ABOUTME: Provides CRUD operations for fixedasset without depending on AppDataContext

import { useState, useEffect } from 'react';
import { initialMockFixedAssets } from './mockData';
import { FixedAsset } from '../../../core/types';

export const useFixedAssetData = () => {
  const [data, setData] = useState<FixedAsset[]>(initialMockFixedAssets);

  const create = async (newItem: Partial<FixedAsset>) => {
    const newDataItem: FixedAsset = {
      ...newItem,
      id: Date.now(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    } as FixedAsset;
    setData((prev: FixedAsset[]) => [...prev, newDataItem]);
    return newDataItem;
  };

  const update = async (id: number, updatedData: Partial<FixedAsset>) => {
    setData((prev: FixedAsset[]) => prev.map((item: FixedAsset) => 
      item.id === id 
        ? { ...item, ...updatedData, updated_at: new Date().toISOString() }
        : item
    ));
  };

  const remove = async (id: number) => {
    setData((prev: FixedAsset[]) => prev.filter((item: FixedAsset) => item.id !== id));
  };

  return {
    data,
    create,
    update,
    remove
  };
};
