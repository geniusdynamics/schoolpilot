// ABOUTME: Repository tests for school periods (terms): date validation inside the academic year, no overlap,
// ABOUTME: a single current term, persistence to 'school_periods', and the database-backed year/definition pickers.

import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  useSchoolPeriodData,
  validateSchoolPeriod,
  SchoolPeriodRuleError,
  type SchoolPeriodInput,
  type SchoolPeriodRecord,
} from '../useSchoolPeriodData';
import { useAcademicYearData, type AcademicYearRecord } from '../useAcademicYearData';
import { useAcademicPeriodDefinitionData } from '../useAcademicPeriodDefinitionData';
import { databaseService } from '@/services/database/databaseService';

vi.mock('@/services/database/databaseService', () => ({
  databaseService: {
    getDatabase: vi.fn(),
    generateId: vi.fn(),
  },
}));

/** AppDataContext reloads shared lookups (the fee and exam term pickers) on this event. */
const appDataChanged = vi.fn();
window.addEventListener('appDataChanged', (event) => appDataChanged((event as CustomEvent).detail));

type Row = { id: string } & Record<string, unknown>;

function createMemoryCollection(seed: Row[]) {
  let rows = seed.map((row) => ({ ...row }));
  return {
    rows: () => rows,
    find: vi.fn(async () => rows.map((row) => ({ ...row }))),
    insert: vi.fn(async (doc: Row) => {
      rows = [...rows, { ...doc }];
      return { ...doc };
    }),
    update: vi.fn(async (id: string, patch: Record<string, unknown>) => {
      rows = rows.map((row) => (row.id === id ? { ...row, ...patch } : row));
      return rows.find((row) => row.id === id) ?? null;
    }),
    remove: vi.fn(async (id: string) => {
      rows = rows.filter((row) => row.id !== id);
      return true;
    }),
  };
}

const year2027: AcademicYearRecord = {
  id: 'ay-2027',
  name: '2027',
  structure_id: 'st-1',
  start_date: '2027-01-04',
  end_date: '2027-11-26',
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
};

const term = (id: string, start: string, end: string, extra: Partial<SchoolPeriodRecord> = {}): SchoolPeriodRecord => ({
  id,
  academic_year_id: 'ay-2027',
  period_definition_id: `pd-${id}`,
  financial_year_id: 'fy-2027',
  start_date: start,
  end_date: end,
  is_active: false,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
  ...extra,
});

const input = (overrides: Partial<SchoolPeriodInput> = {}): SchoolPeriodInput => ({
  academic_year_id: 'ay-2027',
  period_definition_id: 'pd-term-2',
  financial_year_id: 'fy-2027',
  start_date: '2027-05-03',
  end_date: '2027-08-06',
  is_active: false,
  ...overrides,
});

let collections: Record<string, ReturnType<typeof createMemoryCollection>>;
let idCounter = 0;

function useDatabaseWith(seed: { periods?: Row[]; years?: Row[]; definitions?: Row[] }) {
  collections = {
    school_periods: createMemoryCollection(seed.periods ?? []),
    academic_years: createMemoryCollection(seed.years ?? []),
    academic_period_definitions: createMemoryCollection(seed.definitions ?? []),
  };
  vi.mocked(databaseService.getDatabase).mockResolvedValue({
    getCollection: (name: string) => collections[name] ?? null,
  } as never);
}

beforeEach(() => {
  vi.clearAllMocks();
  idCounter = 0;
  vi.mocked(databaseService.generateId).mockImplementation(() => `sp-new-${++idCounter}`);
});

describe('validateSchoolPeriod', () => {
  const existing = [term('t1', '2027-01-04', '2027-04-02')];
  const codes = (violations: { code: string }[]) => violations.map((violation) => violation.code);

  it('accepts a term inside the academic year that does not overlap another term', () => {
    expect(validateSchoolPeriod(input(), { existing, academicYear: year2027 })).toEqual([]);
  });

  it('requires the academic year, period definition, financial year and both dates', () => {
    const violations = validateSchoolPeriod(
      input({ academic_year_id: '', period_definition_id: '', financial_year_id: '', start_date: '', end_date: '' }),
      { existing, academicYear: undefined }
    );
    expect(codes(violations)).toEqual(expect.arrayContaining(['academic-year-required', 'period-definition-required', 'financial-year-required', 'dates-required']));
  });

  it('rejects an end date on or before the start date', () => {
    expect(codes(validateSchoolPeriod(input({ end_date: '2027-05-03' }), { existing, academicYear: year2027 }))).toContain('end-before-start');
  });

  it('rejects a term that starts before or ends after its academic year', () => {
    expect(codes(validateSchoolPeriod(input({ start_date: '2026-12-01' }), { existing: [], academicYear: year2027 }))).toContain('outside-year');
    expect(codes(validateSchoolPeriod(input({ end_date: '2027-12-15' }), { existing: [], academicYear: year2027 }))).toContain('outside-year');
  });

  it('rejects a term overlapping another term, including a shared boundary day', () => {
    const violations = validateSchoolPeriod(input({ start_date: '2027-04-02' }), { existing, academicYear: year2027 });
    expect(codes(violations)).toContain('overlap');
    expect(violations.find((violation) => violation.code === 'overlap')?.message).toMatch(/2027-01-04 to 2027-04-02/);
  });

  it('ignores the term being edited when checking overlap', () => {
    expect(validateSchoolPeriod(input({ start_date: '2027-01-04', end_date: '2027-04-09' }), { existing, academicYear: year2027, editingId: 't1' })).toEqual([]);
  });

  it('rejects the same period definition twice in one academic year', () => {
    const violations = validateSchoolPeriod(input({ period_definition_id: 'pd-t1' }), { existing, academicYear: year2027 });
    expect(codes(violations)).toContain('duplicate-term');
  });

  it('requires a mid-term break to be complete, ordered and inside the term', () => {
    expect(codes(validateSchoolPeriod(input({ mid_break_start: '2027-06-10' }), { existing, academicYear: year2027 }))).toContain('mid-break-incomplete');
    expect(codes(validateSchoolPeriod(input({ mid_break_start: '2027-06-10', mid_break_end: '2027-06-09' }), { existing, academicYear: year2027 }))).toContain('mid-break-order');
    expect(codes(validateSchoolPeriod(input({ mid_break_start: '2027-04-30', mid_break_end: '2027-05-04' }), { existing, academicYear: year2027 }))).toContain('mid-break-outside-term');
    expect(validateSchoolPeriod(input({ mid_break_start: '2027-06-10', mid_break_end: '2027-06-14' }), { existing, academicYear: year2027 })).toEqual([]);
  });
});

describe('useSchoolPeriodData', () => {
  it('lists school periods stored in the database', async () => {
    useDatabaseWith({ periods: [term('t1', '2027-01-04', '2027-04-02', { name: 'Term 1 - 2027' })], years: [year2027] });
    const { result } = renderHook(() => useSchoolPeriodData());

    await waitFor(() => expect(result.current.schoolPeriods).toHaveLength(1));
    expect(result.current.schoolPeriods[0]).toMatchObject({ id: 't1', name: 'Term 1 - 2027' });
  });

  it('persists a valid term with string ids and notifies the shared pickers', async () => {
    useDatabaseWith({ periods: [], years: [year2027] });
    const { result } = renderHook(() => useSchoolPeriodData());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.addSchoolPeriod({ ...input(), name: 'Term 2 - 2027' });
    });

    expect(collections.school_periods.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'sp-new-1',
        academic_year_id: 'ay-2027',
        period_definition_id: 'pd-term-2',
        financial_year_id: 'fy-2027',
        start_date: '2027-05-03',
        end_date: '2027-08-06',
        name: 'Term 2 - 2027',
      })
    );
    await waitFor(() => expect(result.current.schoolPeriods).toHaveLength(1));
    expect(appDataChanged).toHaveBeenCalledWith({ collection: 'school_periods' });
  });

  it('refuses to save a term outside its academic year', async () => {
    useDatabaseWith({ periods: [], years: [year2027] });
    const { result } = renderHook(() => useSchoolPeriodData());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await expect(result.current.addSchoolPeriod(input({ start_date: '2026-12-01' }))).rejects.toBeInstanceOf(SchoolPeriodRuleError);
    expect(collections.school_periods.insert).not.toHaveBeenCalled();
  });

  it('keeps exactly one current term: activating one deactivates the others', async () => {
    useDatabaseWith({
      periods: [term('t1', '2027-01-04', '2027-04-02', { is_active: true }), term('t2', '2027-05-03', '2027-08-06')],
      years: [year2027],
    });
    const { result } = renderHook(() => useSchoolPeriodData());
    await waitFor(() => expect(result.current.schoolPeriods).toHaveLength(2));

    await act(async () => {
      await result.current.updateSchoolPeriod('t2', { ...input({ period_definition_id: 'pd-t2' }), is_active: true });
    });

    const stored = collections.school_periods.rows();
    expect(stored.filter((row) => row.is_active)).toEqual([expect.objectContaining({ id: 't2' })]);
    await waitFor(() => expect(result.current.currentSchoolPeriod?.id).toBe('t2'));
  });

  it('updates and deletes by string id', async () => {
    useDatabaseWith({ periods: [term('t1', '2027-01-04', '2027-04-02')], years: [year2027] });
    const { result } = renderHook(() => useSchoolPeriodData());
    await waitFor(() => expect(result.current.schoolPeriods).toHaveLength(1));

    await act(async () => {
      await result.current.updateSchoolPeriod('t1', input({ period_definition_id: 'pd-t1', start_date: '2027-01-05', end_date: '2027-04-02' }));
    });
    expect(collections.school_periods.update).toHaveBeenCalledWith('t1', expect.objectContaining({ start_date: '2027-01-05' }));

    await act(async () => {
      await result.current.deleteSchoolPeriod('t1');
    });
    expect(collections.school_periods.remove).toHaveBeenCalledWith('t1');
    await waitFor(() => expect(result.current.schoolPeriods).toHaveLength(0));
  });
});

describe('academic year and period definition pickers', () => {
  it('read academic years from the database, newest first', async () => {
    useDatabaseWith({ years: [{ ...year2027, id: 'ay-2026', name: '2026', start_date: '2026-01-05' }, year2027] });
    const { result } = renderHook(() => useAcademicYearData());

    await waitFor(() => expect(result.current.data.map((year) => year.name)).toEqual(['2027', '2026']));
  });

  it('read period definitions from the database in sequence order', async () => {
    useDatabaseWith({
      definitions: [
        { id: 'pd-2', structure_id: 'st-1', name: 'Term 2', sequence_order: 2 },
        { id: 'pd-1', structure_id: 'st-1', name: 'Term 1', sequence_order: 1 },
      ],
    });
    const { result } = renderHook(() => useAcademicPeriodDefinitionData());

    await waitFor(() => expect(result.current.data.map((definition) => definition.name)).toEqual(['Term 1', 'Term 2']));
  });
});
