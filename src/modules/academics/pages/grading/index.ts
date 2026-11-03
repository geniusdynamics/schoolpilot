// ABOUTME: Barrel for the canonical Grading & Systems tabs: grading scales, assessment schemes
// ABOUTME: and the system configuration view of a programme's grading model.

export { GradingScalesTab } from './GradingScalesTab';
export { AssessmentSchemesTab } from './AssessmentSchemesTab';
export { SystemConfigTab } from './SystemConfigTab';
export { useGradingModel } from './useGradingModel';
export {
  declarationFor,
  packDeclarationsOf,
  scaleSource,
  schemeCodeOf,
  schemeSource,
  type PackGradingDeclaration,
  type RowSource,
} from './provenance';
