// ABOUTME: The canonical organisation lookups the administration pages read and pick references from.
// ABOUTME: Every list is a useLookup over the repository, so the same read feeds the grid and the picker.

import { useMemo } from 'react';

import { useLookup } from '@/data/query';
import type { RepositoryRow } from '@/data/repository';
import { asId } from '@/domain/ids';

import { useCanonicalRepository } from './canonicalRepository';

export type DepartmentRow = RepositoryRow<'department'>;
export type JobTitleRow = RepositoryRow<'job_title'>;
export type HouseRow = RepositoryRow<'house'>;
export type ResidenceRow = RepositoryRow<'residence'>;

/** A department, shaped for the administration grids. */
export interface DepartmentView {
  readonly id: string;
  readonly name: string;
  readonly kind: DepartmentRow['kind'];
  /** The legacy flag the staff form and the department grid read. */
  readonly is_academic: boolean;
  readonly head_staff_id: string | null;
  readonly row: DepartmentRow;
}

/** A job title, shaped for the administration grids (the legacy "designation"). */
export interface JobTitleView {
  readonly id: string;
  readonly name: string;
  /** The legacy column name the designation grid reads. */
  readonly title: string;
  readonly category: JobTitleRow['category'];
  readonly row: JobTitleRow;
}

/** A house, shaped for the house pages. */
export interface HouseView {
  readonly id: string;
  readonly name: string;
  readonly colour: string;
  readonly patron_staff_id: string | null;
}

/** A residence (the legacy dormitory), shaped for the residence pages. */
export interface ResidenceView {
  readonly id: string;
  readonly name: string;
  readonly campus_id: string;
  readonly gender: ResidenceRow['gender'];
  readonly capacity: number | null;
  readonly warden_staff_id: string | null;
}

export function toDepartmentView(row: DepartmentRow): DepartmentView {
  return {
    id: row.id,
    name: row.name,
    kind: row.kind,
    is_academic: row.kind === 'academic',
    head_staff_id: row.head_staff_id ?? null,
    row,
  };
}

export function toJobTitleView(row: JobTitleRow): JobTitleView {
  return { id: row.id, name: row.name, title: row.name, category: row.category, row };
}

export function toHouseView(row: HouseRow): HouseView {
  return {
    id: row.id,
    name: row.name,
    colour: row.colour ?? '',
    patron_staff_id: row.patron_staff_id ?? null,
  };
}

export function toResidenceView(row: ResidenceRow): ResidenceView {
  return {
    id: row.id,
    name: row.name,
    campus_id: row.campus_id,
    gender: row.gender,
    capacity: row.capacity ?? null,
    warden_staff_id: row.warden_staff_id ?? null,
  };
}

/** The department kind a legacy `is_academic` flag stands for. */
export function departmentKindOf(isAcademic: boolean): DepartmentRow['kind'] {
  return isAcademic ? 'academic' : 'administrative';
}

/** The lookups and rows of the organisation entities the administration pages read. */
export function useCanonicalOrganisation() {
  const repository = useCanonicalRepository();
  const departments = useLookup(repository, 'department', {});
  const jobTitles = useLookup(repository, 'job_title', {});
  const houses = useLookup(repository, 'house', {});
  const residences = useLookup(repository, 'residence', {});
  const campuses = useLookup(repository, 'campus', {});
  const levels = useLookup(repository, 'level', {});
  const programmes = useLookup(repository, 'programme', {});

  const departmentRows = useMemo<readonly DepartmentView[]>(
    () => (departments.options as readonly DepartmentRow[]).map(toDepartmentView),
    [departments.options]
  );
  const jobTitleRows = useMemo<readonly JobTitleView[]>(
    () => (jobTitles.options as readonly JobTitleRow[]).map(toJobTitleView),
    [jobTitles.options]
  );
  const houseRows = useMemo<readonly HouseView[]>(
    () => (houses.options as readonly HouseRow[]).map(toHouseView),
    [houses.options]
  );
  const residenceRows = useMemo<readonly ResidenceView[]>(
    () => (residences.options as readonly ResidenceRow[]).map(toResidenceView),
    [residences.options]
  );

  return {
    departments,
    jobTitles,
    houses,
    residences,
    campuses,
    levels,
    programmes,
    departmentRows,
    jobTitleRows,
    houseRows,
    residenceRows,
    /** The department name of an id, resolved through the lookup. */
    departmentLabel: (id: string | null | undefined, fallback = '—'): string =>
      id ? departments.label(asId<'department'>(id), fallback) : fallback,
    /** The job title name of an id, resolved through the lookup. */
    jobTitleLabel: (id: string | null | undefined, fallback = '—'): string =>
      id ? jobTitles.label(asId<'job_title'>(id), fallback) : fallback,
  };
}
