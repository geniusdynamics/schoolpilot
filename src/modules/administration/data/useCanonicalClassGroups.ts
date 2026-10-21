// ABOUTME: The canonical class groups the administration pages read, with their level and year resolved.
// ABOUTME: The display name is computed at read time from the level and the group name, never stored.

import { useMemo } from 'react';

import { useEntityQuery, useLookup } from '@/data/query';
import type { RepositoryRow } from '@/data/repository';
import { asId } from '@/domain/ids';

import { useCanonicalRepository } from './canonicalRepository';

type ClassGroupRow = RepositoryRow<'class_group'>;

/** A class group, shaped for the class and stream grids. */
export interface ClassGroupView {
  readonly id: string;
  readonly name: string;
  /** "<level> · <name>", the label a picker shows. */
  readonly display_name: string;
  readonly level_id: string;
  readonly level_name: string;
  readonly academic_year_id: string;
  readonly academic_year_name: string;
  readonly programme_id: string;
  readonly programme_name: string;
  readonly campus_id: string;
  readonly capacity: number | null;
  readonly room: string;
  readonly homeroom_teacher_ids: readonly string[];
  readonly enrolled: number;
  readonly row: ClassGroupRow;
}

/** The canonical class groups of the institution, grouped under their level. */
export function useCanonicalClassGroups() {
  const repository = useCanonicalRepository();
  const classGroupsQuery = useEntityQuery(repository, 'class_group');
  const levels = useLookup(repository, 'level', {});
  const academicYears = useLookup(repository, 'academic_year', {});
  const programmes = useLookup(repository, 'programme', {});
  // The picker reads the group as "<level> · <name>", the label the grids show.
  const classGroupsLookup = useLookup(repository, 'class_group', {
    label: (row) =>
      [levels.label(asId<'level'>(row.level_id), ''), row.name].filter(Boolean).join(' · '),
  });
  const enrolmentsQuery = useEntityQuery(repository, 'enrolment');

  const enrolledByClassGroup = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of enrolmentsQuery.data?.items ?? []) {
      if (row.status !== 'active') continue;
      map.set(row.class_group_id, (map.get(row.class_group_id) ?? 0) + 1);
    }
    return map;
  }, [enrolmentsQuery.data]);

  const classGroups = useMemo<ClassGroupView[]>(
    () =>
      (classGroupsQuery.data?.items ?? []).map((row) => {
        const levelName = levels.label(asId<'level'>(row.level_id), '');
        return {
          id: row.id,
          name: row.name,
          display_name: [levelName, row.name].filter(Boolean).join(' · '),
          level_id: row.level_id,
          level_name: levelName,
          academic_year_id: row.academic_year_id,
          academic_year_name: academicYears.label(asId<'academic_year'>(row.academic_year_id), ''),
          programme_id: row.programme_id,
          programme_name: programmes.label(asId<'programme'>(row.programme_id), ''),
          campus_id: row.campus_id,
          capacity: row.capacity ?? null,
          room: row.room ?? '',
          homeroom_teacher_ids: row.homeroom_teacher_ids ?? [],
          enrolled: enrolledByClassGroup.get(row.id) ?? 0,
          row,
        };
      }),
    [classGroupsQuery.data, levels, academicYears, programmes, enrolledByClassGroup]
  );

  return {
    classGroups,
    classGroupRows: classGroupsQuery.data?.items ?? [],
    classGroupsLookup,
    levels,
    academicYears,
    programmes,
    status: classGroupsQuery.status,
    isLoading:
      classGroupsQuery.status === 'loading' ||
      levels.status === 'loading' ||
      academicYears.status === 'loading',
    error: classGroupsQuery.error,
  };
}
