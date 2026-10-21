// ABOUTME: The canonical rows the academics pages read: curriculum, class groups, teaching
// ABOUTME: groups, assignments, assessments, marks and the people and enrolments they resolve to.

import { useMemo } from 'react';

import { useEntityQuery } from '@/data/query';
import { MAX_LIMIT, type RepositoryRow } from '@/data/repository';
import type { EntityName } from '@/domain/schema';

import { useWritableRepository } from './canonicalRepository';

export type InstitutionRow = RepositoryRow<'institution'>;
export type ProgrammeRow = RepositoryRow<'programme'>;
export type CampusRow = RepositoryRow<'campus'>;
export type LevelRow = RepositoryRow<'level'>;
export type ClassGroupRow = RepositoryRow<'class_group'>;
export type LearningAreaRow = RepositoryRow<'learning_area'>;
export type ComponentRow = RepositoryRow<'component'>;
export type TeachingGroupRow = RepositoryRow<'teaching_group'>;
export type TeachingGroupMemberRow = RepositoryRow<'teaching_group_member'>;
export type TeachingAssignmentRow = RepositoryRow<'teaching_assignment'>;
export type AssessmentRow = RepositoryRow<'assessment'>;
export type GradingScaleRow = RepositoryRow<'grading_scale'>;
export type MarkRow = RepositoryRow<'mark'>;
export type AcademicYearRow = RepositoryRow<'academic_year'>;
export type AcademicPeriodRow = RepositoryRow<'academic_period'>;
export type StaffRow = RepositoryRow<'staff'>;
export type LearnerRow = RepositoryRow<'learner'>;
export type EnrolmentRow = RepositoryRow<'enrolment'>;

/** The whole collection: these screens are administrative and read every row. */
const ALL: { readonly limit: number } = { limit: MAX_LIMIT };

/** The name a person row is shown under. */
export function personName(row: {
  readonly given_name?: string;
  readonly family_name?: string;
}): string {
  return [row.given_name, row.family_name].filter(Boolean).join(' ');
}

/** The date a row was created, as the grid shows it. */
export function createdLabel(value: string | undefined): string {
  return value ? new Date(value).toLocaleDateString() : '—';
}

/**
 * The canonical rows the academics screens share.
 *
 * A page reads the rows it renders from here and binds its pickers with `useLookup`, so a
 * page never names a legacy collection. Writes go to the repository the hook also hands back.
 */
export function useCanonicalAcademics() {
  const repository = useWritableRepository();
  const institutions = useEntityQuery(repository, 'institution', ALL);
  const programmes = useEntityQuery(repository, 'programme', ALL);
  const campuses = useEntityQuery(repository, 'campus', ALL);
  const levels = useEntityQuery(repository, 'level', ALL);
  const classGroups = useEntityQuery(repository, 'class_group', ALL);
  const learningAreas = useEntityQuery(repository, 'learning_area', ALL);
  const components = useEntityQuery(repository, 'component', ALL);
  const teachingGroups = useEntityQuery(repository, 'teaching_group', ALL);
  const teachingGroupMembers = useEntityQuery(repository, 'teaching_group_member', ALL);
  const teachingAssignments = useEntityQuery(repository, 'teaching_assignment', ALL);
  const assessments = useEntityQuery(repository, 'assessment', ALL);
  const gradingScales = useEntityQuery(repository, 'grading_scale', ALL);
  const marks = useEntityQuery(repository, 'mark', ALL);
  const academicYears = useEntityQuery(repository, 'academic_year', ALL);
  const academicPeriods = useEntityQuery(repository, 'academic_period', ALL);
  const timetableEntries = useEntityQuery(repository, 'timetable_entry', ALL);
  const staff = useEntityQuery(repository, 'staff', ALL);
  const learners = useEntityQuery(repository, 'learner', ALL);
  const enrolments = useEntityQuery(repository, 'enrolment', ALL);

  const queries: ReadonlyArray<{ readonly status: string }> = [
    institutions,
    programmes,
    campuses,
    levels,
    classGroups,
    learningAreas,
    components,
    teachingGroups,
    teachingGroupMembers,
    teachingAssignments,
    assessments,
    gradingScales,
    marks,
    academicYears,
    academicPeriods,
    timetableEntries,
    staff,
    learners,
    enrolments,
  ];
  const isLoading = queries.some((query) => query.status === 'loading');
  const isError = queries.some((query) => query.status === 'error');

  const rows = useMemo(
    () => ({
      institutions: institutions.data?.items ?? [],
      programmes: programmes.data?.items ?? [],
      campuses: campuses.data?.items ?? [],
      levels: levels.data?.items ?? [],
      classGroups: classGroups.data?.items ?? [],
      learningAreas: learningAreas.data?.items ?? [],
      components: components.data?.items ?? [],
      teachingGroups: teachingGroups.data?.items ?? [],
      teachingGroupMembers: teachingGroupMembers.data?.items ?? [],
      teachingAssignments: teachingAssignments.data?.items ?? [],
      assessments: assessments.data?.items ?? [],
      gradingScales: gradingScales.data?.items ?? [],
      marks: marks.data?.items ?? [],
      academicYears: academicYears.data?.items ?? [],
      academicPeriods: academicPeriods.data?.items ?? [],
      timetableEntries: timetableEntries.data?.items ?? [],
      staff: staff.data?.items ?? [],
      learners: learners.data?.items ?? [],
      enrolments: enrolments.data?.items ?? [],
    }),
    [
      institutions.data,
      programmes.data,
      campuses.data,
      levels.data,
      classGroups.data,
      learningAreas.data,
      components.data,
      teachingGroups.data,
      teachingGroupMembers.data,
      teachingAssignments.data,
      assessments.data,
      gradingScales.data,
      marks.data,
      academicYears.data,
      academicPeriods.data,
      timetableEntries.data,
      staff.data,
      learners.data,
      enrolments.data,
    ]
  );

  const institutionId = rows.institutions[0]?.id ?? null;

  return {
    repository,
    institutionId,
    isLoading,
    isError,
    ...rows,
    learnerById: indexBy(rows.learners),
    enrolmentById: indexBy(rows.enrolments),
    learningAreaById: indexBy(rows.learningAreas),
    classGroupById: indexBy(rows.classGroups),
    staffById: indexBy(rows.staff),
    academicYearById: indexBy(rows.academicYears),
    programmeById: indexBy(rows.programmes),
  };
}

/** A map of rows by id, so a grid resolves a reference without a scan per row. */
function indexBy<E extends EntityName>(
  rows: readonly RepositoryRow<E>[]
): ReadonlyMap<string, RepositoryRow<E>> {
  return new Map(rows.map((row) => [row.id, row] as const));
}
