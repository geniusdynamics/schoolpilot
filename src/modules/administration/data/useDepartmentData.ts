// ABOUTME: Database-backed departments (collection 'departments'): create(data), update(id, patch), remove(id).
// ABOUTME: Writes announce 'appDataChanged' so pickers fed by the app-wide snapshot (e.g. staff forms) refresh.

import { useCallback } from 'react';
import { Department } from '@/core/types';
import { useDatabaseCollection } from '@/hooks/useDatabaseCollection';

export const DEPARTMENTS_COLLECTION = 'departments';

/** A stored department; ids are strings at runtime. */
export type DepartmentRecord = Omit<Department, 'id'> & { id: string };

/** Editable fields of a department. */
export interface DepartmentInput {
  name: string;
  is_academic: boolean;
}

const notifyAppDataChanged = () => {
  window.dispatchEvent(new CustomEvent('appDataChanged', { detail: { collection: DEPARTMENTS_COLLECTION } }));
};

export const useDepartmentData = () => {
  const collection = useDatabaseCollection<DepartmentRecord>(DEPARTMENTS_COLLECTION);
  const { insert, update, remove } = collection;

  const addDepartment = useCallback(async (input: DepartmentInput) => {
    const now = new Date().toISOString();
    const created = await insert({ ...input, created_at: now, updated_at: now });
    notifyAppDataChanged();
    return created;
  }, [insert]);

  const updateDepartment = useCallback(async (id: string, patch: Partial<DepartmentInput>) => {
    const updated = await update(id, { ...patch, updated_at: new Date().toISOString() });
    notifyAppDataChanged();
    return updated;
  }, [update]);

  const deleteDepartment = useCallback(async (id: string) => {
    const removed = await remove(id);
    notifyAppDataChanged();
    return removed;
  }, [remove]);

  return {
    departments: collection.data,
    loading: { departments: collection.loading },
    error: collection.error,
    refresh: collection.refresh,
    addDepartment,
    updateDepartment,
    deleteDepartment,
    // Generic verbs with the same (data) / (id, patch) / (id) signatures
    data: collection.data,
    create: addDepartment,
    update: updateDepartment,
    remove: deleteDepartment,
  };
};

// Mark this as a global provider for cross-module use
export const isGlobalProvider = true;
