// ABOUTME: The data behind analysis v2: the cohorts the actor's scope reaches, each computed by the
// ABOUTME: results module's engine bridge, and the subject, group, teacher, trend, heat-map and
// ABOUTME: ranking views built from them. Scope is E03's own resolution, never a second model.

import { useMemo } from 'react';

import { useEntityQuery } from '@/data/query';
import { MAX_LIMIT } from '@/data/repository';
import type { AggregationDefinition, RankingPolicy } from '@/domain/assessment/aggregation';
import type { GradingScaleDefinition, GradingScaleKind } from '@/domain/assessment/scales';
import type { Id } from '@/domain/ids';

import { useCanonicalAcademics } from '@/modules/academics/data/useCanonicalAcademics';
import { resolveTeachingScope } from '@/modules/academics/pages/marks';
import type { TeachingScope } from '@/modules/academics/pages/marks';
import {
  DEFAULT_AGGREGATION_CODE,
  classGroupsInScope,
  defaultAggregation,
  describeAggregation,
} from '@/modules/academics/pages/results';
import { bundledObservationPack } from '@/modules/academics/pages/observations';
import type { ObservationPack } from '@/modules/academics/pages/observations';

import { buildCohort, type CohortRequest } from './cohort';
import { buildHeatmap } from './heatmap';
import { bundledRankingPolicy } from './policy';
import { buildRankingView, metricValue, type RankingLearner } from './ranking';
import { areaValues, aggregateValues, buildTrends, groupAnalysis, subjectAnalysis, teacherAnalysis } from './views';
import type { DistributionBand } from './metrics';
import type {
  GroupAnalysisRow,
  HeatmapColumn,
  HeatmapMode,
  HeatmapView,
  RankingView,
  SubjectAnalysisRow,
  TeacherAnalysisRow,
  TrendSeries,
} from './types';
import type { Cohort } from './types';

/** Which screen the analysis shows. Every state other than `ready` explains what is missing. */
export type AnalysisViewState =
  | 'loading'
  | 'error'
  | 'no-scope'
  | 'no-areas'
  | 'no-learners'
  | 'ready';

export interface AnalysisOptions {
  readonly actorId: string;
  readonly role: string | null;
  readonly periodId: Id<'academic_period'> | null;
  readonly classGroupId: Id<'class_group'> | null;
  /** The rule the aggregate is computed with; the page defaults it when the pack declares none. */
  readonly aggregation?: AggregationDefinition;
  /** The pack's ranking policy; the bundled pack's own when the caller names none. */
  readonly ranking?: RankingPolicy;
  /** The observation pack the heat-map reads its levels from. */
  readonly pack?: ObservationPack;
  /** Additional scales, such as the pack's, merged over the programme's stored scales by code. */
  readonly extraScales?: readonly GradingScaleDefinition[];
  /** The learning area the heat-map reads; '' shows every area with observations. */
  readonly learningAreaId?: string;
  readonly heatmapMode?: HeatmapMode;
}

export interface AnalysisState {
  readonly state: AnalysisViewState;
  readonly scope: TeachingScope;
  /** The periods of the selected period's academic year, in date order. */
  readonly periods: readonly { readonly id: string; readonly name: string; readonly start_date: string }[];
  readonly periodName: string | null;
  readonly classGroupName: string | null;
  readonly reachableClassIds: ReadonlySet<string>;
  readonly subjects: readonly SubjectAnalysisRow[];
  readonly groups: readonly GroupAnalysisRow[];
  readonly teachers: readonly TeacherAnalysisRow[];
  readonly trends: readonly TrendSeries[];
  readonly heatmap: HeatmapView;
  readonly ranking: RankingView;
  readonly aggregateCode: string;
  readonly aggregationNote: string;
  /** Whether any mark at all exists for these areas; false is an empty state, not a zero. */
  readonly hasMarks: boolean;
}

/** A stored grading scale as the engine's definition, or null when the stored kind is unknown. */
function toScaleDefinition(row: {
  readonly code: string;
  readonly kind: string;
  readonly bands: readonly {
    readonly code: string;
    readonly label: string;
    readonly min: number;
    readonly max: number;
    readonly points?: number;
    readonly descriptor?: string;
  }[];
}): GradingScaleDefinition | null {
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

/** The engine's name for a stored scale kind; the canonical table still says `mark_out_of_20`. */
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

/** The bands of the scale an aggregation awards its band on, in the scale's own order. */
function aggregateBands(
  aggregation: AggregationDefinition,
  scales: readonly GradingScaleDefinition[]
): readonly DistributionBand[] {
  const scale = scales.find((candidate) => candidate.code === aggregation.result_scale);
  return (scale?.bands ?? []).map((band) => ({ code: band.code, label: band.label }));
}

/**
 * The analysis screen's data.
 *
 * Reads go through the canonical repository and the computation is the results module's own engine
 * bridge, so a number here and the same number on the results page come from one place. Only the
 * class groups the actor's scope reaches become cohorts, so a teacher's analysis cannot show
 * another teacher's groups.
 */
export function useAnalysis(options: AnalysisOptions): AnalysisState {
  const { actorId, role, periodId, classGroupId } = options;
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
    levels,
    staff,
    learnerById,
    enrolments,
    learningAreas,
    gradingScales,
    isLoading: canonicalLoading,
    isError: canonicalError,
  } = canonical;

  const schemeQuery = useEntityQuery(repository, 'assessment_scheme', { limit: MAX_LIMIT });
  const outcomeQuery = useEntityQuery(repository, 'outcome', { limit: MAX_LIMIT });
  const competencyQuery = useEntityQuery(repository, 'competency', { limit: MAX_LIMIT });
  const observationQuery = useEntityQuery(repository, 'competency_observation', { limit: MAX_LIMIT });

  const aggregation = options.aggregation ?? defaultAggregation();
  const pack = options.pack ?? (bundledObservationPack.ok ? bundledObservationPack.pack : null);
  const rankingPolicy = options.ranking ?? bundledRankingPolicy;
  const learningAreaId = options.learningAreaId ?? '';
  const heatmapMode = options.heatmapMode ?? 'competency';

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
    () => teachingGroups.map((row) => ({ id: row.id, classGroupIds: row.class_group_ids ?? [] })),
    [teachingGroups]
  );

  const reachableClassIds = useMemo(
    () => classGroupsInScope(scope, groupsInReach),
    [scope, groupsInReach]
  );

  const sortedPeriods = useMemo(
    () =>
      [...academicPeriods].sort((left, right) =>
        `${left.start_date}`.localeCompare(`${right.start_date}`)
      ),
    [academicPeriods]
  );

  const period = useMemo(() => {
    if (periodId !== null) return sortedPeriods.find((row) => row.id === periodId) ?? null;
    return (
      sortedPeriods.find((row) => row.status === 'current') ??
      sortedPeriods[sortedPeriods.length - 1] ??
      null
    );
  }, [sortedPeriods, periodId]);

  const periods = useMemo(
    () =>
      period === null
        ? []
        : sortedPeriods
            .filter((row) => row.academic_year_id === period.academic_year_id)
            .map((row) => ({ id: row.id, name: row.name, start_date: row.start_date })),
    [sortedPeriods, period]
  );

  const classGroup = useMemo(
    () => (classGroupId === null ? null : (classGroups.find((row) => row.id === classGroupId) ?? null)),
    [classGroups, classGroupId]
  );

  const scales = useMemo(() => {
    const byCode = new Map<string, GradingScaleDefinition>();
    for (const row of gradingScales) {
      const definition = toScaleDefinition(row);
      if (definition !== null) byCode.set(row.code, definition);
    }
    for (const scale of options.extraScales ?? []) byCode.set(scale.code, scale);
    return [...byCode.values()];
  }, [gradingScales, options.extraScales]);

  const scalesByRowId = useMemo(() => {
    const map = new Map<string, GradingScaleDefinition>();
    for (const row of gradingScales) {
      const definition = toScaleDefinition(row);
      if (definition !== null) map.set(row.id, definition);
    }
    return map;
  }, [gradingScales]);

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

  /** The class groups the analysis evaluates: the actor's reach, the chosen year, and the picker. */
  const evaluatedClassGroups = useMemo(() => {
    if (period === null) return [];
    return classGroups
      .filter(
        (row) =>
          reachableClassIds.has(row.id) &&
          row.academic_year_id === period.academic_year_id &&
          (classGroupId === null || row.id === classGroupId)
      )
      .sort((left, right) => left.name.localeCompare(right.name));
  }, [classGroups, reachableClassIds, period, classGroupId]);

  const cohortRequest = useMemo<Omit<CohortRequest, 'period' | 'classGroup' | 'levelName'> | null>(() => {
    if (period === null || evaluatedClassGroups.length === 0) return null;
    return {
      scope,
      teachingGroups: teachingGroups.map((row) => ({
        id: row.id,
        name: row.name,
        academic_year_id: row.academic_year_id,
        learning_area_id: row.learning_area_id,
        level_ids: row.level_ids ?? [],
        class_group_ids: row.class_group_ids ?? [],
        teacher_ids: row.teacher_ids ?? [],
      })),
      members: teachingGroupMembers.map((row) => ({
        teaching_group_id: row.teaching_group_id,
        enrolment_id: row.enrolment_id,
        valid_from: row.valid_from,
        valid_to: row.valid_to ?? null,
      })),
      assignments: teachingAssignments.map((row) => ({
        staff_id: row.staff_id,
        teaching_group_id: row.teaching_group_id,
        valid_from: row.valid_from,
        valid_to: row.valid_to ?? null,
      })),
      assessments: assessments.map((row) => ({
        id: row.id,
        name: row.name,
        scheme_slot: row.scheme_slot ?? null,
        kind: row.kind,
        max_score: row.max_score ?? null,
        status: row.status,
        academic_period_id: row.academic_period_id,
        learning_area_ids: row.learning_area_ids ?? [],
        class_group_ids: row.class_group_ids ?? [],
        level_ids: row.level_ids ?? [],
        grading_scale_id: row.grading_scale_id ?? null,
      })),
      learningAreas: learningAreas.map((row) => ({
        id: row.id,
        code: row.code,
        name: row.name,
        group: row.group ?? null,
      })),
      schemes,
      scalesByRowId,
      marks: marks.map((row) => ({
        assessment_id: row.assessment_id,
        enrolment_id: row.enrolment_id,
        learning_area_id: row.learning_area_id,
        score: row.score ?? null,
        status_code: row.status_code,
      })),
      enrolments: enrolments.map((row) => ({ id: row.id, learner_id: row.learner_id })),
      learners: [...learnerById.values()].map((row) => ({
        id: row.id,
        given_name: row.given_name,
        family_name: row.family_name,
        admission_number: row.admission_number ?? null,
      })),
      aggregation,
      scales,
    };
  }, [
    period,
    evaluatedClassGroups,
    scope,
    teachingGroups,
    teachingGroupMembers,
    teachingAssignments,
    assessments,
    learningAreas,
    schemes,
    scalesByRowId,
    marks,
    enrolments,
    learnerById,
    aggregation,
    scales,
  ]);

  const levelNameById = useMemo(
    () => new Map<string, string>(levels.map((row) => [row.id as string, row.name] as const)),
    [levels]
  );

  /** Every cohort of the selected year: each period against each class group the actor reaches. */
  const yearCohorts = useMemo<readonly Cohort[]>(() => {
    if (cohortRequest === null || period === null) return [];
    const byId = new Map(sortedPeriods.map((row) => [row.id, row] as const));
    const inYear = periods
      .map((row) => byId.get(row.id))
      .filter((row): row is NonNullable<typeof row> => row !== undefined);
    const cohorts: Cohort[] = [];
    for (const academicPeriod of inYear) {
      for (const group of evaluatedClassGroups) {
        cohorts.push(
          buildCohort({
            ...cohortRequest,
            period: academicPeriod,
            classGroup: group,
            levelName: levelNameById.get(group.level_id) ?? group.level_id,
          })
        );
      }
    }
    return cohorts;
  }, [cohortRequest, period, sortedPeriods, periods, evaluatedClassGroups, levelNameById]);

  const periodCohorts = useMemo(
    () => (period === null ? [] : yearCohorts.filter((cohort) => cohort.periodId === period.id)),
    [yearCohorts, period]
  );

  const bands = useMemo(() => aggregateBands(aggregation, scales), [aggregation, scales]);

  const staffName = useMemo(
    () => (staffId: string) => {
      const row = staff.find((candidate) => candidate.id === staffId);
      if (row === undefined) return staffId;
      const name = [row.given_name, row.family_name].filter(Boolean).join(' ');
      return name === '' ? staffId : name;
    },
    [staff]
  );

  const subjects = useMemo(() => subjectAnalysis(periodCohorts), [periodCohorts]);

  const groups = useMemo(() => groupAnalysis(periodCohorts, bands), [periodCohorts, bands]);

  const teachers = useMemo(
    () => teacherAnalysis(periodCohorts, staffName, bands),
    [periodCohorts, staffName, bands]
  );

  const trends = useMemo(() => {
    const areaCodes = [...new Set(yearCohorts.flatMap((cohort) => cohort.areas.map((area) => area.code)))];
    const areaNames = new Map<string, string>();
    for (const cohort of yearCohorts) {
      for (const area of cohort.areas) if (!areaNames.has(area.code)) areaNames.set(area.code, area.name);
    }
    const metrics = [
      { key: aggregation.code, label: `Overall (${aggregation.code})`, valueOf: aggregateValues },
      ...areaCodes
        .sort((left, right) => left.localeCompare(right))
        .map((code) => ({
          key: code,
          label: areaNames.get(code) ?? code,
          valueOf: areaValues(code),
        })),
    ];
    return buildTrends(yearCohorts, periods, metrics);
  }, [yearCohorts, periods, aggregation.code]);

  const heatmap = useMemo<HeatmapView>(() => {
    const focus = classGroup ?? evaluatedClassGroups[0] ?? null;
    const levelsForPack = (pack?.levels ?? []).map((level) => ({
      code: level.code,
      label: level.label,
      points: level.points,
      descriptor: level.descriptor,
    }));
    if (focus === null || pack === null) {
      return { mode: heatmapMode, learningAreaName: null, columns: [], levels: levelsForPack, rows: [], recorded: 0, total: 0 };
    }

    const focusLearners = enrolments
      .filter((row) => row.class_group_id === focus.id && row.status === 'active')
      .map((row) => {
        const learner = learnerById.get(row.learner_id);
        const name = learner
          ? [learner.given_name, learner.family_name].filter(Boolean).join(' ')
          : row.learner_id;
        return {
          enrolmentId: row.id,
          learnerName: name,
          admissionNumber: learner?.admission_number ?? null,
        };
      })
      .sort((left, right) => left.learnerName.localeCompare(right.learnerName));

    const observations = observationQuery.data?.items ?? [];
    const columns: HeatmapColumn[] =
      heatmapMode === 'competency'
        ? (competencyQuery.data?.items ?? [])
            .filter((row) => row.programme_id === focus.programme_id)
            .sort((left, right) => left.code.localeCompare(right.code))
            .map((row) => ({
              id: row.id,
              key: `competency:${row.id}`,
              code: row.code,
              label: row.name,
            }))
        : (outcomeQuery.data?.items ?? [])
            .filter(
              (row) =>
                row.level_id === focus.level_id &&
                (learningAreaId === '' || row.learning_area_id === learningAreaId)
            )
            .sort((left, right) => left.code.localeCompare(right.code))
            .map((row) => ({
              id: row.id,
              key: `outcome:${row.id}`,
              code: row.code,
              label: row.text,
            }));

    const area = learningAreas.find((row) => row.id === learningAreaId) ?? null;
    const scoped = observations.filter(
      (row) => learningAreaId === '' || row.learning_area_id === learningAreaId
    );

    return buildHeatmap({
      mode: heatmapMode,
      learningAreaName: area?.name ?? null,
      learners: focusLearners,
      columns,
      observations: scoped,
      levels: levelsForPack,
    });
  }, [
    classGroup,
    evaluatedClassGroups,
    pack,
    heatmapMode,
    enrolments,
    learnerById,
    observationQuery.data,
    competencyQuery.data,
    outcomeQuery.data,
    learningAreas,
    learningAreaId,
  ]);

  const ranking = useMemo<RankingView>(() => {
    const rankingScope = rankingPolicy.scope ?? 'class_group';
    const learners: RankingLearner[] = periodCohorts.flatMap((cohort) =>
      cohort.rows.map((row) => ({
        enrolmentId: row.enrolmentId,
        learnerName: row.learnerName,
        scope:
          rankingScope === 'level'
            ? cohort.levelId
            : rankingScope === 'programme'
              ? (cohort.programmeId ?? '')
              : cohort.classGroupId,
        scopeLabel:
          rankingScope === 'level'
            ? cohort.levelName
            : rankingScope === 'programme'
              ? (cohort.programmeId ?? '')
              : cohort.classGroupName,
        value: metricValue(rankingPolicy.by ?? null, row.aggregate),
        complete: row.aggregate.status === 'complete',
      }))
    );
    return buildRankingView(rankingPolicy, learners);
  }, [periodCohorts, rankingPolicy]);

  const state: AnalysisViewState =
    canonicalLoading ||
    schemeQuery.status === 'loading' ||
    outcomeQuery.status === 'loading' ||
    competencyQuery.status === 'loading' ||
    observationQuery.status === 'loading'
      ? 'loading'
      : canonicalError ||
          schemeQuery.status === 'error' ||
          outcomeQuery.status === 'error' ||
          competencyQuery.status === 'error' ||
          observationQuery.status === 'error'
        ? 'error'
        : scope.groupIds.size === 0 || reachableClassIds.size === 0
          ? 'no-scope'
          : period === null || evaluatedClassGroups.length === 0
            ? 'no-areas'
            : periodCohorts.every((cohort) => cohort.areas.length === 0)
              ? 'no-areas'
              : periodCohorts.every((cohort) => cohort.learners.length === 0)
                ? 'no-learners'
                : 'ready';

  return {
    state,
    scope,
    periods,
    periodName: period?.name ?? null,
    classGroupName: classGroup?.name ?? null,
    reachableClassIds,
    subjects,
    groups,
    teachers,
    trends,
    heatmap,
    ranking,
    aggregateCode: aggregation.code || DEFAULT_AGGREGATION_CODE,
    aggregationNote: describeAggregation(aggregation),
    hasMarks: periodCohorts.some((cohort) => cohort.hasMarks),
  };
}
