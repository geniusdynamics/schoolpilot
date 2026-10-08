// ABOUTME: Database-backed financial years (collection 'financial_years') with their business rules:
// ABOUTME: valid non-overlapping date ranges, exactly one current (open) year, and default-year seeding.

import { useCallback, useMemo } from 'react';
import { FinancialYear, FinancialYearStatus } from '@/core/types';
import { useDatabaseCollection } from '@/hooks/useDatabaseCollection';
import { useAppDataInternal } from '@/hooks/useAppData';
import { databaseService } from '@/services/database/databaseService';
import type { ICollection } from '@/services/database/interfaces';
import { logger } from '@/utils/logging';

export const FINANCIAL_YEARS_COLLECTION = 'financial_years';

/** A stored financial year; ids are strings at runtime. */
export type FinancialYearRecord = Omit<FinancialYear, 'id'> & { id: string };

/** Editable fields of a financial year. */
export interface FinancialYearInput {
  name: string;
  start_date: string;
  end_date: string;
}

export type FinancialYearRuleCode =
  | 'name-required'
  | 'dates-required'
  | 'end-before-start'
  | 'overlap'
  | 'duplicate-name'
  | 'not-found'
  | 'last-open-year';

export interface FinancialYearRuleViolation {
  code: FinancialYearRuleCode;
  message: string;
}

/** Thrown by repository writes that break a financial-year rule. */
export class FinancialYearRuleError extends Error {
  readonly violations: FinancialYearRuleViolation[];

  constructor(violations: FinancialYearRuleViolation[]) {
    super(violations.map((violation) => violation.message).join(' '));
    this.name = 'FinancialYearRuleError';
    this.violations = violations;
  }
}

const isoDay = (value: string | undefined | null): string => (value ? String(value).slice(0, 10) : '');

const toIsoDay = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

/**
 * Checks a financial year against the rules: name and dates present, end after start,
 * unique name, and no overlap (inclusive of boundary days) with any other year.
 */
export function validateFinancialYear(
  input: FinancialYearInput,
  existing: FinancialYearRecord[],
  editingId?: string
): FinancialYearRuleViolation[] {
  const violations: FinancialYearRuleViolation[] = [];
  const name = (input.name || '').trim();
  const start = isoDay(input.start_date);
  const end = isoDay(input.end_date);
  const others = existing.filter((year) => String(year.id) !== String(editingId ?? ''));

  if (!name) violations.push({ code: 'name-required', message: 'Financial year name is required.' });
  if (!start || !end) {
    violations.push({ code: 'dates-required', message: 'Start and end dates are required.' });
    return violations;
  }
  if (end <= start) violations.push({ code: 'end-before-start', message: 'End date must be after the start date.' });

  if (name) {
    const duplicate = others.find((year) => (year.name || '').trim().toLowerCase() === name.toLowerCase());
    if (duplicate) violations.push({ code: 'duplicate-name', message: `A financial year named ${duplicate.name} already exists.` });
  }

  const overlapping = others.find((year) => start <= isoDay(year.end_date) && isoDay(year.start_date) <= end);
  if (overlapping) {
    violations.push({
      code: 'overlap',
      message: `This date range overlaps ${overlapping.name} (${isoDay(overlapping.start_date)} to ${isoDay(overlapping.end_date)}).`,
    });
  }
  return violations;
}

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

/** The financial year created for a new school: the calendar year containing `today`. */
export function buildDefaultFinancialYear(today: Date = new Date()): FinancialYearInput {
  const year = today.getFullYear();
  return { name: `FY ${year}`, start_date: `${year}-01-01`, end_date: `${year}-12-31` };
}

/** The year that follows the latest existing one, used to pre-fill the create form. */
export function suggestNextFinancialYear(existing: FinancialYearRecord[], today: Date = new Date()): FinancialYearInput {
  const latestEnd = existing.map((year) => isoDay(year.end_date)).filter(Boolean).sort().pop();
  if (!latestEnd) return buildDefaultFinancialYear(today);

  const start = new Date(`${latestEnd}T00:00:00`);
  start.setDate(start.getDate() + 1);
  const end = new Date(start);
  end.setFullYear(end.getFullYear() + 1);
  end.setDate(end.getDate() - 1);
  const name = start.getFullYear() === end.getFullYear() ? `FY ${start.getFullYear()}` : `FY ${start.getFullYear()}/${String(end.getFullYear()).slice(-2)}`;
  return { name, start_date: toIsoDay(start), end_date: toIsoDay(end) };
}

const stamp = () => new Date().toISOString();

/**
 * Seeds one open financial year (the calendar year of `today`) when the database has none.
 * Idempotent: returns the current year when one already exists. Called at school creation.
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
  return seeded;
}

export const useFinancialYearData = () => {
  const collection = useDatabaseCollection<FinancialYearRecord>(FINANCIAL_YEARS_COLLECTION);
  const appData = useAppDataInternal();
  const { data, insert, update: updateDocument, refresh } = collection;

  const financialYears = useMemo(
    () => [...data].sort((a, b) => isoDay(b.start_date).localeCompare(isoDay(a.start_date))),
    [data]
  );
  const currentFinancialYear = useMemo(() => selectCurrentFinancialYear(financialYears), [financialYears]);

  /** Pickers elsewhere (e.g. the term form) read the shared app data snapshot; refresh it after writes. */
  const syncSharedLookups = useCallback(async () => {
    try {
      await appData?.refreshCollection?.(FINANCIAL_YEARS_COLLECTION);
    } catch (err) {
      logger.warn('[financialYears] Could not refresh shared financial year lookups:', err);
    }
  }, [appData]);

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
      const created = await insert({
        name: input.name.trim(),
        start_date: isoDay(input.start_date),
        end_date: isoDay(input.end_date),
        status: FinancialYearStatus.OPEN,
        created_at: now,
        updated_at: now,
      });
      await syncSharedLookups();
      return created as FinancialYearRecord;
    },
    [financialYears, insert, syncSharedLookups]
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
      await syncSharedLookups();
      return result;
    },
    [financialYears, findYear, updateDocument, syncSharedLookups]
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
      await syncSharedLookups();
      return result;
    },
    [updateDocument, syncSharedLookups]
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
