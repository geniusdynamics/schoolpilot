// ABOUTME: Repository tests for financial years: date/overlap validation, the single-current rule,
// ABOUTME: persistence to the 'financial_years' collection, shared-picker notification and default-year seeding.

import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  buildDefaultFinancialYear,
  ensureFinancialYear,
  selectCurrentFinancialYear,
  useFinancialYearData,
  validateFinancialYear,
  type FinancialYearRecord,
} from '../useFinancialYearData';
import { FinancialYearStatus } from '@/core/types';
import { databaseService } from '@/services/database/databaseService';

vi.mock('@/services/database/databaseService', () => ({
  databaseService: {
    getDatabase: vi.fn(),
    generateId: vi.fn(),
  },
}));

/** Counts the 'appDataChanged' events that make AppDataContext reload the shared pickers (e.g. the term form). */
const appDataChanged = vi.fn();
window.addEventListener('appDataChanged', () => appDataChanged());

const year = (id: string, name: string, start: string, end: string, status = FinancialYearStatus.OPEN): FinancialYearRecord => ({
  id,
  name,
  start_date: start,
  end_date: end,
  status,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
});

/** In-memory stand-in for the database collection, so writes are observable through find(). */
function createMemoryCollection(seed: FinancialYearRecord[]) {
  let rows = seed.map((row) => ({ ...row }));
  return {
    rows: () => rows,
    find: vi.fn(async () => rows.map((row) => ({ ...row }))),
    insert: vi.fn(async (doc: FinancialYearRecord) => {
      rows = [...rows, { ...doc }];
      return { id: doc.id, doc, ok: true };
    }),
    update: vi.fn(async (id: string, patch: Partial<FinancialYearRecord>) => {
      rows = rows.map((row) => (row.id === id ? { ...row, ...patch } : row));
      return rows.find((row) => row.id === id) ?? null;
    }),
    remove: vi.fn(async (id: string) => {
      rows = rows.filter((row) => row.id !== id);
      return { id, ok: true };
    }),
  };
}

let collection: ReturnType<typeof createMemoryCollection>;
let idCounter = 0;

function useDatabaseWith(seed: FinancialYearRecord[]) {
  collection = createMemoryCollection(seed);
  vi.mocked(databaseService.getDatabase).mockResolvedValue({
    getCollection: (name: string) => (name === 'financial_years' ? collection : null),
  } as never);
}

beforeEach(() => {
  vi.clearAllMocks();
  idCounter = 0;
  vi.mocked(databaseService.generateId).mockImplementation(() => `fy-new-${++idCounter}`);
});

describe('validateFinancialYear', () => {
  const existing = [year('fy-2025', 'FY 2025', '2025-01-01', '2025-12-31')];

  it('accepts a year that starts the day after an existing one ends', () => {
    expect(validateFinancialYear({ name: 'FY 2026', start_date: '2026-01-01', end_date: '2026-12-31' }, existing)).toEqual([]);
  });

  it('rejects an end date on or before the start date', () => {
    const errors = validateFinancialYear({ name: 'FY 2026', start_date: '2026-12-31', end_date: '2026-01-01' }, existing);
    expect(errors.map((e) => e.code)).toContain('end-before-start');
  });

  it('rejects a date range that overlaps an existing year, including a shared boundary day', () => {
    const inside = validateFinancialYear({ name: 'FY X', start_date: '2025-06-01', end_date: '2026-05-31' }, existing);
    const boundary = validateFinancialYear({ name: 'FY Y', start_date: '2025-12-31', end_date: '2026-12-30' }, existing);
    expect(inside.map((e) => e.code)).toContain('overlap');
    expect(boundary.map((e) => e.code)).toContain('overlap');
  });

  it('ignores the year being edited when checking overlap', () => {
    expect(validateFinancialYear({ name: 'FY 2025', start_date: '2025-02-01', end_date: '2026-01-31' }, existing, 'fy-2025')).toEqual([]);
  });

  it('rejects a duplicate name regardless of case', () => {
    const errors = validateFinancialYear({ name: 'fy 2025', start_date: '2027-01-01', end_date: '2027-12-31' }, existing);
    expect(errors.map((e) => e.code)).toContain('duplicate-name');
  });

  it('requires a name and both dates', () => {
    const codes = validateFinancialYear({ name: ' ', start_date: '', end_date: '' }, existing).map((e) => e.code);
    expect(codes).toEqual(expect.arrayContaining(['name-required', 'dates-required']));
  });
});

describe('selectCurrentFinancialYear (single-current rule)', () => {
  const today = new Date('2026-03-15T12:00:00Z');

  it('picks the open year whose range contains today, even when an earlier year is still open', () => {
    const years = [
      year('fy-2025', 'FY 2025', '2025-01-01', '2025-12-31'),
      year('fy-2026', 'FY 2026', '2026-01-01', '2026-12-31'),
    ];
    expect(selectCurrentFinancialYear(years, today)?.id).toBe('fy-2026');
  });

  it('never treats a closed year as current', () => {
    const years = [
      year('fy-2025', 'FY 2025', '2025-01-01', '2025-12-31'),
      year('fy-2026', 'FY 2026', '2026-01-01', '2026-12-31', FinancialYearStatus.CLOSED),
    ];
    expect(selectCurrentFinancialYear(years, today)?.id).toBe('fy-2025');
  });

  it('returns exactly one year when no open year contains today (latest started one wins)', () => {
    const years = [
      year('fy-2023', 'FY 2023', '2023-01-01', '2023-12-31'),
      year('fy-2024', 'FY 2024', '2024-01-01', '2024-12-31'),
      year('fy-2030', 'FY 2030', '2030-01-01', '2030-12-31'),
    ];
    expect(selectCurrentFinancialYear(years, today)?.id).toBe('fy-2024');
  });

  it('falls back to the earliest upcoming open year when every open year is in the future', () => {
    const years = [
      year('fy-2028', 'FY 2028', '2028-01-01', '2028-12-31'),
      year('fy-2027', 'FY 2027', '2027-01-01', '2027-12-31'),
    ];
    expect(selectCurrentFinancialYear(years, today)?.id).toBe('fy-2027');
  });

  it('returns undefined when there is no open year', () => {
    expect(selectCurrentFinancialYear([year('a', 'A', '2026-01-01', '2026-12-31', FinancialYearStatus.CLOSED)], today)).toBeUndefined();
  });
});

describe('useFinancialYearData', () => {
  it('loads financial years from the database and exposes the current one', async () => {
    useDatabaseWith([year('fy-2026', 'FY 2026', '2026-01-01', '2026-12-31')]);
    const { result } = renderHook(() => useFinancialYearData());

    await waitFor(() => expect(result.current.financialYears).toHaveLength(1));
    expect(result.current.currentFinancialYear?.id).toBe('fy-2026');
  });

  it('persists a new year with a string id and refreshes the shared picker data', async () => {
    useDatabaseWith([year('fy-2026', 'FY 2026', '2026-01-01', '2026-12-31')]);
    const { result } = renderHook(() => useFinancialYearData());
    await waitFor(() => expect(result.current.financialYears).toHaveLength(1));

    await act(async () => {
      await result.current.create({ name: 'FY 2027', start_date: '2027-01-01', end_date: '2027-12-31' });
    });

    expect(collection.rows()).toHaveLength(2);
    const created = collection.rows().find((row) => row.name === 'FY 2027');
    expect(created).toMatchObject({ id: 'fy-new-1', status: FinancialYearStatus.OPEN });
    await waitFor(() => expect(result.current.financialYears).toHaveLength(2));
    expect(appDataChanged).toHaveBeenCalledTimes(1);
  });

  it('notifies the shared pickers after every write, with no throttling between quick successive writes', async () => {
    useDatabaseWith([year('fy-2026', 'FY 2026', '2026-01-01', '2026-12-31')]);
    const { result } = renderHook(() => useFinancialYearData());
    await waitFor(() => expect(result.current.financialYears).toHaveLength(1));

    await act(async () => {
      await result.current.create({ name: 'FY 2027', start_date: '2027-01-01', end_date: '2027-12-31' });
    });
    await waitFor(() => expect(result.current.financialYears).toHaveLength(2));
    await act(async () => {
      await result.current.create({ name: 'FY 2028', start_date: '2028-01-01', end_date: '2028-12-31' });
    });

    expect(collection.rows().map((row) => row.name)).toEqual(['FY 2026', 'FY 2027', 'FY 2028']);
    expect(appDataChanged).toHaveBeenCalledTimes(2);
  });

  it('returns the stored record (with its string id) from create', async () => {
    useDatabaseWith([]);
    const { result } = renderHook(() => useFinancialYearData());
    await waitFor(() => expect(result.current.loading).toBe(false));

    let created: FinancialYearRecord | undefined;
    await act(async () => {
      created = await result.current.create({ name: 'FY 2027', start_date: '2027-01-01', end_date: '2027-12-31' });
    });
    expect(created).toMatchObject({ id: 'fy-new-1', name: 'FY 2027', status: FinancialYearStatus.OPEN });
  });

  it('rejects an overlapping year without writing it', async () => {
    useDatabaseWith([year('fy-2026', 'FY 2026', '2026-01-01', '2026-12-31')]);
    const { result } = renderHook(() => useFinancialYearData());
    await waitFor(() => expect(result.current.financialYears).toHaveLength(1));

    await expect(
      result.current.create({ name: 'FY Overlap', start_date: '2026-07-01', end_date: '2027-06-30' })
    ).rejects.toThrow(/overlaps FY 2026/);
    expect(collection.insert).not.toHaveBeenCalled();
  });

  it('validates edits against the other years and keeps the id as a string', async () => {
    useDatabaseWith([
      year('fy-2025', 'FY 2025', '2025-01-01', '2025-12-31'),
      year('fy-2026', 'FY 2026', '2026-01-01', '2026-12-31'),
    ]);
    const { result } = renderHook(() => useFinancialYearData());
    await waitFor(() => expect(result.current.financialYears).toHaveLength(2));

    await expect(result.current.update('fy-2026', { start_date: '2025-12-01' })).rejects.toThrow(/overlaps FY 2025/);

    await act(async () => {
      await result.current.update('fy-2026', { name: 'FY 2026/27' });
    });
    expect(collection.update).toHaveBeenCalledWith('fy-2026', expect.objectContaining({ name: 'FY 2026/27' }));
  });

  it('refuses to close the only open year so that one current year always remains', async () => {
    useDatabaseWith([
      year('fy-2025', 'FY 2025', '2025-01-01', '2025-12-31', FinancialYearStatus.CLOSED),
      year('fy-2026', 'FY 2026', '2026-01-01', '2026-12-31'),
    ]);
    const { result } = renderHook(() => useFinancialYearData());
    await waitFor(() => expect(result.current.financialYears).toHaveLength(2));

    expect(result.current.canClose('fy-2026')).toBe(false);
    await expect(result.current.close('fy-2026')).rejects.toThrow(/only open financial year/);
    expect(collection.update).not.toHaveBeenCalled();
    expect(appDataChanged).not.toHaveBeenCalled();
  });

  it('closes a year when another open year remains, and the remaining open year becomes current', async () => {
    useDatabaseWith([
      year('fy-2025', 'FY 2025', '2025-01-01', '2025-12-31'),
      year('fy-2026', 'FY 2026', '2026-01-01', '2026-12-31'),
    ]);
    const { result } = renderHook(() => useFinancialYearData());
    await waitFor(() => expect(result.current.financialYears).toHaveLength(2));

    expect(result.current.canClose('fy-2025')).toBe(true);
    await act(async () => {
      await result.current.close('fy-2025');
    });

    expect(collection.rows().find((row) => row.id === 'fy-2025')?.status).toBe(FinancialYearStatus.CLOSED);
    await waitFor(() => expect(result.current.currentFinancialYear?.id).toBe('fy-2026'));
    const openYears = result.current.financialYears.filter((fy) => fy.status === FinancialYearStatus.OPEN);
    expect(openYears).toHaveLength(1);
  });

  it('reopens a closed year', async () => {
    useDatabaseWith([
      year('fy-2025', 'FY 2025', '2025-01-01', '2025-12-31', FinancialYearStatus.CLOSED),
      year('fy-2026', 'FY 2026', '2026-01-01', '2026-12-31'),
    ]);
    const { result } = renderHook(() => useFinancialYearData());
    await waitFor(() => expect(result.current.financialYears).toHaveLength(2));

    await act(async () => {
      await result.current.reopen('fy-2025');
    });
    expect(collection.rows().find((row) => row.id === 'fy-2025')?.status).toBe(FinancialYearStatus.OPEN);
  });
});

describe('default financial year seeding', () => {
  it('builds a calendar-year financial year for the given date', () => {
    expect(buildDefaultFinancialYear(new Date('2026-10-08T09:00:00Z'))).toEqual({
      name: 'FY 2026',
      start_date: '2026-01-01',
      end_date: '2026-12-31',
    });
  });

  it('seeds exactly one open financial year when none exist, and is idempotent', async () => {
    useDatabaseWith([]);

    const first = await ensureFinancialYear(new Date('2026-10-08T09:00:00Z'));
    const second = await ensureFinancialYear(new Date('2026-10-08T09:00:00Z'));

    expect(collection.rows()).toHaveLength(1);
    expect(collection.rows()[0]).toMatchObject({
      id: 'fy-new-1',
      name: 'FY 2026',
      start_date: '2026-01-01',
      end_date: '2026-12-31',
      status: FinancialYearStatus.OPEN,
    });
    expect(first?.id).toBe('fy-new-1');
    expect(second?.id).toBe('fy-new-1');
    expect(appDataChanged).toHaveBeenCalledTimes(1);
  });

  it('does not seed when a financial year already exists', async () => {
    useDatabaseWith([year('fy-2025', 'FY 2025', '2025-01-01', '2025-12-31')]);
    const existing = await ensureFinancialYear(new Date('2026-10-08T09:00:00Z'));
    expect(collection.insert).not.toHaveBeenCalled();
    expect(existing?.id).toBe('fy-2025');
  });
});
