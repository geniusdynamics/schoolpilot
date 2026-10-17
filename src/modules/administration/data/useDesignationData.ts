// ABOUTME: Database-backed designations (collection 'designations'): create(data), update(id, patch), remove(id).
// ABOUTME: Writes announce 'appDataChanged' so pickers fed by the app-wide snapshot (e.g. staff forms) refresh.

import { useCallback } from 'react';
import { Designation } from '@/core/types';
import { useDatabaseCollection } from '@/hooks/useDatabaseCollection';

export const DESIGNATIONS_COLLECTION = 'designations';

/** A stored designation; ids are strings at runtime. */
export type DesignationRecord = Omit<Designation, 'id'> & { id: string };

/** Editable fields of a designation. */
export interface DesignationInput {
  title: string;
}

const notifyAppDataChanged = () => {
  window.dispatchEvent(new CustomEvent('appDataChanged', { detail: { collection: DESIGNATIONS_COLLECTION } }));
};

export const useDesignationData = () => {
  const collection = useDatabaseCollection<DesignationRecord>(DESIGNATIONS_COLLECTION);
  const { insert, update, remove } = collection;

  const addDesignation = useCallback(async (input: DesignationInput) => {
    const now = new Date().toISOString();
    const created = await insert({ ...input, created_at: now, updated_at: now });
    notifyAppDataChanged();
    return created;
  }, [insert]);

  const updateDesignation = useCallback(async (id: string, patch: Partial<DesignationInput>) => {
    const updated = await update(id, { ...patch, updated_at: new Date().toISOString() });
    notifyAppDataChanged();
    return updated;
  }, [update]);

  const deleteDesignation = useCallback(async (id: string) => {
    const removed = await remove(id);
    notifyAppDataChanged();
    return removed;
  }, [remove]);

  return {
    designations: collection.data,
    loading: { designations: collection.loading },
    error: collection.error,
    refresh: collection.refresh,
    addDesignation,
    updateDesignation,
    deleteDesignation,
    // Generic verbs with the same (data) / (id, patch) / (id) signatures
    data: collection.data,
    create: addDesignation,
    update: updateDesignation,
    remove: deleteDesignation,
  };
};

// Mark this as a global provider for cross-module use
export const isGlobalProvider = true;
