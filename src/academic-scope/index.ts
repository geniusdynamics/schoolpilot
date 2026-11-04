// ABOUTME: Public surface of the shared academic scope: resolver, hook and filter bar.
// ABOUTME: Lives outside src/modules so every module can import it without crossing module lines.

export {
  resolveAcademicScope,
  type ResolvedScope,
  type ScopeSelection,
  type ScopeRows,
} from './scope';
export { useAcademicScope, type AcademicScope, type PeriodMode } from './useAcademicScope';
export { AcademicScopeFilterBar, type AcademicScopeFilterBarProps } from './AcademicScopeFilterBar';
