// ABOUTME: Repository tests for the canonical financial years: date/overlap validation, the
// ABOUTME: single-current rule, and the create/close/reopen writes that keep it, all through the
// ABOUTME: canonical repository instead of the legacy 'financial_years' collection.

import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it } from 'vitest';

import { CanonicalRepositoryProvider } from '@/data/canonicalRepository';
import { queryCache } from '@/data/query';

import {
  buildDefaultFinancialYear,
  suggestNextFinancialYear,
  useFinancialYearData,
  validateFinancialYear,
} from '../useFinancialYearData';
import {
  createFinanceRepositoryDouble,
  type FinanceRepositoryDouble,
} from './canonicalRepositoryDouble';

const INSTITUTION = '00000000-0000-7000-8000-000000000001';
const OTHER_INSTITUTION = '00000000-0000-7000-8000-000000000002';

interface SeedYear {
  id: string;
  institution_id?: string;
  name: string;
  start_date: string;
  end_date: string;
  status: 'planned' | 'current' | 'closed';
}

const year = (
  id: string,
  name: string,
  start: string,
  end: string,
  status: SeedYear['status'] = 'current'
): SeedYear => ({ id, institution_id: INSTITUTION, name, start_date: start, end_date: end, status });

let repository: FinanceRepositoryDouble;

function useCanonicalYears(seed: readonly SeedYear[] = []) {
  repository = createFinanceRepositoryDouble({
    institution: [{ id: INSTITUTION, name: 'Mwangaza Secondary School' }],
    financial_year: seed.map((row) => ({ ...row })),
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <CanonicalRepositoryProvider repository={repository}>{children}</CanonicalRepositoryProvider>
  );
  // The hook is what this test renders; the rule cannot see through the renderHook helper.
  // eslint-disable-next-line react-hooks/rules-of-hooks
  return renderHook(() => useFinancialYearData(), { wrapper });
}

beforeEach(() => {
  queryCache.clear();
});

describe('validateFinancialYear', () => {
  const existing = [year('fy-2025', 'FY 2025', '2025-01-01', '2025-12-31', 'closed')];

  it('accepts a year that starts the day after an existing one ends', () => {
    expect(
      validateFinancialYear({ name: 'FY 2026', start_date: '2026-01-01', end_date: '2026-12-31' }, existing)
    ).toEqual([]);
  });

  it('rejects an end date on or before the start date', () => {
    const errors = validateFinancialYear(
      { name: 'FY 2026', start_date: '2026-12-31', end_date: '2026-01-01' },
      existing
    );
    expect(errors.map((error) => error.code)).toContain('end-before-start');
  });

  it('rejects a date range that overlaps an existing year, including a shared boundary day', () => {
    const inside = validateFinancialYear(
      { name: 'FY X', start_date: '2025-06-01', end_date: '2026-05-31' },
      existing
    );
    const boundary = validateFinancialYear(
      { name: 'FY Y', start_date: '2025-12-31', end_date: '2026-12-30' },
      existing
    );
    expect(inside.map((error) => error.code)).toContain('overlap');
    expect(boundary.map((error) => error.code)).toContain('overlap');
  });

  it('ignores the year being edited when checking overlap', () => {
    expect(
      validateFinancialYear({ name: 'FY 2025', start_date: '2025-02-01', end_date: '2026-01-31' }, existing, 'fy-2025')
    ).toEqual([]);
  });

  it('rejects a duplicate name regardless of case', () => {
    const errors = validateFinancialYear(
      { name: 'fy 2025', start_date: '2027-01-01', end_date: '2027-12-31' },
      existing
    );
    expect(errors.map((error) => error.code)).toContain('duplicate-name');
  });

  it('requires a name and both dates', () => {
    const codes = validateFinancialYear({ name: ' ', start_date: '', end_date: '' }, existing).map(
      (error) => error.code
    );
    expect(codes).toEqual(expect.arrayContaining(['name-required', 'dates-required']));
  });
});

describe('suggestNextFinancialYear', () => {
  it('builds the calendar year when no year exists yet', () => {
    expect(buildDefaultFinancialYear(new Date('2026-10-08T09:00:00Z'))).toEqual({
      name: 'FY 2026',
      start_date: '2026-01-01',
      end_date: '2026-12-31',
    });
  });

  it('starts the day after the latest existing year and runs a year', () => {
    const rows = [year('fy-2026', 'FY 2026', '2026-01-01', '2026-12-31')];
    expect(suggestNextFinancialYear(rows)).toEqual({
      name: 'FY 2027',
      start_date: '2027-01-01',
      end_date: '2027-12-31',
    });
  });
});

describe('useFinancialYearData', () => {
  it('reads the canonical rows of the school only, newest first, and marks the current year', async () => {
    const { result } = useCanonicalYears([
      year('fy-2025', 'FY 2025', '2025-01-01', '2025-12-31', 'closed'),
      year('fy-2026', 'FY 2026', '2026-01-01', '2026-12-31', 'current'),
    ]);
    repository.publish('financial_year', [
      ...(repository.rows.financial_year ?? []),
      {
        id: 'fy-other',
        institution_id: OTHER_INSTITUTION,
        name: 'FY Other',
        start_date: '2026-01-01',
        end_date: '2026-12-31',
        status: 'current',
      },
    ]);

    await waitFor(() => expect(result.current.financialYears).toHaveLength(2));
    expect(result.current.financialYears.map((row) => row.name)).toEqual(['FY 2026', 'FY 2025']);
    expect(result.current.currentFinancialYear?.id).toBe('fy-2026');
    expect(result.current.institutionId).toBe(INSTITUTION);
  });

  it('creates the first year as current and a later one as planned, through the repository', async () => {
    const { result } = useCanonicalYears([]);
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.create({ name: 'FY 2026', start_date: '2026-01-01', end_date: '2026-12-31' });
    });
    await waitFor(() => expect(result.current.financialYears).toHaveLength(1));
    expect(result.current.financialYears[0]).toMatchObject({ name: 'FY 2026', status: 'current' });

    await act(async () => {
      await result.current.create({ name: 'FY 2027', start_date: '2027-01-01', end_date: '2027-12-31' });
    });
    await waitFor(() => expect(result.current.financialYears).toHaveLength(2));
    expect(result.current.financialYears.find((row) => row.name === 'FY 2027')?.status).toBe('planned');
    expect(repository.writes.filter((write) => write.entity === 'financial_year')).toHaveLength(2);
  });

  it('refuses an overlapping year with the name and dates it collides with, without writing', async () => {
    const { result } = useCanonicalYears([year('fy-2026', 'FY 2026', '2026-01-01', '2026-12-31')]);
    await waitFor(() => expect(result.current.financialYears).toHaveLength(1));

    await expect(
      result.current.create({ name: 'FY Overlap', start_date: '2026-07-01', end_date: '2027-06-30' })
    ).rejects.toThrow(/overlaps FY 2026 \(2026-01-01 to 2026-12-31\)/);
    expect(repository.writes).toHaveLength(0);
  });

  it('refuses a duplicate name regardless of case, without writing', async () => {
    const { result } = useCanonicalYears([year('fy-2026', 'FY 2026', '2026-01-01', '2026-12-31')]);
    await waitFor(() => expect(result.current.financialYears).toHaveLength(1));

    await expect(
      result.current.create({ name: 'fy 2026', start_date: '2027-01-01', end_date: '2027-12-31' })
    ).rejects.toThrow(/named FY 2026 already exists/);
    expect(repository.writes).toHaveLength(0);
  });

  it('updates a year by id against the other years, keeping its status', async () => {
    const { result } = useCanonicalYears([
      year('fy-2025', 'FY 2025', '2025-01-01', '2025-12-31', 'closed'),
      year('fy-2026', 'FY 2026', '2026-01-01', '2026-12-31', 'current'),
    ]);
    await waitFor(() => expect(result.current.financialYears).toHaveLength(2));

    await expect(result.current.update('fy-2026', { start_date: '2025-12-01' })).rejects.toThrow(
      /overlaps FY 2025/
    );

    await act(async () => {
      await result.current.update('fy-2026', { name: 'FY 2026/27' });
    });
    await waitFor(() =>
      expect(result.current.financialYears.find((row) => row.id === 'fy-2026')?.name).toBe('FY 2026/27')
    );
    expect(repository.writes).toContainEqual({ entity: 'financial_year', action: 'update', id: 'fy-2026' });
  });

  it('refuses to close the only open year so one current year always remains', async () => {
    const { result } = useCanonicalYears([
      year('fy-2025', 'FY 2025', '2025-01-01', '2025-12-31', 'closed'),
      year('fy-2026', 'FY 2026', '2026-01-01', '2026-12-31', 'current'),
    ]);
    await waitFor(() => expect(result.current.financialYears).toHaveLength(2));

    expect(result.current.canClose('fy-2026')).toBe(false);
    await expect(result.current.close('fy-2026')).rejects.toThrow(/only open financial year/);
    expect(repository.writes).toHaveLength(0);
  });

  it('closes the current year and makes the next open year current', async () => {
    const { result } = useCanonicalYears([
      year('fy-2026', 'FY 2026', '2026-01-01', '2026-12-31', 'current'),
      year('fy-2027', 'FY 2027', '2027-01-01', '2027-12-31', 'planned'),
    ]);
    await waitFor(() => expect(result.current.financialYears).toHaveLength(2));

    expect(result.current.canClose('fy-2026')).toBe(true);
    await act(async () => {
      await result.current.close('fy-2026');
    });

    await waitFor(() =>
      expect(result.current.financialYears.find((row) => row.id === 'fy-2026')?.status).toBe('closed')
    );
    expect(result.current.financialYears.find((row) => row.id === 'fy-2027')?.status).toBe('current');
    expect(result.current.financialYears.filter((row) => row.status === 'current')).toHaveLength(1);
    expect(result.current.currentFinancialYear?.id).toBe('fy-2027');
  });

  it('reopens a closed year as planned when a current year already exists, and as current when none does', async () => {
    const { result } = useCanonicalYears([
      year('fy-2025', 'FY 2025', '2025-01-01', '2025-12-31', 'closed'),
      year('fy-2026', 'FY 2026', '2026-01-01', '2026-12-31', 'current'),
    ]);
    await waitFor(() => expect(result.current.financialYears).toHaveLength(2));

    await act(async () => {
      await result.current.reopen('fy-2025');
    });
    await waitFor(() =>
      expect(result.current.financialYears.find((row) => row.id === 'fy-2025')?.status).toBe('planned')
    );
  });

  it('reopens a closed year as current when the school has no current year', async () => {
    const { result } = useCanonicalYears([
      year('fy-2025', 'FY 2025', '2025-01-01', '2025-12-31', 'closed'),
      year('fy-2026', 'FY 2026', '2026-01-01', '2026-12-31', 'closed'),
    ]);
    await waitFor(() => expect(result.current.financialYears).toHaveLength(2));

    await act(async () => {
      await result.current.reopen('fy-2026');
    });
    await waitFor(() =>
      expect(result.current.financialYears.find((row) => row.id === 'fy-2026')?.status).toBe('current')
    );
  });

  it('has no institution to write under when the canonical database holds none', async () => {
    repository = createFinanceRepositoryDouble({ financial_year: [] });
    const wrapper = ({ children }: { children: ReactNode }) => (
      <CanonicalRepositoryProvider repository={repository}>{children}</CanonicalRepositoryProvider>
    );
    const { result } = renderHook(() => useFinancialYearData(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.institutionId).toBeNull();
    expect(result.current.financialYears).toEqual([]);
    await expect(
      result.current.create({ name: 'FY 2030', start_date: '2030-01-01', end_date: '2030-12-31' })
    ).rejects.toThrow(/no institution row/);
  });
});
