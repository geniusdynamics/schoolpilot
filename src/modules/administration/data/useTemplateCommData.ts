// ABOUTME: Database-backed communication templates (collection 'communication_templates') with persistent CRUD.
// ABOUTME: Replaces the former mock hook; ids are strings, update accepts a record or (id, patch), page aliases kept.

import { useCallback, useMemo } from 'react';
import { AdminTemplateCommType } from './types';
import { useDatabaseCollection } from '@/hooks/useDatabaseCollection';

export const COMMUNICATION_TEMPLATES_COLLECTION = 'communication_templates';

/** A stored template; ids are strings at runtime. */
export type TemplateCommRecord = Omit<AdminTemplateCommType, 'id'> & { id: string };
type TemplateCommInput = Omit<TemplateCommRecord, 'id' | 'created_at' | 'updated_at'>;

const stamp = () => new Date().toISOString();

const toStored = (record: Partial<TemplateCommRecord>) =>
  Object.fromEntries(Object.entries(record).filter(([key, value]) => key !== 'id' && value !== undefined)) as Partial<TemplateCommRecord>;

export const useTemplateCommData = () => {
  const collection = useDatabaseCollection<TemplateCommRecord>(COMMUNICATION_TEMPLATES_COLLECTION);
  const { data, insert, update: updateDocument, remove: removeDocument, refresh } = collection;

  const templateComms = useMemo(() => [...data].sort((a, b) => String(a.name ?? '').localeCompare(String(b.name ?? ''))), [data]);

  const create = useCallback(
    async (newItem: TemplateCommInput) => {
      const now = stamp();
      return insert({ ...(toStored(newItem) as TemplateCommInput), created_at: now, updated_at: now });
    },
    [insert]
  );

  const update = useCallback(
    async (idOrRecord: string | TemplateCommRecord, patch?: Partial<TemplateCommRecord>) => {
      const id = typeof idOrRecord === 'object' ? idOrRecord.id : idOrRecord;
      const changes = typeof idOrRecord === 'object' ? idOrRecord : patch ?? {};
      return updateDocument(String(id), { ...toStored(changes), updated_at: stamp() });
    },
    [updateDocument]
  );

  const remove = useCallback(async (id: string) => removeDocument(String(id)), [removeDocument]);

  return {
    templateComms,
    addTemplateComm: create,
    updateTemplateComm: update,
    deleteTemplateComm: remove,
    loading: collection.loading,
    error: collection.error,
    refresh,
    data: templateComms,
    create,
    update,
    remove,
  };
};

export const isGlobalProvider = true;
