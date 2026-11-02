// ABOUTME: The canonical expense data the Expenses page reads: the institution, its recorded
// ABOUTME: expenses and the loading/error state of both, in exact minor units.

import { useMemo } from 'react';

import { useEntityQuery } from '@/data/query';
import type { RepositoryRow } from '@/data/repository';

import { useFinanceRepository, type FinanceRepository } from './canonicalFinance';

const EVERY_PAGE = { allPages: true } as const;

export interface CanonicalExpenses {
  readonly repository: FinanceRepository;
  readonly status: 'loading' | 'success' | 'error';
  readonly error: unknown;
  readonly institution: RepositoryRow<'institution'> | null;
  readonly institutionId: string | null;
  readonly expenses: readonly RepositoryRow<'expense'>[];
  readonly refresh: () => void;
}

/** Reads the institution and every recorded expense of it. */
export function useCanonicalExpenses(): CanonicalExpenses {
  const repository = useFinanceRepository();
  const institutions = useEntityQuery(repository, 'institution');
  const expenses = useEntityQuery(repository, 'expense', {}, EVERY_PAGE);

  const institution = institutions.data?.items[0] ?? null;
  const institutionId = institution?.id ?? null;

  const own = useMemo(
    () =>
      institutionId === null
        ? []
        : (expenses.data?.items ?? []).filter((row) => row.institution_id === institutionId),
    [expenses.data, institutionId]
  );

  const status: CanonicalExpenses['status'] =
    institutions.status === 'error' || expenses.status === 'error'
      ? 'error'
      : institutions.status === 'loading' || expenses.status === 'loading'
        ? 'loading'
        : 'success';

  return {
    repository,
    status,
    error: institutions.error ?? expenses.error ?? null,
    institution,
    institutionId,
    expenses: own,
    refresh: () => {
      void institutions.refetch();
      void expenses.refetch();
    },
  };
}
