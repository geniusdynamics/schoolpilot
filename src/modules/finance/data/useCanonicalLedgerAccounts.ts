// ABOUTME: The ledger's chart of accounts as the finance screens read it: the institution's
// ABOUTME: ledger_account rows, the posting mapping built from them, and the loading state of both.

import { useMemo } from 'react';

import { useEntityQuery } from '@/data/query';
import type { RepositoryRow } from '@/data/repository';
import {
  ledgerChartFromRows,
  type LedgerAccountMapping,
} from '@/domain/finance/ledger';

import { useFinanceRepository, type FinanceRepository } from './canonicalFinance';

const EVERY_PAGE = { allPages: true } as const;

export interface CanonicalLedgerAccounts {
  readonly repository: FinanceRepository;
  readonly status: 'loading' | 'success' | 'error';
  readonly error: unknown;
  readonly institution: RepositoryRow<'institution'> | null;
  readonly institutionId: string | null;
  readonly rows: readonly RepositoryRow<'ledger_account'>[];
  readonly mapping: LedgerAccountMapping;
  readonly refresh: () => void;
}

/** Reads the institution and every account of its chart. */
export function useCanonicalLedgerAccounts(): CanonicalLedgerAccounts {
  const repository = useFinanceRepository();
  const institutions = useEntityQuery(repository, 'institution');
  const accounts = useEntityQuery(repository, 'ledger_account', {}, EVERY_PAGE);

  const institution = institutions.data?.items[0] ?? null;
  const institutionId = institution?.id ?? null;

  const rows = useMemo(
    () =>
      institutionId === null
        ? []
        : (accounts.data?.items ?? []).filter((row) => row.institution_id === institutionId),
    [accounts.data, institutionId]
  );

  const mapping = useMemo(() => ledgerChartFromRows(rows), [rows]);

  const status: CanonicalLedgerAccounts['status'] =
    institutions.status === 'error' || accounts.status === 'error'
      ? 'error'
      : institutions.status === 'loading' || accounts.status === 'loading'
        ? 'loading'
        : 'success';

  return {
    repository,
    status,
    error: institutions.error ?? accounts.error ?? null,
    institution,
    institutionId,
    rows,
    mapping,
    refresh: () => {
      void institutions.refetch();
      void accounts.refetch();
    },
  };
}
