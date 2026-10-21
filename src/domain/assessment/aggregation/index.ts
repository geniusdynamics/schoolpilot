// ABOUTME: The public API of result aggregation: the operators of spec 03 section 6, the ranking
// ABOUTME: policies of section 6.1, and the trace replay that audits an aggregate without trusting it.

export { isNumericField, prepareAggregation, type AggregationPreparation } from './prepare';

export { evaluateAggregation } from './evaluate';

export { replayAggregate } from './replay';

export { rankLearners } from './ranking';

export type {
  RankingCandidate,
  RankingEntry,
  RankingEvaluation,
  RankingPolicy,
  RankingReason,
  RankingResult,
} from './ranking';

export { selectBest, type Selection, type SelectionCandidate, type SelectionStatus } from './select';

export { AGGREGATION_OPERATORS, RANKING_SCOPES, RESULT_VALUE_FIELDS, TIE_METHODS } from './types';

export type { GradingScaleDefinition, ScaleLookupTrace } from '../scales';

export type {
  AggregateFlag,
  AggregateFlagCode,
  AggregateGrade,
  AggregateResult,
  AggregateRounding,
  AggregateStatus,
  AggregateTrace,
  AggregateTraceStep,
  AggregationContext,
  AggregationDefinition,
  AggregationEvaluation,
  AggregationIssue,
  AggregationIssueCode,
  AggregationOperator,
  ConsumedValue,
  CountPart,
  CountPredicate,
  FailIfRule,
  GroupConstraint,
  LearningAreaResult,
  LevelCount,
  PostStep,
  PreparedAggregation,
  ProfilePart,
  RankingScope,
  ReplayedAggregate,
  ResultValueField,
  SelectionDecision,
  SelectionReason,
  TieMethod,
  TracePart,
  WeightedTracePart,
} from './types';
