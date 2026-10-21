// ABOUTME: The canonical calendar the administration pages read: calendars, academic years and periods.
// ABOUTME: The year form binds the academic_year schema and picks its calendar through an EntityPicker.

import { useMemo } from 'react';

import { useEntityQuery, useLookup } from '@/data/query';
import type { RepositoryRow } from '@/data/repository';
import { asId } from '@/domain/ids';

import { useCanonicalRepository } from './canonicalRepository';

type CalendarRow = RepositoryRow<'calendar'>;
type AcademicYearRow = RepositoryRow<'academic_year'>;
type AcademicPeriodRow = RepositoryRow<'academic_period'>;

/** An academic year, shaped for the academic-years grid. */
export interface AcademicYearView {
  readonly id: string;
  readonly name: string;
  readonly calendar_id: string;
  /** The calendar (the legacy "structure") name, resolved through the lookup. */
  readonly structure_id: string;
  readonly structure_name: string;
  readonly start_date: string;
  readonly end_date: string;
  readonly status: AcademicYearRow['status'];
  readonly is_current: boolean;
  readonly row: AcademicYearRow;
}

/** An academic period, shaped for the calendar grid. */
export interface AcademicPeriodView {
  readonly id: string;
  readonly name: string;
  readonly academic_year_id: string;
  readonly academic_year_name: string;
  readonly kind: AcademicPeriodRow['kind'];
  readonly sequence: number;
  readonly start_date: string;
  readonly end_date: string;
  readonly status: AcademicPeriodRow['status'];
}

/** The canonical calendar rows and lookups the administration pages read. */
export function useCanonicalCalendar() {
  const repository = useCanonicalRepository();
  const calendars = useLookup(repository, 'calendar', {});
  const academicYears = useLookup(repository, 'academic_year', {});
  const academicPeriods = useLookup(repository, 'academic_period', {});
  const academicYearsQuery = useEntityQuery(repository, 'academic_year');
  const academicPeriodsQuery = useEntityQuery(repository, 'academic_period');

  const academicYearRows = useMemo<AcademicYearView[]>(
    () =>
      (academicYearsQuery.data?.items ?? []).map((row) => ({
        id: row.id,
        name: row.name,
        calendar_id: row.calendar_id,
        structure_id: row.calendar_id,
        structure_name: calendars.label(asId<'calendar'>(row.calendar_id), ''),
        start_date: row.start_date,
        end_date: row.end_date,
        status: row.status,
        is_current: row.status === 'current',
        row,
      })),
    [academicYearsQuery.data, calendars]
  );

  const academicPeriodRows = useMemo<AcademicPeriodView[]>(
    () =>
      (academicPeriodsQuery.data?.items ?? [])
        .map((row) => ({
          id: row.id,
          name: row.name,
          academic_year_id: row.academic_year_id,
          academic_year_name: academicYears.label(asId<'academic_year'>(row.academic_year_id), ''),
          kind: row.kind,
          sequence: row.sequence,
          start_date: row.start_date,
          end_date: row.end_date,
          status: row.status,
        }))
        .sort(
          (left, right) =>
            left.start_date.localeCompare(right.start_date) || left.sequence - right.sequence
        ),
    [academicPeriodsQuery.data, academicYears]
  );

  return {
    calendars,
    academicYears,
    academicPeriods,
    academicYearRows,
    academicPeriodRows,
    calendarRows: (calendars.options as readonly CalendarRow[]).slice(),
    status: academicYearsQuery.status,
    isLoading:
      academicYearsQuery.status === 'loading' || academicPeriodsQuery.status === 'loading',
    error: academicYearsQuery.error,
  };
}
