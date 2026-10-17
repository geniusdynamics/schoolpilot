// ABOUTME: Database-backed partners (collection 'partners') with create/update/remove that persist across reloads.
// ABOUTME: Replaces the former in-memory mock hook; ids are strings and update accepts a record or (id, patch).

import { useCallback, useMemo } from 'react';
import { AdminPartnerType } from './types';
import { useDatabaseCollection } from '@/hooks/useDatabaseCollection';

export const PARTNERS_COLLECTION = 'partners';

type PartnerInput = Omit<AdminPartnerType, 'id' | 'created_at' | 'updated_at'>;

const stamp = () => new Date().toISOString();

/** Drop undefined values and the id so only storable fields are written. */
const toStored = (record: Partial<AdminPartnerType>) =>
  Object.fromEntries(Object.entries(record).filter(([key, value]) => key !== 'id' && value !== undefined)) as Partial<AdminPartnerType>;

export const usePartnerData = () => {
  const collection = useDatabaseCollection<AdminPartnerType>(PARTNERS_COLLECTION);
  const { data, insert, update: updateDocument, remove: removeDocument, refresh } = collection;

  const partners = useMemo(() => [...data].sort((a, b) => String(a.name ?? '').localeCompare(String(b.name ?? ''))), [data]);

  const create = useCallback(
    async (newItem: PartnerInput) => {
      const now = stamp();
      return insert({ ...(toStored(newItem) as PartnerInput), created_at: now, updated_at: now });
    },
    [insert]
  );

  const update = useCallback(
    async (idOrRecord: string | AdminPartnerType, patch?: Partial<AdminPartnerType>) => {
      const id = typeof idOrRecord === 'object' ? idOrRecord.id : idOrRecord;
      const changes = typeof idOrRecord === 'object' ? idOrRecord : patch ?? {};
      return updateDocument(String(id), { ...toStored(changes), updated_at: stamp() });
    },
    [updateDocument]
  );

  const remove = useCallback(async (id: string) => removeDocument(String(id)), [removeDocument]);

  return { data: partners, partners, loading: collection.loading, error: collection.error, refresh, create, update, remove };
};
