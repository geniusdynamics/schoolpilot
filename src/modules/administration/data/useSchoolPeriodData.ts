// ABOUTME: Database-backed school periods (terms, collection 'school_periods') with their business rules:
// ABOUTME: dates inside the academic year, no overlapping terms, a valid mid-term break, and one current term.

import { useCallback, useMemo } from 'react';
import { SchoolPeriod } from '@/core/types';
import { useDatabaseCollection } from '@/hooks/useDatabaseCollection';
import { databaseService } from '@/services/database/databaseService';
import type { ICollection } from '@/services/database/interfaces';
import { ACADEMIC_YEARS_COLLECTION, type AcademicYearRecord } from './useAcademicYearData';

export const SCHOOL_PERIODS_COLLECTION = 'school_periods';

/** A stored school period; every id is a string at runtime. */
export type SchoolPeriodRecord = Omit<SchoolPeriod, 'id' | 'academic_year_id' | 'financial_year_id'> & {
  id: string;
  academic_year_id: string;
  financial_year_id: string;
};

/** Editable fields of a school period, plus optional denormalized display names. */
export interface SchoolPeriodInput {
  academic_year_id: string;
  period_definition_id: string;
  financial_year_id: string;
  start_date: string;
  end_date: string;
  mid_break_start?: string | null;
  mid_break_end?: string | null;
  is_active: boolean;
  name?: string | null;
  academic_year_name?: string | null;
  period_definition_name?: string | null;
  financial_year_name?: string | null;
}

export type SchoolPeriodRuleCode =
  | 'academic-year-required'
  | 'period-definition-required'
  | 'financial-year-required'
  | 'dates-required'
  | 'end-before-start'
  | 'outside-year'
  | 'overlap'
  | 'duplicate-term'
  | 'mid-break-incomplete'
  | 'mid-break-order'
  | 'mid-break-outside-term'
  | 'not-found';

export interface SchoolPeriodRuleViolation {
  code: SchoolPeriodRuleCode;
  message: string;
}

/** Thrown by repository writes that break a school-period rule. */
export class SchoolPeriodRuleError extends Error {
  readonly violations: SchoolPeriodRuleViolation[];

  constructor(violations: SchoolPeriodRuleViolation[]) {
    super(violations.map((violation) => violation.message).join(' '));
    this.name = 'SchoolPeriodRuleError';
    this.violations = violations;
  }
}

const isoDay = (value: string | undefined | null): string => (value ? String(value).slice(0, 10) : '');
const sameId = (a: unknown, b: unknown) => String(a ?? '') === String(b ?? '');
const label = (period: Pick<SchoolPeriodRecord, 'name' | 'period_definition_name'>) =>
  period.name || period.period_definition_name || 'another term';

export interface SchoolPeriodRuleContext {
  /** All stored school periods. */
  existing: SchoolPeriodRecord[];
  /** The academic year the term belongs to, when known. */
  academicYear?: Pick<AcademicYearRecord, 'name' | 'start_date' | 'end_date'>;
  /** The id of the term being edited, excluded from overlap/duplicate checks. */
  editingId?: string;
}

/**
 * Checks a term against the rules: required links and dates, end after start, inside its academic
 * year, no overlap (inclusive of boundary days) with any other term, one term per period definition
 * per academic year, and a complete mid-term break that sits inside the term.
 */
export function validateSchoolPeriod(input: SchoolPeriodInput, context: SchoolPeriodRuleContext): SchoolPeriodRuleViolation[] {
  const violations: SchoolPeriodRuleViolation[] = [];
  const start = isoDay(input.start_date);
  const end = isoDay(input.end_date);
  const others = context.existing.filter((period) => !sameId(period.id, context.editingId));

  if (!input.academic_year_id) violations.push({ code: 'academic-year-required', message: 'Academic year is required.' });
  if (!input.period_definition_id) violations.push({ code: 'period-definition-required', message: 'Period definition is required.' });
  if (!input.financial_year_id) violations.push({ code: 'financial-year-required', message: 'Financial year is required.' });

  if (input.academic_year_id && input.period_definition_id) {
    const duplicate = others.find(
      (period) => sameId(period.academic_year_id, input.academic_year_id) && sameId(period.period_definition_id, input.period_definition_id)
    );
    if (duplicate) {
      violations.push({ code: 'duplicate-term', message: `${label(duplicate)} already exists for this academic year.` });
    }
  }

  if (!start || !end) {
    violations.push({ code: 'dates-required', message: 'Start and end dates are required.' });
    return violations;
  }
  if (end <= start) violations.push({ code: 'end-before-start', message: 'End date must be after the start date.' });

  const year = context.academicYear;
  if (year && isoDay(year.start_date) && isoDay(year.end_date) && (start < isoDay(year.start_date) || end > isoDay(year.end_date))) {
    violations.push({
      code: 'outside-year',
      message: `Term dates must fall within academic year ${year.name} (${isoDay(year.start_date)} to ${isoDay(year.end_date)}).`,
    });
  }

  const overlapping = others.find((period) => start <= isoDay(period.end_date) && isoDay(period.start_date) <= end);
  if (overlapping) {
    violations.push({
      code: 'overlap',
      message: `These dates overlap ${label(overlapping)} (${isoDay(overlapping.start_date)} to ${isoDay(overlapping.end_date)}).`,
    });
  }

  const breakStart = isoDay(input.mid_break_start);
  const breakEnd = isoDay(input.mid_break_end);
  if (breakStart || breakEnd) {
    if (!breakStart || !breakEnd) {
      violations.push({ code: 'mid-break-incomplete', message: 'Give both the mid-term break start and end dates, or neither.' });
    } else if (breakEnd < breakStart) {
      violations.push({ code: 'mid-break-order', message: 'Mid-term break end must not be before its start.' });
    } else if (breakStart <= start || breakEnd >= end) {
      violations.push({ code: 'mid-break-outside-term', message: 'The mid-term break must fall inside the term.' });
    }
  }
  return violations;
}

/** The current term: the one marked active (the newest if data predates the single-current rule). */
export function selectCurrentSchoolPeriod<T extends Pick<SchoolPeriodRecord, 'is_active' | 'start_date'>>(periods: T[]): T | undefined {
  return periods
    .filter((period) => Boolean(period.is_active))
    .sort((a, b) => isoDay(b.start_date).localeCompare(isoDay(a.start_date)))[0];
}

/**
 * Tells AppDataContext to reload its shared lookups so the fee-template, invoice and exam term
 * pickers show the change at once.
 */
export function notifySchoolPeriodsChanged(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('appDataChanged', { detail: { collection: SCHOOL_PERIODS_COLLECTION } }));
}

const stamp = () => new Date().toISOString();

async function findAll<T>(name: string): Promise<T[]> {
  const db = await databaseService.getDatabase();
  const collection = db.getCollection(name) as ICollection<T> | null;
  if (!collection || typeof collection.find !== 'function') return [];
  return (await collection.find({})) || [];
}

/** Reads the latest terms and academic years straight from the database so rules never see stale state. */
async function loadRuleContext(input: SchoolPeriodInput, editingId?: string): Promise<SchoolPeriodRuleContext> {
  const [existing, years] = await Promise.all([
    findAll<SchoolPeriodRecord>(SCHOOL_PERIODS_COLLECTION),
    findAll<AcademicYearRecord>(ACADEMIC_YEARS_COLLECTION),
  ]);
  return { existing, academicYear: years.find((year) => sameId(year.id, input.academic_year_id)), editingId };
}

const toDocument = (input: SchoolPeriodInput) => ({
  academic_year_id: String(input.academic_year_id),
  period_definition_id: String(input.period_definition_id),
  financial_year_id: String(input.financial_year_id),
  start_date: isoDay(input.start_date),
  end_date: isoDay(input.end_date),
  mid_break_start: isoDay(input.mid_break_start) || null,
  mid_break_end: isoDay(input.mid_break_end) || null,
  is_active: Boolean(input.is_active),
  name: input.name ?? null,
  academic_year_name: input.academic_year_name ?? null,
  period_definition_name: input.period_definition_name ?? null,
  financial_year_name: input.financial_year_name ?? null,
});

export const useSchoolPeriodData = () => {
  const collection = useDatabaseCollection<SchoolPeriodRecord>(SCHOOL_PERIODS_COLLECTION);
  const { data, insert, update: updateDocument, remove: removeDocument, refresh } = collection;

  const schoolPeriods = useMemo(
    () => [...data].sort((a, b) => isoDay(b.start_date).localeCompare(isoDay(a.start_date))),
    [data]
  );
  const currentSchoolPeriod = useMemo(() => selectCurrentSchoolPeriod(schoolPeriods), [schoolPeriods]);

  /** Enforces the single-current rule: every other active term is switched off. */
  const deactivateOthers = useCallback(
    async (keepId: string, context: SchoolPeriodRuleContext) => {
      const others = context.existing.filter((period) => period.is_active && !sameId(period.id, keepId));
      for (const period of others) {
        await updateDocument(String(period.id), { is_active: false, updated_at: stamp() });
      }
    },
    [updateDocument]
  );

  const create = useCallback(
    async (input: SchoolPeriodInput): Promise<SchoolPeriodRecord> => {
      const context = await loadRuleContext(input);
      const violations = validateSchoolPeriod(input, context);
      if (violations.length > 0) throw new SchoolPeriodRuleError(violations);

      const now = stamp();
      const record: SchoolPeriodRecord = {
        ...toDocument(input),
        id: databaseService.generateId(),
        created_at: now,
        updated_at: now,
      };
      if (record.is_active) await deactivateOthers(record.id, context);
      await insert(record);
      notifySchoolPeriodsChanged();
      return record;
    },
    [insert, deactivateOthers]
  );

  const update = useCallback(
    async (id: string, input: SchoolPeriodInput): Promise<SchoolPeriodRecord | null> => {
      const context = await loadRuleContext(input, String(id));
      if (!context.existing.some((period) => sameId(period.id, id))) {
        throw new SchoolPeriodRuleError([{ code: 'not-found', message: 'School period not found.' }]);
      }
      const violations = validateSchoolPeriod(input, context);
      if (violations.length > 0) throw new SchoolPeriodRuleError(violations);

      if (input.is_active) await deactivateOthers(String(id), context);
      const result = await updateDocument(String(id), { ...toDocument(input), updated_at: stamp() });
      notifySchoolPeriodsChanged();
      return result;
    },
    [updateDocument, deactivateOthers]
  );

  const remove = useCallback(
    async (id: string) => {
      const result = await removeDocument(String(id));
      notifySchoolPeriodsChanged();
      return result;
    },
    [removeDocument]
  );

  return {
    schoolPeriods,
    currentSchoolPeriod,
    loading: collection.loading,
    error: collection.error,
    refresh,
    addSchoolPeriod: create,
    updateSchoolPeriod: update,
    deleteSchoolPeriod: remove,
  };
};

// Mark this as a global provider for cross-module use
export const isGlobalProvider = true;
