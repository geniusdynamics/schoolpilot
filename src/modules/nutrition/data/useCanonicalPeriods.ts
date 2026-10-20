// ABOUTME: The canonical academic periods the nutrition pages filter by, with the lookup a picker binds to.
// ABOUTME: A period is active while the calendar says so; ids stay opaque strings.

import { useMemo } from 'react';

import { useEntityQuery, useLookup } from '@/data/query';

import { useCanonicalRepository } from './canonicalRepository';

/** A canonical academic period, shaped the way the nutrition pages read a school period. */
export interface CanonicalPeriod {
  readonly id: string;
  readonly name: string;
  readonly start_date: string;
  readonly end_date: string;
  /** True while the period is the running one. */
  readonly is_active: boolean;
}

/** The canonical academic periods of the calendar. */
export function useCanonicalPeriods() {
  const repository = useCanonicalRepository();
  const periodsQuery = useEntityQuery(repository, 'academic_period');
  const periodsLookup = useLookup(repository, 'academic_period', {});

  const periods = useMemo<CanonicalPeriod[]>(
    () =>
      (periodsQuery.data?.items ?? []).map((row) => ({
        id: row.id,
        name: row.name,
        start_date: row.start_date,
        end_date: row.end_date,
        is_active: row.status === 'current',
      })),
    [periodsQuery.data]
  );

  return {
    periods,
    periodsLookup,
    status: periodsQuery.status,
    isLoading: periodsQuery.status === 'loading',
    error: periodsQuery.error,
  };
}
