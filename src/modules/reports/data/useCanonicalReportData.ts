// ABOUTME: The canonical rows the report pages read: learners placed in the chosen academic year,
// ABOUTME: their class, stream and learning areas, staff, departments and calendar periods, shaped the
// ABOUTME: way the reports render them.

import { useMemo } from 'react';

import { useEntityQuery } from '@/data/query';
import type { RepositoryRow } from '@/data/repository';
import { PersonGender, StudentStatus } from '@/core/types';

import { useCanonicalRepository } from './canonicalRepository';

type LearnerRow = RepositoryRow<'learner'>;
type ClassGroupRow = RepositoryRow<'class_group'>;
type LevelRow = RepositoryRow<'level'>;
type StaffRow = RepositoryRow<'staff'>;
type EnrolmentRow = RepositoryRow<'enrolment'>;
type AcademicYearRow = RepositoryRow<'academic_year'>;
type AcademicPeriodRow = RepositoryRow<'academic_period'>;

/**
 * Every report reads whole tables, and a school's learners and enrolments are more than the first
 * page the repository returns (50 rows by default, 500 at most), so each read follows the pages to
 * the end. Without it a large school's masterlist counts only the oldest fifty learners.
 */
const EVERY_PAGE = { allPages: true } as const;

/** The options a report page passes to say which year its rows describe. */
export interface CanonicalReportDataOptions {
  /**
   * The academic year to resolve placements for. Null or empty means "the school's current year":
   * the flagged current year, else the year today sits in, else the latest to start.
   */
  readonly academicYearId?: string | null;
}

/** A learner, as the report pages read one. */
export interface ReportStudent {
  readonly id: string;
  readonly admission_no: string;
  readonly first_name: string;
  readonly middle_name: string | null;
  readonly last_name: string;
  readonly display_name: string;
  readonly gender: PersonGender;
  readonly date_of_birth: string | null;
  readonly status: StudentStatus;
  /** The class group the learner is enrolled in for the year the rows were read for. */
  readonly current_class_stream_id: string | null;
  readonly current_class_name: string | null;
  /** Kept beside {@link classGroupId}, {@link classLabel} and {@link streamName} for older callers. */
  readonly current_class_stream_name: string | null;
  /** The year the placement below belongs to, or null when the learner has no placement in it. */
  readonly academicYearId: string | null;
  /** The year-scoped class group (stream) of the placement. */
  readonly classGroupId: string | null;
  /** The level (grade) of the placement. */
  readonly levelId: string | null;
  /** The level's name, as a report's Class column shows it. */
  readonly classLabel: string | null;
  /** The class group's name, as a report's Stream column shows it. */
  readonly streamName: string | null;
  /** The learning areas of the year's teaching-group memberships, sorted. */
  readonly learningAreaNames: readonly string[];
  /** The canonical learner carries no student category or dormitory. */
  readonly student_category_name: string;
  readonly dormitory_name: string;
  readonly guardian_name: string;
  readonly guardian_phone: string;
  readonly primary_guardian: { readonly name: string; readonly phone: string } | null;
  readonly created_at: string;
}

/** A class group, as the report pages read one. */
export interface ReportClassStream {
  readonly id: string;
  readonly class_id: string;
  readonly name: string;
}

/** A level, as the report pages read a class. */
export interface ReportClass {
  readonly id: string;
  readonly name: string;
}

/** A staff member, as the report pages read one. */
export interface ReportStaff {
  readonly id: string;
  readonly first_name: string;
  readonly last_name: string;
  readonly display_name: string;
  readonly employee_number: string;
  readonly is_active: boolean;
  readonly designation_title: string;
  readonly department_name: string;
  readonly created_at: string;
}

/** A department, as the report pages read one. */
export interface ReportDepartment {
  readonly id: string;
  readonly name: string;
  readonly is_academic: boolean;
}

/** An academic year, as the report pages read one. */
export interface ReportAcademicYear {
  readonly id: string;
  readonly name: string;
  readonly start_date: string;
  readonly end_date: string;
  readonly is_active: boolean;
}

/** An academic period, as the report pages read a school period. */
export interface ReportSchoolPeriod {
  readonly id: string;
  readonly name: string;
  readonly start_date: string;
  readonly end_date: string;
  readonly is_active: boolean;
}

/** A teaching assignment, as the report pages read a teacher subject assignment. */
export interface ReportTeacherAssignment {
  /**
   * The assignment's id. A teaching group that spans several classes yields one row per class, so
   * only those rows carry a class suffix to stay unique.
   */
  readonly id: string;
  readonly teacher_id: string;
  readonly teacher_name: string;
  readonly class_id: string;
  readonly class_stream_name: string;
  readonly subject_id: string;
  readonly subject_name: string;
  /** The year the teaching group belongs to, for filtering by id rather than by name. */
  readonly academic_year_id: string;
  readonly academic_year_name: string;
}

/** The canonical gender of a learner, as the report pages name it. */
export function toReportGender(gender: string): PersonGender {
  if (gender === 'male') return PersonGender.MALE;
  if (gender === 'female') return PersonGender.FEMALE;
  return PersonGender.OTHER;
}

/** The canonical status of a learner, as the report pages name it. */
export function toReportStatus(status: string): StudentStatus {
  switch (status) {
    case 'enrolled':
      return StudentStatus.ACTIVE;
    case 'suspended':
      return StudentStatus.SUSPENDED;
    case 'transferred_out':
      return StudentStatus.TRANSFERRED;
    case 'withdrawn':
      return StudentStatus.WITHDRAWN;
    case 'graduated':
      return StudentStatus.ALUMNI;
    default:
      // An applicant or a deceased learner is not on the roll of the school.
      return StudentStatus.WITHDRAWN;
  }
}

/** The year today sits in, else the flagged current year, else the latest to start. */
function defaultAcademicYearId(
  years: readonly AcademicYearRow[],
  today: string
): string {
  if (years.length === 0) return '';
  const byDate = years.find((year) => year.start_date <= today && today <= year.end_date);
  if (byDate) return byDate.id;
  const flagged = years.find((year) => year.status === 'current');
  if (flagged) return flagged.id;
  return [...years].sort((left, right) => right.start_date.localeCompare(left.start_date))[0]
    ?.id ?? '';
}

/** True while a query has not delivered its rows yet; `idle` counts as still reading. */
function isReading(status: string): boolean {
  return status !== 'success' && status !== 'error';
}

/** True when `candidate` is the later placement, with a stable tie-break. */
function isLaterPlacement(candidate: EnrolmentRow, current: EnrolmentRow): boolean {
  const byStart = candidate.start_date.localeCompare(current.start_date);
  if (byStart !== 0) return byStart > 0;
  const byCreated = (candidate.created_at ?? '').localeCompare(current.created_at ?? '');
  if (byCreated !== 0) return byCreated > 0;
  return candidate.id > current.id;
}

/**
 * One placement per learner for the given year.
 *
 * A learner can hold an active or repeating enrolment in more than one year, and a school does not
 * always close the old one. The placement is therefore the latest active-or-repeating enrolment
 * *of the chosen year*, never the last row of any year that happens to be in the table.
 */
function placementByLearnerOf(
  enrolments: readonly EnrolmentRow[],
  academicYearId: string
): Map<string, EnrolmentRow> {
  const placements = new Map<string, EnrolmentRow>();
  if (!academicYearId) return placements;
  for (const row of enrolments) {
    if (row.academic_year_id !== academicYearId) continue;
    if (row.status !== 'active' && row.status !== 'repeating') continue;
    const current = placements.get(row.learner_id);
    if (!current || isLaterPlacement(row, current)) placements.set(row.learner_id, row);
  }
  return placements;
}

/** The canonical rows the report pages read. */
export function useCanonicalReportData(options: CanonicalReportDataOptions = {}) {
  const repository = useCanonicalRepository();
  const learnersQuery = useEntityQuery(repository, 'learner', {}, EVERY_PAGE);
  const classGroupsQuery = useEntityQuery(repository, 'class_group', {}, EVERY_PAGE);
  const levelsQuery = useEntityQuery(repository, 'level', {}, EVERY_PAGE);
  const staffQuery = useEntityQuery(repository, 'staff', {}, EVERY_PAGE);
  const departmentsQuery = useEntityQuery(repository, 'department', {}, EVERY_PAGE);
  const jobTitlesQuery = useEntityQuery(repository, 'job_title', {}, EVERY_PAGE);
  const yearsQuery = useEntityQuery(repository, 'academic_year', {}, EVERY_PAGE);
  const periodsQuery = useEntityQuery(repository, 'academic_period', {}, EVERY_PAGE);
  const enrolmentsQuery = useEntityQuery(repository, 'enrolment', {}, EVERY_PAGE);
  const learnerGuardiansQuery = useEntityQuery(repository, 'learner_guardian', {}, EVERY_PAGE);
  const guardiansQuery = useEntityQuery(repository, 'guardian', {}, EVERY_PAGE);
  const assignmentsQuery = useEntityQuery(repository, 'teaching_assignment', {}, EVERY_PAGE);
  const teachingGroupsQuery = useEntityQuery(repository, 'teaching_group', {}, EVERY_PAGE);
  const teachingGroupMembersQuery = useEntityQuery(
    repository,
    'teaching_group_member',
    {},
    EVERY_PAGE
  );
  const learningAreasQuery = useEntityQuery(repository, 'learning_area', {}, EVERY_PAGE);

  const years = useMemo(() => yearsQuery.data?.items ?? [], [yearsQuery.data]);
  const requestedYearId = (options.academicYearId ?? '').trim();
  const academicYearId = useMemo(
    () =>
      requestedYearId ||
      defaultAcademicYearId(years, new Date().toISOString().slice(0, 10)),
    [requestedYearId, years]
  );

  const guardianById = useMemo(
    () => new Map<string, RepositoryRow<'guardian'>>((guardiansQuery.data?.items ?? []).map((row) => [row.id, row] as const)),
    [guardiansQuery.data]
  );
  const primaryGuardianByLearner = useMemo(() => {
    const map = new Map<string, RepositoryRow<'guardian'>>();
    for (const link of learnerGuardiansQuery.data?.items ?? []) {
      if (!link.is_primary) continue;
      const guardian = guardianById.get(link.guardian_id);
      if (guardian) map.set(link.learner_id, guardian);
    }
    return map;
  }, [learnerGuardiansQuery.data, guardianById]);

  const levelNameById = useMemo(
    () => new Map<string, string>((levelsQuery.data?.items ?? []).map((row) => [row.id, row.name] as const)),
    [levelsQuery.data]
  );
  const classGroupById = useMemo(
    () => new Map<string, ClassGroupRow>((classGroupsQuery.data?.items ?? []).map((row) => [row.id, row] as const)),
    [classGroupsQuery.data]
  );
  const placementByLearner = useMemo(
    () =>
      placementByLearnerOf(
        enrolmentsQuery.data?.items ?? [],
        academicYearId
      ),
    [enrolmentsQuery.data, academicYearId]
  );
  const jobTitleNameById = useMemo(
    () => new Map<string, string>((jobTitlesQuery.data?.items ?? []).map((row) => [row.id, row.name] as const)),
    [jobTitlesQuery.data]
  );
  const departmentNameById = useMemo(
    () => new Map<string, string>((departmentsQuery.data?.items ?? []).map((row) => [row.id, row.name] as const)),
    [departmentsQuery.data]
  );
  const academicYearNameById = useMemo(
    () => new Map<string, string>(years.map((row) => [row.id, row.name] as const)),
    [years]
  );
  const teachingGroupById = useMemo(
    () => new Map<string, RepositoryRow<'teaching_group'>>((teachingGroupsQuery.data?.items ?? []).map((row) => [row.id, row] as const)),
    [teachingGroupsQuery.data]
  );
  const learningAreaNameById = useMemo(
    () => new Map<string, string>((learningAreasQuery.data?.items ?? []).map((row) => [row.id, row.name] as const)),
    [learningAreasQuery.data]
  );
  const staffNameById = useMemo(
    () => new Map<string, string>((staffQuery.data?.items ?? []).map((row) => [row.id, `${row.preferred_name ?? row.given_name} ${row.family_name}`.trim()] as const)),
    [staffQuery.data]
  );
  const learningAreasByEnrolment = useMemo(() => {
    const groupsOfYear = new Set<string>();
    for (const group of teachingGroupsQuery.data?.items ?? []) {
      if (group.academic_year_id === academicYearId) groupsOfYear.add(group.id);
    }
    const byEnrolment = new Map<string, Set<string>>();
    for (const member of teachingGroupMembersQuery.data?.items ?? []) {
      // A closed membership is history; the roster of the year shows the current one.
      if (member.valid_to) continue;
      if (!groupsOfYear.has(member.teaching_group_id)) continue;
      const group = teachingGroupById.get(member.teaching_group_id);
      if (!group) continue;
      const areaName = learningAreaNameById.get(group.learning_area_id);
      if (!areaName) continue;
      const names = byEnrolment.get(member.enrolment_id) ?? new Set<string>();
      names.add(areaName);
      byEnrolment.set(member.enrolment_id, names);
    }
    return byEnrolment;
  }, [
    teachingGroupsQuery.data,
    teachingGroupMembersQuery.data,
    teachingGroupById,
    learningAreaNameById,
    academicYearId,
  ]);

  const students = useMemo<ReportStudent[]>(
    () =>
      (learnersQuery.data?.items ?? []).map((row: LearnerRow) => {
        const placement = placementByLearner.get(row.id);
        const classGroup = placement ? classGroupById.get(placement.class_group_id) : undefined;
        const levelId = classGroup?.level_id ?? placement?.level_id ?? null;
        const classLabel = levelId ? levelNameById.get(levelId) ?? null : null;
        const streamName = classGroup?.name ?? null;
        const learningAreas = placement
          ? learningAreasByEnrolment.get(placement.id)
          : undefined;
        const guardian = primaryGuardianByLearner.get(row.id);
        const guardianName = guardian
          ? `${guardian.preferred_name ?? guardian.given_name} ${guardian.family_name}`.trim()
          : '';
        const guardianPhone = guardian?.phones?.[0]?.number ?? '';
        return {
          id: row.id,
          admission_no: row.admission_number,
          first_name: row.given_name,
          middle_name: row.middle_names?.[0] ?? null,
          last_name: row.family_name,
          display_name: `${row.preferred_name ?? row.given_name} ${row.family_name}`.trim(),
          gender: toReportGender(row.gender),
          date_of_birth: row.date_of_birth ?? null,
          status: toReportStatus(row.status),
          current_class_stream_id: placement?.class_group_id ?? null,
          current_class_name: classLabel,
          current_class_stream_name: streamName,
          academicYearId: placement?.academic_year_id ?? null,
          classGroupId: placement?.class_group_id ?? null,
          levelId,
          classLabel,
          streamName,
          learningAreaNames: learningAreas
            ? [...learningAreas].sort((left, right) => left.localeCompare(right))
            : [],
          student_category_name: '',
          dormitory_name: '',
          guardian_name: guardianName,
          guardian_phone: guardianPhone,
          primary_guardian: guardian ? { name: guardianName, phone: guardianPhone } : null,
          created_at: row.created_at,
        };
      }),
    [
      learnersQuery.data,
      placementByLearner,
      classGroupById,
      levelNameById,
      learningAreasByEnrolment,
      primaryGuardianByLearner,
    ]
  );

  const classStreams = useMemo<ReportClassStream[]>(
    () =>
      (classGroupsQuery.data?.items ?? [])
        .filter((row) => row.academic_year_id === academicYearId)
        .map((row) => ({
          id: row.id,
          class_id: row.level_id,
          name: row.name,
        })),
    [classGroupsQuery.data, academicYearId]
  );

  const classes = useMemo<ReportClass[]>(() => {
    const levelIds = new Set(classStreams.map((stream) => stream.class_id));
    return (levelsQuery.data?.items ?? [])
      .filter((row: LevelRow) => levelIds.has(row.id))
      .map((row: LevelRow) => ({ id: row.id, name: row.name }));
  }, [levelsQuery.data, classStreams]);

  const staff = useMemo<ReportStaff[]>(
    () =>
      (staffQuery.data?.items ?? []).map((row: StaffRow) => {
        const departmentNames = row.department_ids
          .map((id) => departmentNameById.get(id) ?? '')
          .filter(Boolean);
        return {
          id: row.id,
          first_name: row.given_name,
          last_name: row.family_name,
          display_name: `${row.preferred_name ?? row.given_name} ${row.family_name}`.trim(),
          employee_number: row.employee_number,
          is_active: !row.end_date,
          designation_title: row.job_title_id ? jobTitleNameById.get(row.job_title_id) ?? '' : '',
          department_name: departmentNames.join(', '),
          created_at: row.created_at,
        };
      }),
    [staffQuery.data, jobTitleNameById, departmentNameById]
  );

  const departments = useMemo<ReportDepartment[]>(
    () =>
      (departmentsQuery.data?.items ?? []).map((row) => ({
        id: row.id,
        name: row.name,
        is_academic: row.kind === 'academic',
      })),
    [departmentsQuery.data]
  );

  const academicYears = useMemo<ReportAcademicYear[]>(
    () =>
      years.map((row: AcademicYearRow) => ({
        id: row.id,
        name: row.name,
        start_date: row.start_date,
        end_date: row.end_date,
        is_active: row.status === 'current',
      })),
    [years]
  );

  const schoolPeriods = useMemo<ReportSchoolPeriod[]>(
    () =>
      (periodsQuery.data?.items ?? []).map((row: AcademicPeriodRow) => ({
        id: row.id,
        name: row.name,
        start_date: row.start_date,
        end_date: row.end_date,
        is_active: row.status === 'current',
      })),
    [periodsQuery.data]
  );

  const teacherSubjectAssignments = useMemo<ReportTeacherAssignment[]>(() => {
    const rows: ReportTeacherAssignment[] = [];
    for (const row of assignmentsQuery.data?.items ?? []) {
      const group = teachingGroupById.get(row.teaching_group_id);
      const classGroupIds = group?.class_group_ids ?? [];
      const academicYearIdOfGroup = group?.academic_year_id ?? '';
      const base = {
        teacher_id: row.staff_id,
        teacher_name: staffNameById.get(row.staff_id) ?? '',
        subject_id: group?.learning_area_id ?? '',
        subject_name: group ? learningAreaNameById.get(group.learning_area_id) ?? '' : '',
        academic_year_id: academicYearIdOfGroup,
        academic_year_name: group
          ? academicYearNameById.get(group.academic_year_id) ?? ''
          : '',
      };
      if (classGroupIds.length === 0) {
        rows.push({
          ...base,
          id: row.id,
          class_id: '',
          class_stream_name: '',
        });
        continue;
      }
      // A teaching group can cover several classes; a roster of assignments names every one, not
      // just the first class in the list.
      for (const classGroupId of classGroupIds) {
        const classGroup = classGroupById.get(classGroupId);
        rows.push({
          ...base,
          id: classGroupIds.length === 1 ? row.id : `${row.id}:${classGroupId}`,
          class_id: classGroupId,
          class_stream_name: classGroup?.name ?? '',
        });
      }
    }
    return rows;
  }, [
    assignmentsQuery.data,
    teachingGroupById,
    classGroupById,
    learningAreaNameById,
    staffNameById,
    academicYearNameById,
  ]);

  return {
    students,
    classes,
    classStreams,
    staff,
    departments,
    academicYears,
    schoolPeriods,
    teacherSubjectAssignments,
    /** The year every learner row above was placed in. */
    academicYearId,
    academicYearName: academicYearNameById.get(academicYearId) ?? '',
    status: learnersQuery.status,
    isLoading:
      isReading(learnersQuery.status) ||
      isReading(classGroupsQuery.status) ||
      isReading(levelsQuery.status) ||
      isReading(staffQuery.status) ||
      isReading(enrolmentsQuery.status),
    error: learnersQuery.error ?? enrolmentsQuery.error ?? null,
  };
}
