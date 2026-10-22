// ABOUTME: The data behind the results page: the classes the actor reaches, the learning areas of the
// ABOUTME: chosen class, each learner's area results from the engine, and the aggregate with its trace.

import { useCallback, useMemo, useState } from 'react';

import { useEntityQuery } from '@/data/query';
import { MAX_LIMIT } from '@/data/repository';
import type { AggregationDefinition } from '@/domain/assessment/aggregation';
import type { GradingScaleDefinition, GradingScaleKind } from '@/domain/assessment/scales';
import type { Id } from '@/domain/ids';

import { useCanonicalAcademics } from '../../data/useCanonicalAcademics';
import { resolveScheme } from '../marks/scheme';
import { resolveTeachingScope } from '../marks/teachingScope';
import type { RepositoryRow } from '@/data/repository';
import type { TeachingScope } from '../marks/types';
import type { WorkflowStore } from '../marks/workflow';
import { MarkWorkflow, createStorageWorkflowStore } from '../marks/workflow';
import { aggregateLearner, evaluateArea, type AreaMark, type AreaSource } from './compute';
import { GradeModeration, classGroupsInScope } from './moderation';
import type { GradeOverrideView, LearnerResultRow } from './types';

/** Which screen the page shows. Every state other than `ready` explains what is missing. */
export type ResultsViewState =
  | 'loading'
  | 'error'
  | 'no-scope'
  | 'outside-scope'
  | 'no-areas'
  | 'no-learners'
  | 'ready';

export interface ResultsOptions {
  readonly actorId: string;
  readonly role: string | null;
  readonly periodId: Id<'academic_period'> | null;
  readonly classGroupId: Id<'class_group'> | null;
  /** The rule the aggregate is computed with; the page defaults it when the pack declares none. */
  readonly aggregation: AggregationDefinition;
  /** Additional scales, such as the pack's, merged over the programme's stored scales by code. */
  readonly extraScales?: readonly GradingScaleDefinition[];
  /** Injected so a test reads exactly the workflow record the page wrote. */
  readonly workflowStore?: WorkflowStore;
  /** Injected clock, so a moderation carries a time the test can name. */
  readonly now?: () => string;
}

export interface ResultsState {
  readonly state: ResultsViewState;
  readonly scope: TeachingScope;
  readonly periodName: string | null;
  readonly classGroupName: string | null;
  readonly reachableClassIds: ReadonlySet<string>;
  readonly areas: readonly AreaSource[];
  readonly rows: readonly LearnerResultRow[];
  /** Whether any mark at all exists for these areas; false is an empty state, not a zero. */
  readonly hasMarks: boolean;
  readonly scales: readonly GradingScaleDefinition[];
  readonly overrideOf: (enrolmentId: string) => GradeOverrideView | null;
  readonly overrideGrade: (input: {
    readonly enrolmentId: string;
    readonly computed: string;
    readonly value: string;
    readonly reason: string;
  }) => void;
  readonly releaseGrade: (input: {
    readonly enrolmentId: string;
    readonly current: GradeOverrideView;
    readonly reason: string;
  }) => void;
}

/** Today, clamped into a period, so membership is judged on a date the period covers. */
function membershipDate(period: { readonly start_date: string; readonly end_date: string } | undefined): string {
  const today = new Date().toISOString().slice(0, 10);
  if (!period) return today;
  if (today < period.start_date) return period.start_date;
  if (today > period.end_date) return period.end_date;
  return today;
}

/** A stored grading scale as the engine's definition, or null when the stored kind is unknown. */
function toScaleDefinition(row: RepositoryRow<'grading_scale'>): GradingScaleDefinition | null {
  const kind = scaleKindOf(row.kind);
  if (kind === null) return null;
  return {
    code: row.code,
    kind,
    bands: row.bands.map((band) => ({
      code: band.code,
      label: band.label,
      min: band.min,
      max: band.max,
      ...(band.points === undefined ? {} : { points: band.points }),
      ...(band.descriptor === undefined ? {} : { descriptor: band.descriptor }),
    })),
  };
}

/**
 * The engine's name for a stored scale kind.
 *
 * The canonical table still names the Francophone scale `mark_out_of_20` while the engine (and the
 * pack schema) calls it `out_of_20`; the two vocabularies meet here, once, rather than in every
 * band lookup. A kind neither names is skipped: no band can be claimed for it.
 */
function scaleKindOf(kind: string): GradingScaleKind | null {
  switch (kind) {
    case 'numeric_bands':
    case 'rubric':
    case 'points':
    case 'letter':
    case 'division':
    case 'gpa':
    case 'descriptor':
    case 'out_of_20':
      return kind;
    case 'mark_out_of_20':
      return 'out_of_20';
    default:
      return null;
  }
}

/**
 * The results screen's data.
 *
 * Reads go through the canonical repository; the computation is the engine's. A learning area with
 * no complete result is passed to the aggregation as incomplete rather than dropped, so the
 * denominator and the missing-value flag stay truthful.
 */
export function useResults(options: ResultsOptions): ResultsState {
  const { actorId, role, periodId, classGroupId, aggregation } = options;
  const canonical = useCanonicalAcademics();
  const {
    repository,
    assessments,
    teachingGroups,
    teachingAssignments,
    teachingGroupMembers,
    marks,
    academicPeriods,
    classGroups,
    staff,
    learnerById,
    enrolmentById,
    learningAreas,
    gradingScales,
    institutionId,
    isLoading: canonicalLoading,
    isError: canonicalError,
  } = canonical;

  const schemeQuery = useEntityQuery(repository, 'assessment_scheme', { limit: MAX_LIMIT });

  const scope = useMemo<TeachingScope>(
    () =>
      resolveTeachingScope({
        role,
        actorId,
        staff: staff.map((row) => ({ id: row.id, userId: row.user_id ?? null })),
        groups: teachingGroups.map((row) => ({
          id: row.id,
          teacherIds: row.teacher_ids ?? [],
          classGroupIds: row.class_group_ids ?? [],
        })),
        assignments: teachingAssignments.map((row) => ({
          staffId: row.staff_id,
          teachingGroupId: row.teaching_group_id,
          validFrom: row.valid_from,
          validTo: row.valid_to ?? null,
        })),
        classGroups: classGroups.map((row) => ({
          id: row.id,
          homeroomTeacherIds: row.homeroom_teacher_ids ?? [],
        })),
      }),
    [role, actorId, staff, teachingGroups, teachingAssignments, classGroups]
  );

  const groupsInReach = useMemo(
    () =>
      teachingGroups.map((row) => ({
        id: row.id,
        classGroupIds: row.class_group_ids ?? [],
      })),
    [teachingGroups]
  );

  const reachableClassIds = useMemo(
    () => classGroupsInScope(scope, groupsInReach),
    [scope, groupsInReach]
  );

  const period = useMemo(
    () => academicPeriods.find((row) => row.id === periodId) ?? null,
    [academicPeriods, periodId]
  );
  const classGroup = useMemo(
    () => classGroups.find((row) => row.id === classGroupId) ?? null,
    [classGroups, classGroupId]
  );

  const scalesByRowId = useMemo(() => {
    const map = new Map<string, GradingScaleDefinition>();
    for (const row of gradingScales) {
      const definition = toScaleDefinition(row);
      if (definition !== null) map.set(row.id, definition);
    }
    return map;
  }, [gradingScales]);

  const scales = useMemo(() => {
    const byCode = new Map<string, GradingScaleDefinition>();
    for (const row of gradingScales) {
      const definition = toScaleDefinition(row);
      if (definition !== null) byCode.set(row.code, definition);
    }
    for (const scale of options.extraScales ?? []) byCode.set(scale.code, scale);
    return [...byCode.values()];
  }, [gradingScales, options.extraScales]);

  const schemes = useMemo(
    () =>
      (schemeQuery.data?.items ?? []).map((row) => ({
        id: row.id,
        programmeId: row.programme_id,
        levelIds: row.level_ids ?? [],
        version: row.version,
        definition: row.definition,
      })),
    [schemeQuery.data]
  );

  const areas = useMemo<readonly AreaSource[]>(() => {
    if (classGroup === null || period === null) return [];
    const collected: AreaSource[] = [];
    const seenAreas = new Set<string>();

    for (const group of teachingGroups) {
      if (!scope.groupIds.has(group.id)) continue;
      if (group.academic_year_id !== period.academic_year_id) continue;
      if (!(group.class_group_ids ?? []).includes(classGroup.id)) continue;
      if (seenAreas.has(group.learning_area_id)) continue;
      seenAreas.add(group.learning_area_id);

      const groupLevelIds = group.level_ids ?? [];
      const periodAssessments = assessments.filter(
        (assessment) =>
          assessment.academic_period_id === period.id &&
          (assessment.learning_area_ids.length === 0 ||
            assessment.learning_area_ids.includes(group.learning_area_id)) &&
          (assessment.level_ids.length === 0 ||
            assessment.level_ids.some((id) => groupLevelIds.includes(id))) &&
          (assessment.class_group_ids.length === 0 ||
            assessment.class_group_ids.some((id) => (group.class_group_ids ?? []).includes(id)))
      );

      const area = learningAreas.find((row) => row.id === group.learning_area_id);
      const resolved = resolveScheme({
        assessments: periodAssessments.map((assessment) => ({
          id: assessment.id,
          name: assessment.name,
          slot: assessment.scheme_slot ?? null,
          kind: assessment.kind,
          max: assessment.max_score ?? null,
          status: assessment.status,
        })),
        schemes,
        levelId: groupLevelIds[0] ?? null,
        programmeId: classGroup.programme_id ?? null,
      });

      // A learning area's band comes from the one scale its assessments share; two different
      // scales on one area is a data problem, and no single band can be claimed for it.
      const scaleIds = new Set(
        periodAssessments
          .map((assessment) => assessment.grading_scale_id)
          .filter((id): id is string => typeof id === 'string')
      );
      const scale = scaleIds.size === 1 ? (scalesByRowId.get([...scaleIds][0]) ?? null) : null;

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
  }, [classGroup, period, teachingGroups, scope, assessments, learningAreas, schemes, scalesByRowId]);

  const areaGroupIds = useMemo(() => new Set(areas.map((area) => area.groupId)), [areas]);

  const members = useMemo(() => {
    if (areas.length === 0) return [];
    const date = membershipDate(period ?? undefined);
    return teachingGroupMembers.filter(
      (member) =>
        areaGroupIds.has(member.teaching_group_id) &&
        member.valid_from <= date &&
        (member.valid_to == null || member.valid_to >= date)
    );
  }, [teachingGroupMembers, areaGroupIds, areas.length, period]);

  const learners = useMemo(() => {
    const seen = new Set<string>();
    const rows: { enrolmentId: string; learnerName: string; admissionNumber: string | null }[] = [];
    for (const member of members) {
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
  }, [members, enrolmentById, learnerById]);

  const marksByLearnerArea = useMemo(() => {
    const areaIds = new Set(areas.map((area) => area.learningAreaId));
    const assessmentIds = new Set<string>();
    for (const area of areas) {
      for (const column of area.columns) {
        if (column.assessmentId !== null) assessmentIds.add(column.assessmentId);
      }
    }
    const index = new Map<string, AreaMark[]>();
    let hasMarks = false;
    for (const mark of marks) {
      if (!areaIds.has(mark.learning_area_id)) continue;
      if (!assessmentIds.has(mark.assessment_id)) continue;
      hasMarks = true;
      const key = `${mark.enrolment_id}|${mark.learning_area_id}`;
      const list = index.get(key) ?? [];
      list.push({
        assessmentId: mark.assessment_id,
        score: mark.score ?? null,
        status: mark.status_code,
      });
      index.set(key, list);
    }
    return { index, hasMarks };
  }, [marks, areas]);

  const rows = useMemo<readonly LearnerResultRow[]>(() => {
    if (areas.length === 0) return [];
    return learners.map((learner) => {
      const outcomes = areas.map((area) =>
        evaluateArea(
          area,
          marksByLearnerArea.index.get(`${learner.enrolmentId}|${area.learningAreaId}`) ?? []
        )
      );
      const aggregate = aggregateLearner({
        definition: aggregation,
        areas,
        outcomes,
        context: { scales },
      });
      return { ...learner, areas: outcomes, aggregate };
    });
  }, [learners, areas, marksByLearnerArea, aggregation, scales]);

  const workflowKey = institutionId ?? 'institution';
  const workflow = useMemo(
    () =>
      new MarkWorkflow(
        options.workflowStore ??
          createStorageWorkflowStore(
            `schoolpilot.marks.workflow.v1:${workflowKey}`,
            `schoolpilot.marks.workflow-audit.v1:${workflowKey}`
          )
      ),
    [options.workflowStore, workflowKey]
  );

  const moderation = useMemo(
    () => new GradeModeration(workflow, scope, groupsInReach),
    [workflow, scope, groupsInReach]
  );

  const [revision, setRevision] = useState(0);
  const now = useMemo(() => options.now ?? (() => new Date().toISOString()), [options.now]);

  const overrideOf = useCallback(
    (enrolmentId: string): GradeOverrideView | null => {
      // The workflow is mutable state outside React; the revision is what makes this recompute.
      void revision;
      if (classGroupId === null) return null;
      return moderation.read(aggregation.code, classGroupId, enrolmentId);
    },
    [moderation, classGroupId, aggregation.code, revision]
  );

  const overrideGrade = useCallback(
    (input: { enrolmentId: string; computed: string; value: string; reason: string }) => {
      if (classGroupId === null) return;
      moderation.override({
        aggregationCode: aggregation.code,
        classGroupId,
        enrolmentId: input.enrolmentId,
        computed: input.computed,
        value: input.value,
        reason: input.reason,
        actorId,
        at: now(),
      });
      setRevision((current) => current + 1);
    },
    [moderation, classGroupId, aggregation.code, actorId, now]
  );

  const releaseGrade = useCallback(
    (input: { enrolmentId: string; current: GradeOverrideView; reason: string }) => {
      if (classGroupId === null) return;
      moderation.release({
        aggregationCode: aggregation.code,
        classGroupId,
        enrolmentId: input.enrolmentId,
        current: input.current,
        reason: input.reason,
        actorId,
        at: now(),
      });
      setRevision((current) => current + 1);
    },
    [moderation, classGroupId, aggregation.code, actorId, now]
  );

  const state: ResultsViewState =
    canonicalLoading || schemeQuery.status === 'loading'
      ? 'loading'
      : canonicalError || schemeQuery.status === 'error'
        ? 'error'
        : scope.groupIds.size === 0 || reachableClassIds.size === 0
          ? 'no-scope'
          : classGroupId !== null && !reachableClassIds.has(classGroupId)
            ? 'outside-scope'
            : areas.length === 0
              ? 'no-areas'
              : rows.length === 0
                ? 'no-learners'
                : 'ready';

  return {
    state,
    scope,
    periodName: period?.name ?? null,
    classGroupName: classGroup?.name ?? null,
    reachableClassIds,
    areas,
    rows,
    hasMarks: marksByLearnerArea.hasMarks,
    scales,
    overrideOf,
    overrideGrade,
    releaseGrade,
  };
}
