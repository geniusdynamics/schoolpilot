// ABOUTME: Database-backed academic period definitions (collection 'academic_period_definitions'), e.g. "Term 1".
// ABOUTME: Replaces the former mock hook; feeds the term form's period picker in sequence order.

import { useCallback, useMemo } from 'react';
import { AcademicPeriodDefinition } from '@/core/types';
import { useDatabaseCollection } from '@/hooks/useDatabaseCollection';

export const ACADEMIC_PERIOD_DEFINITIONS_COLLECTION = 'academic_period_definitions';

export const useAcademicPeriodDefinitionData = () => {
  const collection = useDatabaseCollection<AcademicPeriodDefinition>(ACADEMIC_PERIOD_DEFINITIONS_COLLECTION);
  const { data, insert, update: updateDocument, remove: removeDocument, refresh } = collection;

  const definitions = useMemo(
    () => [...data].sort((a, b) => (a.sequence_order ?? 0) - (b.sequence_order ?? 0)),
    [data]
  );

  const create = useCallback(
    async (newItem: Omit<AcademicPeriodDefinition, 'id'>) => insert(newItem),
    [insert]
  );

  const update = useCallback(
    async (id: string, patch: Partial<AcademicPeriodDefinition>) => updateDocument(String(id), patch),
    [updateDocument]
  );

  const remove = useCallback(async (id: string) => removeDocument(String(id)), [removeDocument]);

  return {
    data: definitions,
    academicPeriodDefinitions: definitions,
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
