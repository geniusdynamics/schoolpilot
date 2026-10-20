// ABOUTME: The canonical rows the report pages read: learners with their class, class groups,
// ABOUTME: levels, staff, departments and calendar periods, shaped the way the reports render them.

import { useMemo } from 'react';

import { useEntityQuery } from '@/data/query';
import type { RepositoryRow } from '@/data/repository';
import { PersonGender, StudentStatus } from '@/core/types';

import { useCanonicalRepository } from './canonicalRepository';

type LearnerRow = RepositoryRow<'learner'>;
type ClassGroupRow = RepositoryRow<'class_group'>;
type LevelRow = RepositoryRow<'level'>;
type StaffRow = RepositoryRow<'staff'>;
type AcademicYearRow = RepositoryRow<'academic_year'>;
type AcademicPeriodRow = RepositoryRow<'academic_period'>;

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
  /** The class group the learner is enrolled in. */
  readonly current_class_stream_id: string | null;
  readonly current_class_name: string | null;
  readonly current_class_stream_name: string | null;
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
  readonly id: string;
  readonly teacher_id: string;
  readonly teacher_name: string;
  readonly class_id: string;
  readonly class_stream_name: string;
  readonly subject_id: string;
  readonly subject_name: string;
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

/** The canonical rows the report pages read. */
export function useCanonicalReportData() {
  const repository = useCanonicalRepository();
  const learnersQuery = useEntityQuery(repository, 'learner');
  const classGroupsQuery = useEntityQuery(repository, 'class_group');
  const levelsQuery = useEntityQuery(repository, 'level');
  const staffQuery = useEntityQuery(repository, 'staff');
  const departmentsQuery = useEntityQuery(repository, 'department');
  const jobTitlesQuery = useEntityQuery(repository, 'job_title');
  const yearsQuery = useEntityQuery(repository, 'academic_year');
  const periodsQuery = useEntityQuery(repository, 'academic_period');
  const enrolmentsQuery = useEntityQuery(repository, 'enrolment');
  const learnerGuardiansQuery = useEntityQuery(repository, 'learner_guardian');
  const guardiansQuery = useEntityQuery(repository, 'guardian');
  const assignmentsQuery = useEntityQuery(repository, 'teaching_assignment');
  const teachingGroupsQuery = useEntityQuery(repository, 'teaching_group');
  const learningAreasQuery = useEntityQuery(repository, 'learning_area');

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
  const classGroupByLearner = useMemo(() => {
    const map = new Map<string, string>();
    for (const row of enrolmentsQuery.data?.items ?? []) {
      if (row.status !== 'active') continue;
      map.set(row.learner_id, row.class_group_id);
    }
    return map;
  }, [enrolmentsQuery.data]);
  const jobTitleNameById = useMemo(
    () => new Map<string, string>((jobTitlesQuery.data?.items ?? []).map((row) => [row.id, row.name] as const)),
    [jobTitlesQuery.data]
  );
  const departmentNameById = useMemo(
    () => new Map<string, string>((departmentsQuery.data?.items ?? []).map((row) => [row.id, row.name] as const)),
    [departmentsQuery.data]
  );
  const academicYearNameById = useMemo(
    () => new Map<string, string>((yearsQuery.data?.items ?? []).map((row) => [row.id, row.name] as const)),
    [yearsQuery.data]
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

  const students = useMemo<ReportStudent[]>(
    () =>
      (learnersQuery.data?.items ?? []).map((row: LearnerRow) => {
        const classGroupId = classGroupByLearner.get(row.id) ?? null;
        const classGroup = classGroupId ? classGroupById.get(classGroupId) : undefined;
        const levelName = classGroup ? levelNameById.get(classGroup.level_id) ?? null : null;
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
          current_class_stream_id: classGroupId,
          current_class_name: levelName,
          current_class_stream_name: classGroup?.name ?? null,
          student_category_name: '',
          dormitory_name: '',
          guardian_name: guardianName,
          guardian_phone: guardianPhone,
          primary_guardian: guardian ? { name: guardianName, phone: guardianPhone } : null,
          created_at: row.created_at,
        };
      }),
    [learnersQuery.data, classGroupByLearner, classGroupById, levelNameById, primaryGuardianByLearner]
  );

  const classStreams = useMemo<ReportClassStream[]>(
    () =>
      (classGroupsQuery.data?.items ?? []).map((row) => ({
        id: row.id,
        class_id: row.level_id,
        name: row.name,
      })),
    [classGroupsQuery.data]
  );

  const classes = useMemo<ReportClass[]>(
    () => (levelsQuery.data?.items ?? []).map((row: LevelRow) => ({ id: row.id, name: row.name })),
    [levelsQuery.data]
  );

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
      (yearsQuery.data?.items ?? []).map((row: AcademicYearRow) => ({
        id: row.id,
        name: row.name,
        start_date: row.start_date,
        end_date: row.end_date,
        is_active: row.status === 'current',
      })),
    [yearsQuery.data]
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

  const teacherSubjectAssignments = useMemo<ReportTeacherAssignment[]>(
    () =>
      (assignmentsQuery.data?.items ?? []).map((row) => {
        const group = teachingGroupById.get(row.teaching_group_id);
        const classGroupId = group?.class_group_ids[0] ?? '';
        const classGroup = classGroupById.get(classGroupId);
        return {
          id: row.id,
          teacher_id: row.staff_id,
          teacher_name: staffNameById.get(row.staff_id) ?? '',
          class_id: classGroupId,
          class_stream_name: classGroup?.name ?? '',
          subject_id: group?.learning_area_id ?? '',
          subject_name: group ? learningAreaNameById.get(group.learning_area_id) ?? '' : '',
          academic_year_name: group ? academicYearNameById.get(group.academic_year_id) ?? '' : '',
        };
      }),
    [assignmentsQuery.data, teachingGroupById, classGroupById, learningAreaNameById, staffNameById, academicYearNameById]
  );

  return {
    students,
    classes,
    classStreams,
    staff,
    departments,
    academicYears,
    schoolPeriods,
    teacherSubjectAssignments,
    status: learnersQuery.status,
    isLoading:
      learnersQuery.status === 'loading' ||
      classGroupsQuery.status === 'loading' ||
      staffQuery.status === 'loading',
    error: learnersQuery.error,
  };
}
