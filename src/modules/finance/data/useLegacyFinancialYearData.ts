// ABOUTME: The legacy 'financial_years' collection, kept for the screens that have not moved to the
// ABOUTME: canonical financial_year entity yet: the school periods screen and the setup wizard.
// ABOUTME: Its rules are the canonical ones; only the storage is different.

import { useCallback, useMemo } from 'react';
import { FinancialYear, FinancialYearStatus } from '@/core/types';
import { useDatabaseCollection } from '@/hooks/useDatabaseCollection';
import { databaseService } from '@/services/database/databaseService';
import type { ICollection } from '@/services/database/interfaces';
import { logger } from '@/utils/logging';

import {
  FinancialYearRuleError,
  buildDefaultFinancialYear,
  validateFinancialYear,
  type FinancialYearInput,
} from './useFinancialYearData';

export const FINANCIAL_YEARS_COLLECTION = 'financial_years';

/** A stored financial year; ids are strings at runtime. */
export type FinancialYearRecord = Omit<FinancialYear, 'id'> & { id: string };

const isoDay = (value: string | undefined | null): string => (value ? String(value).slice(0, 10) : '');

const toIsoDay = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

/**
 * The single current financial year: among open years, the one whose range contains today;
 * otherwise the latest one that has started; otherwise the earliest upcoming one.
 * Closed and archived years are never current.
 */
export function selectCurrentFinancialYear<T extends Pick<FinancialYearRecord, 'start_date' | 'end_date' | 'status'>>(
  years: T[],
  today: Date = new Date()
): T | undefined {
  const day = toIsoDay(today);
  const open = years
    .filter((year) => year.status === FinancialYearStatus.OPEN)
    .sort((a, b) => isoDay(a.start_date).localeCompare(isoDay(b.start_date)));
  if (open.length === 0) return undefined;

  const containing = open.find((year) => isoDay(year.start_date) <= day && day <= isoDay(year.end_date));
  if (containing) return containing;
  const started = open.filter((year) => isoDay(year.start_date) <= day);
  return started.length > 0 ? started[started.length - 1] : open[0];
}

const stamp = () => new Date().toISOString();

/**
 * Tells AppDataContext to reload its shared lookups, so pickers that read `financialYears`
 * from it (e.g. the term form) show the change at once. Unlike refreshCollection(), the
 * 'appDataChanged' event is not throttled and raises no toast.
 */
export function notifyFinancialYearsChanged(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('appDataChanged', { detail: { collection: FINANCIAL_YEARS_COLLECTION } }));
}

/**
 * Seeds one open financial year (the calendar year of `today`) when the database has none.
 * Idempotent: returns the current year when one already exists. The setup wizard calls it when a
 * school is created (wired in P0-A05).
 */
export async function ensureFinancialYear(today: Date = new Date()): Promise<FinancialYearRecord | undefined> {
  const db = await databaseService.getDatabase();
  const collection = db.getCollection(FINANCIAL_YEARS_COLLECTION) as ICollection<FinancialYearRecord> | null;
  if (!collection) {
    logger.warn(`[financialYears] Collection '${FINANCIAL_YEARS_COLLECTION}' not available; no financial year seeded`);
    return undefined;
  }

  const existing = (await collection.find({})) || [];
  if (existing.length > 0) return selectCurrentFinancialYear(existing, today) ?? existing[0];

  const now = stamp();
  const seeded: FinancialYearRecord = {
    ...buildDefaultFinancialYear(today),
    id: databaseService.generateId(),
    status: FinancialYearStatus.OPEN,
    created_at: now,
    updated_at: now,
  };
  await collection.insert(seeded);
  notifyFinancialYearsChanged();
  return seeded;
}

/** The legacy collection's hook, for the screens that still read it. */
export const useLegacyFinancialYearData = () => {
  const collection = useDatabaseCollection<FinancialYearRecord>(FINANCIAL_YEARS_COLLECTION);
  const { data, insert, update: updateDocument, refresh } = collection;

  const financialYears = useMemo(
    () => [...data].sort((a, b) => isoDay(b.start_date).localeCompare(isoDay(a.start_date))),
    [data]
  );
  const currentFinancialYear = useMemo(() => selectCurrentFinancialYear(financialYears), [financialYears]);

  const findYear = useCallback(
    (id: string) => {
      const found = financialYears.find((year) => String(year.id) === String(id));
      if (!found) throw new FinancialYearRuleError([{ code: 'not-found', message: 'Financial year not found.' }]);
      return found;
    },
    [financialYears]
  );

  const create = useCallback(
    async (input: FinancialYearInput): Promise<FinancialYearRecord> => {
      const violations = validateFinancialYear(input, financialYears);
      if (violations.length > 0) throw new FinancialYearRuleError(violations);

      const now = stamp();
      const record: FinancialYearRecord = {
        id: databaseService.generateId(),
        name: input.name.trim(),
        start_date: isoDay(input.start_date),
        end_date: isoDay(input.end_date),
        status: FinancialYearStatus.OPEN,
        created_at: now,
        updated_at: now,
      };
      await insert(record);
      notifyFinancialYearsChanged();
      return record;
    },
    [financialYears, insert]
  );

  const update = useCallback(
    async (id: string, patch: Partial<FinancialYearInput>): Promise<FinancialYearRecord | null> => {
      const current = findYear(id);
      const next: FinancialYearInput = {
        name: patch.name ?? current.name,
        start_date: patch.start_date ?? current.start_date,
        end_date: patch.end_date ?? current.end_date,
      };
      const violations = validateFinancialYear(next, financialYears, id);
      if (violations.length > 0) throw new FinancialYearRuleError(violations);

      const result = await updateDocument(String(id), {
        name: next.name.trim(),
        start_date: isoDay(next.start_date),
        end_date: isoDay(next.end_date),
        updated_at: stamp(),
      });
      notifyFinancialYearsChanged();
      return result;
    },
    [financialYears, findYear, updateDocument]
  );

  /** A year can be closed only while another open year remains to be current. */
  const canClose = useCallback(
    (id: string) => {
      const target = financialYears.find((year) => String(year.id) === String(id));
      if (!target || target.status !== FinancialYearStatus.OPEN) return false;
      return financialYears.some((year) => String(year.id) !== String(id) && year.status === FinancialYearStatus.OPEN);
    },
    [financialYears]
  );

  const setStatus = useCallback(
    async (id: string, status: FinancialYearStatus) => {
      const result = await updateDocument(String(id), { status, updated_at: stamp() });
      notifyFinancialYearsChanged();
      return result;
    },
    [updateDocument]
  );

  const close = useCallback(
    async (id: string) => {
      findYear(id);
      if (!canClose(id)) {
        throw new FinancialYearRuleError([
          {
            code: 'last-open-year',
            message: 'This is the only open financial year. Create or reopen the next financial year before closing it.',
          },
        ]);
      }
      return setStatus(id, FinancialYearStatus.CLOSED);
    },
    [findYear, canClose, setStatus]
  );

  const reopen = useCallback(
    async (id: string) => {
      findYear(id);
      return setStatus(id, FinancialYearStatus.OPEN);
    },
    [findYear, setStatus]
  );

  return {
    data: financialYears,
    financialYears,
    currentFinancialYear,
    loading: collection.loading,
    error: collection.error,
    refresh,
    create,
    update,
    close,
    reopen,
    canClose,
  };
};
