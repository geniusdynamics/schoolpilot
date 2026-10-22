// ABOUTME: The public API of period-to-annual aggregation and progression: the five annual operators
// ABOUTME: of spec 03 section 4.1, the promotion and graduation rules of section 7, metric
// ABOUTME: resolution, and the replay that audits a suggestion without trusting it.

export { prepareAnnual, type AnnualPreparation } from './annualPrepare';

export { evaluateAnnual } from './annualEvaluate';

export { replayAnnual, replayAnnualResult } from './annualReplay';

export { prepareProgression } from './progressionPrepare';

export { evaluatePromotion, evaluateProgression } from './progressionEvaluate';

export { replayProgression } from './progressionReplay';

export { resolveMetric } from './metrics';

export {
  ANNUAL_MISSING_POLICIES,
  ANNUAL_OPERATORS,
  PROGRESSION_ACTIONS,
  PROMOTION_RULES,
  THRESHOLD_FALLBACKS,
} from './types';

export type {
  AnnualAreaResult,
  AnnualContext,
  AnnualConsumedPeriod,
  AnnualDefinition,
  AnnualEvaluation,
  AnnualFlag,
  AnnualFlagCode,
  AnnualIssue,
  AnnualIssueCode,
  AnnualMissingEntry,
  AnnualMissingPolicy,
  AnnualMissingStep,
  AnnualOperator,
  AnnualPeriodGap,
  AnnualPeriodInput,
  AnnualPeriodTreatment,
  AnnualPeriodWeight,
  AnnualResult,
  AnnualRounding,
  AnnualSeriesInput,
  AnnualSeriesResult,
  AnnualStatus,
  AnnualTrace,
  AnnualTraceStep,
  AnnualWeightTrace,
  AnnualAggregateStep,
  AnnualRoundStep,
  AnnualValueStep,
  CouncilSuggestion,
  GraduationRuleDefinition,
  MetricSource,
  MetricTrace,
  MetricUnknownReason,
  PreparedAnnual,
  PreparedCondition,
  PreparedGraduationRule,
  PreparedPromotionRule,
  PreparedRule,
  ProgressionAction,
  ProgressionConditionDefinition,
  ProgressionContext,
  ProgressionDefinition,
  ProgressionEvaluation,
  ProgressionFlag,
  ProgressionFlagCode,
  ProgressionIssue,
  ProgressionIssueCode,
  ProgressionLearner,
  ProgressionLevel,
  ProgressionPreparation,
  ProgressionReason,
  ProgressionReasonCode,
  ProgressionSuggestion,
  ProgressionTrace,
  ProgressionStage,
  PromotionRuleDefinition,
  PromotionRuleKind,
  ReplayedAnnual,
  ReplayedAnnualResult,
  ReplayedProgression,
  SuppliedMetric,
  ThresholdFallback,
} from './types';

export type { GradingScaleDefinition } from '../scales';
export type { AggregateTrace, AggregationDefinition, LearningAreaResult } from '../aggregation';
