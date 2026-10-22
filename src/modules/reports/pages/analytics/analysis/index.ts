// ABOUTME: The analysis v2 public surface: the page, the hook behind it, the pure view models a test
// ABOUTME: drives directly, and the pack's ranking policy the positions are governed by.

export { AnalysisV2PageContent, default as AnalysisV2Page } from '../AnalysisV2Page';

export { useAnalysis, type AnalysisOptions, type AnalysisState, type AnalysisViewState } from './useAnalysis';

export { buildCohort, membershipDate } from './cohort';
export type { CohortRequest } from './cohort';

export { UNGRADED_CODE, UNGRADED_LABEL, distributionOf, meanOf, summarise } from './metrics';
export type { DistributionBand } from './metrics';

export { areaValues, aggregateValues, buildTrends, groupAnalysis, subjectAnalysis, teacherAnalysis } from './views';
export type { TrendMetric } from './views';

export { buildHeatmap } from './heatmap';
export type { HeatmapRequest } from './heatmap';

export { buildRankingView, metricValue } from './ranking';
export type { RankingLearner } from './ranking';

export { bundledRankingPolicy, loadRankingPolicy } from './policy';

export type {
  AnalysisLearner,
  BandCount,
  Cohort,
  CohortSummary,
  GroupAnalysisRow,
  HeatmapCell,
  HeatmapColumn,
  HeatmapLevel,
  HeatmapMode,
  HeatmapRow,
  HeatmapView,
  MissingLearner,
  RankingPolicy,
  RankingRowView,
  RankingView,
  SubjectAnalysisRow,
  TeacherAnalysisRow,
  TrendPoint,
  TrendSeries,
} from './types';
