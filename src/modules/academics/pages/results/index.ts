// ABOUTME: Public surface of the results page: the page, the hook behind it, the engines' computation
// ABOUTME: and the pure pieces a test drives directly.

export { ResultsPageContent } from './ResultsPage';
export { default as ResultsPage } from './ResultsPage';
export {
  aggregateLearner,
  evaluateArea,
  toLearningAreaInput,
  type AggregateRequest,
  type AreaMark,
  type AreaSource,
} from './compute';
export { DEFAULT_AGGREGATION_CODE, defaultAggregation, describeAggregation } from './aggregation';
export { explainAggregate } from './explain';
export {
  GradeModeration,
  assertClassInScope,
  classGroupsInScope,
  type GradeOverrideInput,
  type GradeReleaseInput,
} from './moderation';
export { useResults, type ResultsOptions, type ResultsState, type ResultsViewState } from './useResults';
export { displayNumber, displayPercent } from './format';
export type {
  AggregateOutcome,
  AggregateResultStatus,
  AreaGrade,
  AreaOutcome,
  AreaResultStatus,
  ExplanationStep,
  ExplanationTable,
  GradeExplanation,
  GradeOverrideView,
  LearnerResultRow,
} from './types';
