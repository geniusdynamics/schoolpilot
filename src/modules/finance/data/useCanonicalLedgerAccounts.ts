// ABOUTME: The ledger's chart of accounts as the finance screens read it: the institution's
// ABOUTME: ledger_account rows, the channel nominations that name them, the posting mapping built
// ABOUTME: from both, and the loading state of all three.

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
  /** The school's bank accounts, with their bank details around a GL account. */
  readonly bankRows: readonly RepositoryRow<'bank_account'>[];
  /** The account each channel posts to, where the school nominated one. */
  readonly channelRows: readonly RepositoryRow<'channel_account'>[];
  readonly mapping: LedgerAccountMapping;
  readonly refresh: () => void;
}

/** Reads the institution, every account of its chart, its bank accounts and its channel nominations. */
export function useCanonicalLedgerAccounts(): CanonicalLedgerAccounts {
  const repository = useFinanceRepository();
  const institutions = useEntityQuery(repository, 'institution');
  const accounts = useEntityQuery(repository, 'ledger_account', {}, EVERY_PAGE);
  const banks = useEntityQuery(repository, 'bank_account', {}, EVERY_PAGE);
  const channels = useEntityQuery(repository, 'channel_account', {}, EVERY_PAGE);

  const institution = institutions.data?.items[0] ?? null;
  const institutionId = institution?.id ?? null;

  const rows = useMemo(
    () =>
      institutionId === null
        ? []
        : (accounts.data?.items ?? []).filter((row) => row.institution_id === institutionId),
    [accounts.data, institutionId]
  );

  const bankRows = useMemo(
    () =>
      institutionId === null
        ? []
        : (banks.data?.items ?? []).filter((row) => row.institution_id === institutionId),
    [banks.data, institutionId]
  );

  const channelRows = useMemo(
    () =>
      institutionId === null
        ? []
        : (channels.data?.items ?? []).filter((row) => row.institution_id === institutionId),
    [channels.data, institutionId]
  );

  const mapping = useMemo(
    () => ledgerChartFromRows(rows, { channelRows }),
    [rows, channelRows]
  );

  const status: CanonicalLedgerAccounts['status'] =
    institutions.status === 'error' ||
    accounts.status === 'error' ||
    banks.status === 'error' ||
    channels.status === 'error'
      ? 'error'
      : institutions.status === 'loading' ||
          accounts.status === 'loading' ||
          banks.status === 'loading' ||
          channels.status === 'loading'
        ? 'loading'
        : 'success';

  return {
    repository,
    status,
    error: institutions.error ?? accounts.error ?? banks.error ?? channels.error ?? null,
    institution,
    institutionId,
    rows,
    bankRows,
    channelRows,
    mapping,
    refresh: () => {
      void institutions.refetch();
      void accounts.refetch();
      void banks.refetch();
      void channels.refetch();
    },
  };
}
