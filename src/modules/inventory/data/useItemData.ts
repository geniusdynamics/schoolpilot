// ABOUTME: Database-backed hook for inventory items (collection 'items_inv'): create(data), update(id, patch), remove(id).
// ABOUTME: Replaces the former in-memory mock; ids are strings (UUIDs) and are never coerced to numbers.

import { useCallback } from 'react';
import { useDatabaseCollection } from '@/hooks/useDatabaseCollection';
import { ItemInv } from '@/core/types';

export const ITEMS_INV_COLLECTION = 'items_inv';

export const useItemData = () => {
  const collection = useDatabaseCollection<ItemInv>(ITEMS_INV_COLLECTION);
  const { insert, update: updateDoc, remove: removeDoc } = collection;

  const create = useCallback(async (newItem: Partial<ItemInv>) => {
    const now = new Date().toISOString();
    return insert({ created_at: now, updated_at: now, ...newItem } as Omit<ItemInv, 'id'> & { id?: string });
  }, [insert]);

  const update = useCallback(async (id: string, updatedData: Partial<ItemInv>) => {
    return updateDoc(id, { ...updatedData, updated_at: new Date().toISOString() });
  }, [updateDoc]);

  const remove = useCallback(async (id: string) => {
    return removeDoc(id);
  }, [removeDoc]);

  return {
    data: collection.data,
    loading: collection.loading,
    error: collection.error,
    create,
    update,
    remove
  };
};
