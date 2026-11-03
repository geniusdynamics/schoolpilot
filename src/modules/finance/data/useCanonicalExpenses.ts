// ABOUTME: The canonical expense data the Expenses page reads: the institution, its recorded
// ABOUTME: expenses and the loading/error state of both, in exact minor units.

import { useMemo } from 'react';

import { useEntityQuery } from '@/data/query';
import type { RepositoryRow } from '@/data/repository';
import { ledgerChartFromRows, type LedgerAccountMapping } from '@/domain/finance/ledger';

import { useFinanceRepository, type FinanceRepository } from './canonicalFinance';

const EVERY_PAGE = { allPages: true } as const;

export interface CanonicalExpenses {
  readonly repository: FinanceRepository;
  readonly status: 'loading' | 'success' | 'error';
  readonly error: unknown;
  readonly institution: RepositoryRow<'institution'> | null;
  readonly institutionId: string | null;
  readonly expenses: readonly RepositoryRow<'expense'>[];
  /** The chart the expense dialog picks from and the ledger posts against. */
  readonly mapping: LedgerAccountMapping;
  readonly refresh: () => void;
}

/** Reads the institution, its chart of accounts and every expense recorded against it. */
export function useCanonicalExpenses(): CanonicalExpenses {
  const repository = useFinanceRepository();
  const institutions = useEntityQuery(repository, 'institution');
  const expenses = useEntityQuery(repository, 'expense', {}, EVERY_PAGE);
  const accounts = useEntityQuery(repository, 'ledger_account', {}, EVERY_PAGE);

  const institution = institutions.data?.items[0] ?? null;
  const institutionId = institution?.id ?? null;

  const own = useMemo(
    () =>
      institutionId === null
        ? []
        : (expenses.data?.items ?? []).filter((row) => row.institution_id === institutionId),
    [expenses.data, institutionId]
  );

  const chart = useMemo(
    () =>
      institutionId === null
        ? []
        : (accounts.data?.items ?? []).filter((row) => row.institution_id === institutionId),
    [accounts.data, institutionId]
  );

  const mapping = useMemo(() => ledgerChartFromRows(chart), [chart]);

  const status: CanonicalExpenses['status'] =
    institutions.status === 'error' || expenses.status === 'error' || accounts.status === 'error'
      ? 'error'
      : institutions.status === 'loading' ||
          expenses.status === 'loading' ||
          accounts.status === 'loading'
        ? 'loading'
        : 'success';

  return {
    repository,
    status,
    error: institutions.error ?? expenses.error ?? accounts.error ?? null,
    institution,
    institutionId,
    expenses: own,
    mapping,
    refresh: () => {
      void institutions.refetch();
      void expenses.refetch();
      void accounts.refetch();
    },
  };
}
