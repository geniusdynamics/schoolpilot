// ABOUTME: The hook the accounting report pages read through: it holds the ledger service (built
// ABOUTME: over the canonical adapter, or supplied by the caller) and derives every report from the
// ABOUTME: entries the ledger returns for the chosen period and date range. It owns no arithmetic of
// ABOUTME: its own; every figure comes from the ledger's derivations in accountingReports.ts.

import { useCallback, useEffect, useMemo, useState } from 'react';

import type { SqliteAdapter } from '@/data/adapters/sqlite';
import {
  createSqliteLedgerStore,
  ensureLedgerSchema,
  LedgerService,
  type JournalEntry,
  type LedgerPeriod,
} from '@/domain/finance/ledger';
import type { CurrencyCode } from '@/domain/money';

import {
  balanceSheetReport,
  bankBookReport,
  budgetVsActualReport,
  cashBookReport,
  createAccountClasses,
  entriesInRange,
  incomeExpenditureReport,
  periodCloseReport,
  trialBalanceReport,
  type BalanceSheetReport,
  type BookReport,
  type BudgetLine,
  type BudgetVsActualReport,
  type DateRange,
  type IncomeExpenditureReport,
  type PeriodCloseReport,
  type TrialBalanceReport,
} from './accountingReports';

/** The currency the finance documents are written in until the currency table arrives (spec 05 §1). */
export const REPORT_CURRENCY: CurrencyCode = 'KES';

/**
 * Opens a ledger over an already-open adapter.
 *
 * `ensureLedgerSchema` applies the ledger's DDL (and the audit table it writes into) once and is
 * safe to call repeatedly. The ledger's tables have no canonical migration yet, so the provider
 * that hands this an adapter is the seam that applies them.
 */
export async function openLedgerOver(adapter: SqliteAdapter): Promise<LedgerService> {
  await ensureLedgerSchema(adapter);
  return new LedgerService({ store: createSqliteLedgerStore(adapter) });
}

/** What the accounting report pages hand the hook. */
export interface AccountingReportsOptions {
  /** A ledger the caller already holds. Takes precedence over `adapter`. */
  readonly ledger?: LedgerService | null;
  /** The storage the ledger is built over when no service is supplied. */
  readonly adapter?: SqliteAdapter | null;
  readonly institutionId?: string;
  readonly currency?: CurrencyCode;
  /** The first day the period reports cover. Null is open. */
  readonly from?: string | null;
  /** The last day, and the date the balances are as of. Null is open. */
  readonly to?: string | null;
  /** The stored budget figures the budget-versus-actual report compares against. */
  readonly budget?: readonly BudgetLine[];
}

export interface AccountingReportsState {
  readonly status: 'unavailable' | 'loading' | 'ready' | 'error';
  readonly error: unknown;
  /** The currency every report is counted in. */
  readonly currency: CurrencyCode;
  /** The entries the ledger returned, oldest first, as of `to`. */
  readonly entries: readonly JournalEntry[];
  readonly periods: readonly LedgerPeriod[];
  readonly trialBalance: TrialBalanceReport | null;
  readonly incomeExpenditure: IncomeExpenditureReport | null;
  readonly balanceSheet: BalanceSheetReport | null;
  readonly cashBook: BookReport | null;
  readonly bankBook: BookReport | null;
  readonly budgetVsActual: BudgetVsActualReport | null;
  readonly periodClose: PeriodCloseReport | null;
  readonly refresh: () => void;
}

/** Builds a ledger from the adapter once, when no service is supplied. */
function useLedgerFromAdapter(
  ledger: LedgerService | null | undefined,
  adapter: SqliteAdapter | null | undefined
): { readonly ledger: LedgerService | null; readonly status: AccountingReportsState['status']; readonly error: unknown } {
  const [opened, setOpened] = useState<LedgerService | null>(null);
  const [failure, setFailure] = useState<unknown>(null);

  useEffect(() => {
    if (ledger || !adapter) {
      setOpened(null);
      return;
    }
    let cancelled = false;
    void openLedgerOver(adapter)
      .then((service) => {
        if (!cancelled) setOpened(service);
      })
      .catch((error: unknown) => {
        if (!cancelled) setFailure(error);
      });
    return () => {
      cancelled = true;
    };
  }, [ledger, adapter]);

  if (ledger) return { ledger, status: 'ready', error: null };
  if (failure) return { ledger: null, status: 'error', error: failure };
  if (!adapter) return { ledger: null, status: 'unavailable', error: null };
  return { ledger: opened, status: opened ? 'ready' : 'loading', error: null };
}

/**
 * Reads the ledger and derives every accounting report.
 *
 * The trial balance and the balance sheet are cumulative as of `to` (a balance is a position at a
 * date); the income-and-expenditure statement, the budget comparison and the books' lines cover
 * `from..to`; a book's opening is the account's balance before `from`, so its closing always equals
 * the account balance the ledger reports.
 */
export function useAccountingReports(options: AccountingReportsOptions = {}): AccountingReportsState {
  const currency = options.currency ?? REPORT_CURRENCY;
  const resolved = useLedgerFromAdapter(options.ledger, options.adapter);
  const ledger = resolved.ledger;

  const [entries, setEntries] = useState<readonly JournalEntry[]>([]);
  const [periods, setPeriods] = useState<readonly LedgerPeriod[]>([]);
  const [loadStatus, setLoadStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [loadError, setLoadError] = useState<unknown>(null);
  const [nonce, setNonce] = useState(0);
  const refresh = useCallback(() => setNonce((value) => value + 1), []);

  const institutionId = options.institutionId;
  const to = options.to ?? null;

  useEffect(() => {
    if (!ledger) {
      setEntries([]);
      setPeriods([]);
      setLoadStatus('idle');
      return;
    }
    let cancelled = false;
    setLoadStatus('loading');
    void (async () => {
      try {
        const [loadedEntries, loadedPeriods] = await Promise.all([
          ledger.listEntries({ ...(institutionId ? { institutionId } : {}), ...(to ? { asOf: to } : {}) }),
          institutionId ? ledger.periods(institutionId) : Promise.resolve([] as readonly LedgerPeriod[]),
        ]);
        if (cancelled) return;
        setEntries(loadedEntries);
        setPeriods(loadedPeriods);
        setLoadStatus('ready');
        setLoadError(null);
      } catch (error: unknown) {
        if (cancelled) return;
        setLoadError(error);
        setLoadStatus('error');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ledger, institutionId, to, nonce]);

  const classes = useMemo(() => createAccountClasses(), []);
  const range = useMemo<DateRange>(
    () => ({ from: options.from ?? null, to: options.to ?? null }),
    [options.from, options.to]
  );
  const periodEntries = useMemo(() => entriesInRange(entries, range), [entries, range]);

  const trialBalance = useMemo(
    () => (entries.length > 0 || loadStatus === 'ready' ? trialBalanceReport(entries, currency) : null),
    [entries, currency, loadStatus]
  );
  const incomeExpenditure = useMemo(
    () =>
      entries.length > 0 || loadStatus === 'ready'
        ? incomeExpenditureReport(periodEntries, currency, classes)
        : null,
    [periodEntries, entries.length, currency, classes, loadStatus]
  );
  const balanceSheet = useMemo(
    () =>
      entries.length > 0 || loadStatus === 'ready'
        ? balanceSheetReport(entries, currency, classes)
        : null,
    [entries, currency, classes, loadStatus]
  );
  const cashBook = useMemo(
    () =>
      entries.length > 0 || loadStatus === 'ready'
        ? cashBookReport(entries, currency, range)
        : null,
    [entries, currency, range, loadStatus]
  );
  const bankBook = useMemo(
    () =>
      entries.length > 0 || loadStatus === 'ready'
        ? bankBookReport(entries, currency, range)
        : null,
    [entries, currency, range, loadStatus]
  );
  const budgetVsActual = useMemo(
    () =>
      entries.length > 0 || loadStatus === 'ready'
        ? budgetVsActualReport(periodEntries, currency, options.budget ?? [], classes)
        : null,
    [periodEntries, entries.length, currency, options.budget, classes, loadStatus]
  );
  const periodClose = useMemo(() => periodCloseReport(periods), [periods]);

  const status: AccountingReportsState['status'] =
    resolved.status === 'unavailable' || resolved.status === 'error'
      ? resolved.status
      : loadStatus === 'error'
        ? 'error'
        : loadStatus === 'ready' || resolved.status === 'ready'
          ? 'ready'
          : 'loading';

  return {
    status,
    error: resolved.error ?? loadError,
    currency,
    entries,
    periods,
    trialBalance,
    incomeExpenditure,
    balanceSheet,
    cashBook,
    bankBook,
    budgetVsActual,
    periodClose,
    refresh,
  };
}
