// ABOUTME: Database-backed hook for fixed asset data management
// ABOUTME: Provides CRUD operations for fixed assets against the 'fixed_assets' collection

import { useCallback } from 'react';
import { useDatabaseCollection } from '@/hooks/useDatabaseCollection';
import { FixedAsset } from '@/core/types';

export const useFixedAssetData = () => {
  const fixedAssetsCollection = useDatabaseCollection<FixedAsset>('fixed_assets');

  const create = useCallback(async (newItem: Partial<FixedAsset>) => {
    const now = new Date().toISOString();
    const payload = {
      created_at: now,
      updated_at: now,
      ...newItem
    } as Omit<FixedAsset, 'id'> & { id?: string };
    return fixedAssetsCollection.insert(payload);
  }, [fixedAssetsCollection]);

  const update = useCallback(async (id: number | string, updatedData: Partial<FixedAsset>) => {
    return fixedAssetsCollection.update(String(id), {
      ...updatedData,
      updated_at: new Date().toISOString()
    });
  }, [fixedAssetsCollection]);

  const remove = useCallback(async (id: number | string) => {
    return fixedAssetsCollection.remove(String(id));
  }, [fixedAssetsCollection]);

  return {
    data: fixedAssetsCollection.data,
    create,
    update,
    remove
  };
};
