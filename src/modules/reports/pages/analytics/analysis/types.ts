// ABOUTME: The vocabulary of analysis v2: a cohort of engine-computed learner results, the summaries
// ABOUTME: subject, group, teacher and trend views read, the heat-map grid, and the ranking view the
// ABOUTME: pack's policy governs.

import type {
  AggregationIssue,
  RankingPolicy,
  RankingReason,
  TieMethod,
} from '@/domain/assessment/aggregation';
import type { AreaSource, LearnerResultRow } from '@/modules/academics/pages/results';

/** One learner in a cohort, under the name and admission number the analysis shows. */
export interface AnalysisLearner {
  readonly enrolmentId: string;
  readonly learnerName: string;
  readonly admissionNumber: string | null;
}

/**
 * One class group's results in one academic period.
 *
 * The rows are the results page's own computation - `evaluateArea` and `aggregateLearner` - so
 * analysis reads verdicts the engine already produced rather than a second set of numbers.
 */
export interface Cohort {
  readonly periodId: string;
  readonly periodName: string;
  readonly periodStart: string;
  readonly classGroupId: string;
  readonly classGroupName: string;
  readonly levelId: string;
  readonly levelName: string;
  readonly programmeId: string | null;
  /** The staff who teach this class group in this period, by group declaration or assignment. */
  readonly teacherIds: readonly string[];
  readonly areas: readonly AreaSource[];
  readonly learners: readonly AnalysisLearner[];
  readonly rows: readonly LearnerResultRow[];
  /** Whether any mark at all exists for these areas; false is an empty state, not a zero. */
  readonly hasMarks: boolean;
}

/** One band's share of a distribution, in the scale's own order. */
export interface BandCount {
  readonly code: string;
  readonly label: string;
  readonly count: number;
}

/**
 * A mean over the learners who have a result, with completeness beside it.
 *
 * `missing` is the count of learners in the population with no usable result. It is reported
 * rather than dropped, so an incomplete cohort is visible instead of averaged away.
 */
export interface CohortSummary {
  readonly withResult: number;
  readonly missing: number;
  readonly total: number;
  /** The exact mean, canonical text, or null when nobody has a result. */
  readonly mean: string | null;
  readonly distribution: readonly BandCount[];
}

/** A learner with no usable result, and why, so a gap is named rather than counted. */
export interface MissingLearner {
  readonly enrolmentId: string;
  readonly learnerName: string;
  readonly admissionNumber: string | null;
  readonly reason: string | null;
}

/** Per learning area: the distribution of bands and the mean, over a period. */
export interface SubjectAnalysisRow {
  readonly code: string;
  readonly name: string;
  readonly group: string | null;
  /** The class groups the area appears in. */
  readonly classes: number;
  readonly summary: CohortSummary;
}

/** Per class group: the aggregate's distribution, mean and the learners with no result. */
export interface GroupAnalysisRow {
  readonly classGroupId: string;
  readonly name: string;
  readonly levelName: string;
  readonly aggregateCode: string;
  readonly summary: CohortSummary;
  readonly missingLearners: readonly MissingLearner[];
}

/** Per teacher: the results of the groups they teach. */
export interface TeacherAnalysisRow {
  readonly staffId: string;
  readonly name: string;
  readonly groupCount: number;
  readonly classGroups: readonly string[];
  readonly summary: CohortSummary;
}

/**
 * One period's value in a trend.
 *
 * `value` is null for a period with no cohort or no result: a gap. A missing period is never
 * interpolated and never shown as zero.
 */
export interface TrendPoint {
  readonly periodId: string;
  readonly periodName: string;
  readonly value: string | null;
  readonly learners: number;
  readonly withResult: number;
  readonly missing: number;
}

/** One metric across periods, in period order. */
export interface TrendSeries {
  readonly key: string;
  readonly label: string;
  readonly points: readonly TrendPoint[];
}

/** One level of the pack's rubric, in the pack's declared order. */
export interface HeatmapLevel {
  readonly code: string;
  readonly label: string;
  readonly points: string;
  readonly descriptor: string | null;
}

/** One column of the heat-map: a competency or an outcome. */
export interface HeatmapColumn {
  readonly id: string;
  readonly key: string;
  readonly code: string;
  readonly label: string;
}

/**
 * One learner's cell.
 *
 * `levelCode` and `levelLabel` are the pack's own vocabulary; both are present so colour is never
 * the only carrier of the level.
 */
export interface HeatmapCell {
  readonly columnId: string;
  readonly levelCode: string | null;
  readonly levelLabel: string | null;
  readonly points: string | null;
  readonly observedOn: string | null;
}

export interface HeatmapRow {
  readonly enrolmentId: string;
  readonly learnerName: string;
  readonly admissionNumber: string | null;
  readonly cells: readonly HeatmapCell[];
}

export interface HeatmapView {
  readonly mode: HeatmapMode;
  readonly learningAreaName: string | null;
  readonly columns: readonly HeatmapColumn[];
  readonly levels: readonly HeatmapLevel[];
  readonly rows: readonly HeatmapRow[];
  /** Cells recorded and cells possible, so the grid's own completeness is visible. */
  readonly recorded: number;
  readonly total: number;
}

export type HeatmapMode = 'outcome' | 'competency';

/** One learner's position, or their reason for having none. */
export interface RankingRowView {
  readonly enrolmentId: string;
  readonly learnerName: string;
  readonly scope: string;
  readonly scopeLabel: string;
  /** The metric value the position was computed from, exact text, or null. */
  readonly value: string | null;
  /** The position, exact text, or null when the learner is unranked. */
  readonly position: string | null;
  /** How many learners in the scope were ranked; the M of `N/M`. */
  readonly out_of: number;
  readonly ranked: boolean;
  readonly reason: RankingReason;
}

/** The policy's verdict on this analysis, with no positions at all when it is disabled. */
export interface RankingView {
  readonly enabled: boolean;
  readonly by: string | null;
  readonly scope: string | null;
  readonly ties: TieMethod;
  readonly only_complete: boolean;
  readonly show_out_of: boolean;
  readonly show_on_report: boolean;
  readonly rows: readonly RankingRowView[];
  readonly issues: readonly AggregationIssue[];
}

/** The policy the analysis runs under, defaulting to the pack's declared one. */
export type { RankingPolicy };
