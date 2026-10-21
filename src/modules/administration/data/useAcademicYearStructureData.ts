// ABOUTME: Database-backed academic year structures (collection 'academic_year_structures').
// ABOUTME: The canonical registry has no structure template entity, so the page keeps its own collection.

import { useCallback, useMemo } from 'react';
import type { AcademicYearStructure } from '@/core/types';
import { useDatabaseCollection } from '@/hooks/useDatabaseCollection';

export const ACADEMIC_YEAR_STRUCTURES_COLLECTION = 'academic_year_structures';

const stamp = () => new Date().toISOString();

export const useAcademicYearStructureData = () => {
  const collection = useDatabaseCollection<AcademicYearStructure>(ACADEMIC_YEAR_STRUCTURES_COLLECTION);
  const { data, insert, update: updateDocument, remove: removeDocument, refresh } = collection;

  const structures = useMemo(
    () => [...data].sort((a, b) => String(a.name ?? '').localeCompare(String(b.name ?? ''))),
    [data]
  );

  const create = useCallback(
    async (input: { name: string }) => {
      const now = stamp();
      return insert({ ...input, created_at: now, updated_at: now } as Omit<
        AcademicYearStructure,
        'id'
      >);
    },
    [insert]
  );

  const update = useCallback(
    async (id: string, patch: { name?: string }) =>
      updateDocument(id, { ...patch, updated_at: stamp() }),
    [updateDocument]
  );

  const remove = useCallback(async (id: string) => removeDocument(id), [removeDocument]);

  return {
    academicYearStructures: structures,
    data: structures,
    loading: { academicYearStructures: collection.loading },
    error: collection.error,
    refresh,
    create,
    update,
    remove,
  };
};

// Mark this as a global provider for cross-module use
export const isGlobalProvider = true;
