// ABOUTME: Database-backed academic years (collection 'academic_years') for the term form's year picker.
// ABOUTME: Replaces the former mock hook; ids stay strings and the list is ordered newest first.

import { useCallback, useMemo } from 'react';
import { AcademicYear } from '@/core/types';
import { useDatabaseCollection } from '@/hooks/useDatabaseCollection';

export const ACADEMIC_YEARS_COLLECTION = 'academic_years';

/** A stored academic year; ids are strings at runtime. */
export type AcademicYearRecord = Omit<AcademicYear, 'id'> & { id: string };

const stamp = () => new Date().toISOString();

export const useAcademicYearData = () => {
  const collection = useDatabaseCollection<AcademicYearRecord>(ACADEMIC_YEARS_COLLECTION);
  const { data, insert, update: updateDocument, remove: removeDocument, refresh } = collection;

  const academicYears = useMemo(
    () => [...data].sort((a, b) => String(b.start_date ?? '').localeCompare(String(a.start_date ?? ''))),
    [data]
  );

  const create = useCallback(
    async (newItem: Omit<AcademicYearRecord, 'id' | 'created_at' | 'updated_at'>) => {
      const now = stamp();
      return insert({ ...newItem, created_at: now, updated_at: now });
    },
    [insert]
  );

  const update = useCallback(
    async (id: string, patch: Partial<AcademicYearRecord>) => updateDocument(String(id), { ...patch, updated_at: stamp() }),
    [updateDocument]
  );

  const remove = useCallback(async (id: string) => removeDocument(String(id)), [removeDocument]);

  return {
    data: academicYears,
    academicYears,
    loading: collection.loading,
    error: collection.error,
    refresh,
    create,
    update,
    remove,
  };
};

// Mark this as a global provider for cross-module use
export const isGlobalProvider = true;
