// ABOUTME: The analytics hook: reads the canonical calendar, class, enrolment, assessment, mark,
// ABOUTME: teaching and attendance rows, then computes every figure through analyticsFromRows.

import { useMemo } from 'react';

import { useCanonicalRepository } from '@/data/canonicalRepository';
import { useEntityQuery } from '@/data/query';

import { analyticsFromRows, type AnalyticsRows } from './analyticsFromRows';
import type { AnalyticsPeriod, AnalyticsResult, AnalyticsScopeOptions } from './analyticsTypes';

/** These tables grow with the school, so a page reads every page, not the repository's first. */
const EVERY_PAGE = { allPages: true } as const;

export interface UseAnalyticsDataReturn extends AnalyticsResult {
  readonly loading: boolean;
  readonly error: unknown;
  /** The periods of the chosen year, in date order. */
  readonly availablePeriods: readonly AnalyticsPeriod[];
}

/**
 * Reads the canonical rows and computes the analytics for one scope.
 *
 * There is no timer and no placeholder: the figures land when the row reads settle, and a metric
 * the school has not recorded is null rather than a stand-in.
 */
export function useAnalyticsData(options: AnalyticsScopeOptions = {}): UseAnalyticsDataReturn {
  const { academicYearId = null, periodId = null, levelId = null, classGroupId = null } = options;
  const repository = useCanonicalRepository();

  const periodsQuery = useEntityQuery(repository, 'academic_period', {}, EVERY_PAGE);
  const classGroupsQuery = useEntityQuery(repository, 'class_group', {}, EVERY_PAGE);
  const levelsQuery = useEntityQuery(repository, 'level', {}, EVERY_PAGE);
  const learningAreasQuery = useEntityQuery(repository, 'learning_area', {}, EVERY_PAGE);
  const enrolmentsQuery = useEntityQuery(repository, 'enrolment', {}, EVERY_PAGE);
  const learnersQuery = useEntityQuery(repository, 'learner', {}, EVERY_PAGE);
  const assessmentsQuery = useEntityQuery(repository, 'assessment', {}, EVERY_PAGE);
  const marksQuery = useEntityQuery(repository, 'mark', {}, EVERY_PAGE);
  const teachingGroupsQuery = useEntityQuery(repository, 'teaching_group', {}, EVERY_PAGE);
  const teachingAssignmentsQuery = useEntityQuery(repository, 'teaching_assignment', {}, EVERY_PAGE);
  const staffQuery = useEntityQuery(repository, 'staff', {}, EVERY_PAGE);
  const gradingScalesQuery = useEntityQuery(repository, 'grading_scale', {}, EVERY_PAGE);
  const attendanceSessionsQuery = useEntityQuery(repository, 'attendance_session', {}, EVERY_PAGE);
  const attendanceMarksQuery = useEntityQuery(repository, 'attendance_mark', {}, EVERY_PAGE);

  const queries = [
    periodsQuery,
    classGroupsQuery,
    levelsQuery,
    learningAreasQuery,
    enrolmentsQuery,
    learnersQuery,
    assessmentsQuery,
    marksQuery,
    teachingGroupsQuery,
    teachingAssignmentsQuery,
    staffQuery,
    gradingScalesQuery,
    attendanceSessionsQuery,
    attendanceMarksQuery,
  ];
  const loading = queries.some((query) => query.status === 'loading' || query.status === 'idle');
  const failed = queries.find((query) => query.status === 'error');
  const error = failed?.error ?? null;

  const rows = useMemo<AnalyticsRows>(
    () => ({
      periods: (periodsQuery.data?.items ?? []).map((row) => ({
        id: row.id,
        name: row.name,
        academic_year_id: row.academic_year_id,
        start_date: row.start_date,
        end_date: row.end_date,
      })),
      classGroups: (classGroupsQuery.data?.items ?? []).map((row) => ({
        id: row.id,
        name: row.name,
        level_id: row.level_id,
        academic_year_id: row.academic_year_id,
      })),
      levels: (levelsQuery.data?.items ?? []).map((row) => ({ id: row.id, name: row.name })),
      learningAreas: (learningAreasQuery.data?.items ?? []).map((row) => ({
        id: row.id,
        name: row.name,
      })),
      enrolments: (enrolmentsQuery.data?.items ?? []).map((row) => ({
        id: row.id,
        learner_id: row.learner_id,
        class_group_id: row.class_group_id,
        academic_year_id: row.academic_year_id,
        status: row.status,
      })),
      learners: (learnersQuery.data?.items ?? []).map((row) => ({
        id: row.id,
        given_name: row.given_name,
        family_name: row.family_name,
      })),
      assessments: (assessmentsQuery.data?.items ?? []).map((row) => ({
        id: row.id,
        academic_period_id: row.academic_period_id,
        learning_area_ids: row.learning_area_ids ?? [],
        class_group_ids: row.class_group_ids ?? [],
        level_ids: row.level_ids ?? [],
        max_score: row.max_score ?? null,
        grading_scale_id: row.grading_scale_id ?? null,
      })),
      marks: (marksQuery.data?.items ?? []).map((row) => ({
        id: row.id,
        assessment_id: row.assessment_id,
        enrolment_id: row.enrolment_id,
        learning_area_id: row.learning_area_id,
        score: row.score ?? null,
        status_code: row.status_code,
      })),
      teachingGroups: (teachingGroupsQuery.data?.items ?? []).map((row) => ({
        id: row.id,
        academic_year_id: row.academic_year_id,
        learning_area_id: row.learning_area_id,
        class_group_ids: row.class_group_ids ?? [],
        teacher_ids: row.teacher_ids ?? [],
      })),
      teachingAssignments: (teachingAssignmentsQuery.data?.items ?? []).map((row) => ({
        id: row.id,
        staff_id: row.staff_id,
        teaching_group_id: row.teaching_group_id,
        valid_from: row.valid_from,
        valid_to: row.valid_to ?? null,
      })),
      staff: (staffQuery.data?.items ?? []).map((row) => ({
        id: row.id,
        given_name: row.given_name,
        family_name: row.family_name,
      })),
      gradingScales: (gradingScalesQuery.data?.items ?? []).map((row) => ({
        id: row.id,
        code: row.code,
        bands: row.bands.map((band) => ({
          min: band.min,
          max: band.max,
          // The canonical band carries no pass flag; a marker on the stored row, if one ever
          // exists, is the only thing that can turn a pass rate on.
          ...((band as typeof band & { is_pass?: boolean }).is_pass === true ? { is_pass: true } : {}),
        })),
      })),
      attendanceSessions: (attendanceSessionsQuery.data?.items ?? []).map((row) => ({
        id: row.id,
        class_group_id: row.class_group_id ?? null,
        academic_period_id: row.academic_period_id ?? null,
        date: row.date,
      })),
      attendanceMarks: (attendanceMarksQuery.data?.items ?? []).map((row) => ({
        id: row.id,
        attendance_session_id: row.attendance_session_id,
        status: row.status,
      })),
    }),
    [
      periodsQuery.data,
      classGroupsQuery.data,
      levelsQuery.data,
      learningAreasQuery.data,
      enrolmentsQuery.data,
      learnersQuery.data,
      assessmentsQuery.data,
      marksQuery.data,
      teachingGroupsQuery.data,
      teachingAssignmentsQuery.data,
      staffQuery.data,
      gradingScalesQuery.data,
      attendanceSessionsQuery.data,
      attendanceMarksQuery.data,
    ]
  );

  const result = useMemo(
    () => analyticsFromRows(rows, { academicYearId, periodId, levelId, classGroupId }),
    [rows, academicYearId, periodId, levelId, classGroupId]
  );

  return {
    ...result,
    availablePeriods: result.periods,
    loading,
    error,
  };
}

export default useAnalyticsData;
