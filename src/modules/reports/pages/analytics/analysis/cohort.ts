// ABOUTME: Assembles one class group's cohort in one academic period from canonical rows, and hands
// ABOUTME: every verdict to the results module's own engine bridge - `evaluateArea` and
// ABOUTME: `aggregateLearner` - so analysis reuses E03's computation instead of a second one.

import type { AggregationDefinition } from '@/domain/assessment/aggregation';
import type { MarkStatus } from '@/domain/assessment/engine';
import type { GradingScaleDefinition } from '@/domain/assessment/scales';
import type { TeachingScope } from '@/modules/academics/pages/marks';
import { resolveScheme } from '@/modules/academics/pages/marks';
import {
  aggregateLearner,
  evaluateArea,
  type AreaMark,
  type AreaSource,
} from '@/modules/academics/pages/results';

import type { AnalysisLearner, Cohort } from './types';

/** An `assessment_scheme` row, reduced to what the scheme resolver reads. */
export interface CohortSchemeRow {
  readonly id: string;
  readonly programmeId: string;
  readonly levelIds: readonly string[];
  readonly version: string;
  readonly definition: unknown;
}

/** An `assessment` row, reduced to what the area assembly reads. */
export interface CohortAssessmentRow {
  readonly id: string;
  readonly name: string;
  readonly scheme_slot: string | null;
  readonly kind: string;
  readonly max_score: number | null;
  readonly status: string;
  readonly academic_period_id: string;
  readonly learning_area_ids: readonly string[];
  readonly class_group_ids: readonly string[];
  readonly level_ids: readonly string[];
  readonly grading_scale_id?: string | null;
}

/** A `teaching_group` row, reduced to the period, area, class and teachers it names. */
export interface CohortTeachingGroupRow {
  readonly id: string;
  readonly name: string;
  readonly academic_year_id: string;
  readonly learning_area_id: string;
  readonly level_ids: readonly string[];
  readonly class_group_ids: readonly string[];
  readonly teacher_ids: readonly string[];
}

/** A `teaching_group_member` row, reduced to the membership window. */
export interface CohortMemberRow {
  readonly teaching_group_id: string;
  readonly enrolment_id: string;
  readonly valid_from: string;
  readonly valid_to?: string | null;
}

/** A `teaching_assignment` row, reduced to the effective window. */
export interface CohortAssignmentRow {
  readonly staff_id: string;
  readonly teaching_group_id: string;
  readonly valid_from: string;
  readonly valid_to?: string | null;
}

/** A `mark` row, reduced to the cell the area evaluation reads. */
export interface CohortMarkRow {
  readonly assessment_id: string;
  readonly enrolment_id: string;
  readonly learning_area_id: string;
  readonly score?: string | null;
  readonly status_code: MarkStatus;
}

/** A `learning_area` row, reduced to the name, code and group a table shows. */
export interface CohortLearningAreaRow {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly group?: string | null;
}

/** A `learner` row, reduced to the name and admission number. */
export interface CohortLearnerRow {
  readonly id: string;
  readonly given_name?: string;
  readonly family_name?: string;
  readonly admission_number?: string | null;
}

/** An `enrolment` row, reduced to the learner it joins to a class. */
export interface CohortEnrolmentRow {
  readonly id: string;
  readonly learner_id: string;
}

export interface CohortRequest {
  readonly period: {
    readonly id: string;
    readonly name: string;
    readonly start_date: string;
    readonly end_date: string;
    readonly academic_year_id: string;
  };
  readonly classGroup: {
    readonly id: string;
    readonly name: string;
    readonly level_id: string;
    readonly programme_id?: string | null;
    readonly academic_year_id: string;
  };
  readonly levelName: string;
  /** The actor's scope: only a group inside it contributes an area. */
  readonly scope: TeachingScope;
  readonly teachingGroups: readonly CohortTeachingGroupRow[];
  readonly members: readonly CohortMemberRow[];
  readonly assignments: readonly CohortAssignmentRow[];
  readonly assessments: readonly CohortAssessmentRow[];
  readonly learningAreas: readonly CohortLearningAreaRow[];
  readonly schemes: readonly CohortSchemeRow[];
  readonly scalesByRowId: ReadonlyMap<string, GradingScaleDefinition>;
  readonly marks: readonly CohortMarkRow[];
  readonly enrolments: readonly CohortEnrolmentRow[];
  readonly learners: readonly CohortLearnerRow[];
  readonly aggregation: AggregationDefinition;
  readonly scales: readonly GradingScaleDefinition[];
  /** The day membership is judged at; today by default, clamped into the period. */
  readonly at?: string;
}

/** Today, clamped into a period, so membership is judged on a date the period covers. */
export function membershipDate(period: {
  readonly start_date: string;
  readonly end_date: string;
}): string {
  const today = new Date().toISOString().slice(0, 10);
  if (today < period.start_date) return period.start_date;
  if (today > period.end_date) return period.end_date;
  return today;
}

function isEffective(from: string, to: string | null | undefined, at: string): boolean {
  if (from.slice(0, 10) > at) return false;
  return to == null || to.slice(0, 10) >= at;
}

/** The teaching groups that carry this class group's areas in this period, inside the scope. */
function coveringGroups(request: CohortRequest): readonly CohortTeachingGroupRow[] {
  return request.teachingGroups.filter(
    (group) =>
      request.scope.groupIds.has(group.id) &&
      group.academic_year_id === request.period.academic_year_id &&
      group.class_group_ids.includes(request.classGroup.id)
  );
}

/**
 * The learning areas this class group is marked on in this period.
 *
 * The scheme each area runs under is resolved by E03's own resolver, so a column means the same
 * thing on the results page and here.
 */
export function assembleAreas(request: CohortRequest): readonly AreaSource[] {
  const collected: AreaSource[] = [];
  const seen = new Set<string>();

  for (const group of coveringGroups(request)) {
    if (seen.has(group.learning_area_id)) continue;
    seen.add(group.learning_area_id);

    const groupLevelIds = group.level_ids;
    const periodAssessments = request.assessments.filter(
      (assessment) =>
        assessment.academic_period_id === request.period.id &&
        (assessment.learning_area_ids.length === 0 ||
          assessment.learning_area_ids.includes(group.learning_area_id)) &&
        (assessment.level_ids.length === 0 ||
          assessment.level_ids.some((id) => groupLevelIds.includes(id))) &&
        (assessment.class_group_ids.length === 0 ||
          assessment.class_group_ids.some((id) => group.class_group_ids.includes(id)))
    );

    const area = request.learningAreas.find((row) => row.id === group.learning_area_id);
    const resolved = resolveScheme({
      assessments: periodAssessments.map((assessment) => ({
        id: assessment.id,
        name: assessment.name,
        slot: assessment.scheme_slot,
        kind: assessment.kind,
        max: assessment.max_score,
        status: assessment.status,
      })),
      schemes: request.schemes,
      levelId: groupLevelIds[0] ?? null,
      programmeId: request.classGroup.programme_id ?? null,
    });

    // A learning area's band comes from the one scale its assessments share; two scales on one area
    // is a data problem, and no single band can be claimed for it.
    const scaleIds = new Set(
      periodAssessments
        .map((assessment) => assessment.grading_scale_id)
        .filter((id): id is string => typeof id === 'string')
    );
    const scale = scaleIds.size === 1 ? (request.scalesByRowId.get([...scaleIds][0]) ?? null) : null;

    collected.push({
      groupId: group.id,
      learningAreaId: group.learning_area_id,
      code: area?.code ?? group.learning_area_id,
      name: area?.name ?? group.name,
      group: area?.group ?? null,
      scheme: resolved.definition,
      columns: resolved.columns,
      scale,
    });
  }

  return collected.sort((left, right) => left.code.localeCompare(right.code));
}

/** The learners the cohort's areas are marked for, at the day membership is judged. */
export function assembleLearners(
  request: CohortRequest,
  areas: readonly AreaSource[]
): readonly AnalysisLearner[] {
  const areaGroupIds = new Set(areas.map((area) => area.groupId));
  const at = request.at ?? membershipDate(request.period);
  const enrolmentById = new Map(request.enrolments.map((row) => [row.id, row] as const));
  const learnerById = new Map(request.learners.map((row) => [row.id, row] as const));

  const seen = new Set<string>();
  const rows: AnalysisLearner[] = [];
  for (const member of request.members) {
    if (!areaGroupIds.has(member.teaching_group_id)) continue;
    if (!isEffective(member.valid_from, member.valid_to, at)) continue;
    if (seen.has(member.enrolment_id)) continue;
    seen.add(member.enrolment_id);
    const enrolment = enrolmentById.get(member.enrolment_id);
    const learner = enrolment === undefined ? undefined : learnerById.get(enrolment.learner_id);
    const name = learner
      ? [learner.given_name, learner.family_name].filter(Boolean).join(' ')
      : (enrolment?.learner_id ?? 'Unknown learner');
    rows.push({
      enrolmentId: member.enrolment_id,
      learnerName: name,
      admissionNumber: learner?.admission_number ?? null,
    });
  }
  return rows.sort((left, right) => left.learnerName.localeCompare(right.learnerName));
}

/** The staff who teach this class group in this period, by group declaration or assignment. */
export function assembleTeacherIds(request: CohortRequest): readonly string[] {
  const at = request.at ?? membershipDate(request.period);
  const covering = coveringGroups(request);
  const coveringIds = new Set(covering.map((group) => group.id));
  const teachers = new Set<string>();
  for (const group of covering) for (const id of group.teacher_ids) teachers.add(id);
  for (const assignment of request.assignments) {
    if (!coveringIds.has(assignment.teaching_group_id)) continue;
    if (!isEffective(assignment.valid_from, assignment.valid_to, at)) continue;
    teachers.add(assignment.staff_id);
  }
  return [...teachers].sort();
}

/** The marks of one learner and area, as the area evaluation reads them. */
function marksFor(
  index: ReadonlyMap<string, readonly AreaMark[]>,
  enrolmentId: string,
  area: AreaSource
): readonly AreaMark[] {
  return index.get(`${enrolmentId}|${area.learningAreaId}`) ?? [];
}

/** Indexes the cohort's marks once, so a learner-and-area lookup is not a scan per cell. */
function indexMarks(
  request: CohortRequest,
  areas: readonly AreaSource[]
): ReadonlyMap<string, readonly AreaMark[]> {
  const assessmentIds = new Set<string>();
  for (const area of areas) {
    for (const column of area.columns) {
      if (column.assessmentId !== null) assessmentIds.add(column.assessmentId);
    }
  }
  const areaIds = new Set(areas.map((area) => area.learningAreaId));
  const index = new Map<string, AreaMark[]>();
  for (const mark of request.marks) {
    if (!areaIds.has(mark.learning_area_id)) continue;
    if (!assessmentIds.has(mark.assessment_id)) continue;
    const key = `${mark.enrolment_id}|${mark.learning_area_id}`;
    const list = index.get(key) ?? [];
    list.push({ assessmentId: mark.assessment_id, score: mark.score ?? null, status: mark.status_code });
    index.set(key, list);
  }
  return index;
}

/**
 * The cohort: the areas, the learners, and each learner's area outcomes and aggregate.
 *
 * A learning area with no complete result is passed to the aggregation as incomplete rather than
 * dropped, so the denominator and the missing-value flag stay truthful.
 */
export function buildCohort(request: CohortRequest): Cohort {
  const areas = assembleAreas(request);
  const learners = areas.length === 0 ? [] : assembleLearners(request, areas);
  const marks = indexMarks(request, areas);

  const rows = learners.map((learner) => {
    const outcomes = areas.map((area) => evaluateArea(area, marksFor(marks, learner.enrolmentId, area)));
    const aggregate = aggregateLearner({
      definition: request.aggregation,
      areas,
      outcomes,
      context: { scales: request.scales },
    });
    return { ...learner, areas: outcomes, aggregate };
  });

  return {
    periodId: request.period.id,
    periodName: request.period.name,
    periodStart: request.period.start_date,
    classGroupId: request.classGroup.id,
    classGroupName: request.classGroup.name,
    levelId: request.classGroup.level_id,
    levelName: request.levelName,
    programmeId: request.classGroup.programme_id ?? null,
    teacherIds: assembleTeacherIds(request),
    areas,
    learners,
    rows,
    hasMarks: marks.size > 0,
  };
}
