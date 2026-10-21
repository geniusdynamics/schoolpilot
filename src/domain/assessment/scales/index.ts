// ABOUTME: The public API of grading scales: prepare a pack's scale into exact bands, look an
// ABOUTME: exact score up with a replayable trace, and read the named number of a scheme result
// ABOUTME: so the caller states whether the scale sees the exact total or the rounded one.

export { isGradingScaleKind, prepareGradingScale } from './prepare';

export {
  ScaleTraceMismatchError,
  evaluateGradingScale,
  givenScore,
  gradeScoreOf,
  lookupScaleBand,
  replayScaleLookup,
} from './lookup';

export { GRADING_SCALE_KINDS } from './types';

export type {
  EngineScaleValueSource,
  GradeScore,
  GradingScaleBandDefinition,
  GradingScaleDefinition,
  GradingScaleKind,
  PreparedGradingScale,
  PreparedScaleBand,
  ScaleBandMatch,
  ScaleBoundary,
  ScaleCheckTrace,
  ScaleDirection,
  ScaleIssue,
  ScaleIssueCode,
  ScaleLookup,
  ScaleLookupTrace,
  ScaleOutcome,
  ScalePreparation,
  ScaleUpperBound,
  ScaleValueSource,
  SchemeScoreFields,
} from './types';
