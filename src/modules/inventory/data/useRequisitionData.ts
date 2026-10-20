// ABOUTME: Database-backed hook for requisition data management
// ABOUTME: Provides CRUD operations for requisitions against the 'requisitions' collection
// ABOUTME: Requisition line items are nested on the requisition document via the 'items' array

import { useCallback } from 'react';
import { useDatabaseCollection } from '@/hooks/useDatabaseCollection';
import { Requisition } from '@/core/types';

export const useRequisitionData = () => {
  const requisitionsCollection = useDatabaseCollection<Requisition>('requisitions');

  const create = useCallback(async (newItem: Partial<Requisition>) => {
    const now = new Date().toISOString();
    const payload = {
      created_at: now,
      updated_at: now,
      ...newItem
    } as Omit<Requisition, 'id'> & { id?: string };
    return requisitionsCollection.insert(payload);
  }, [requisitionsCollection]);

  const update = useCallback(async (id: number | string, updatedData: Partial<Requisition>) => {
    return requisitionsCollection.update(String(id), {
      ...updatedData,
      updated_at: new Date().toISOString()
    });
  }, [requisitionsCollection]);

  const remove = useCallback(async (id: number | string) => {
    return requisitionsCollection.remove(String(id));
  }, [requisitionsCollection]);

  return {
    data: requisitionsCollection.data,
    create,
    update,
    remove
  };
};
