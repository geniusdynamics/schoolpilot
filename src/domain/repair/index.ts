// ABOUTME: Public surface of the integrity and repair tool: the checks, the report they
// ABOUTME: produce, the consented fixes and the types a caller works with.

export {
  asText,
  checkDuplicateIds,
  checkReferences,
  CLASS_GROUP_TABLE,
  fieldIsRequired,
  IntegrityContext,
  isBlank,
  labelForRow,
  learnerWithoutClassGroup,
  nullStreamFinding,
  type TargetRow,
} from './checks';

export {
  runIntegrityReport,
  type IntegrityReportOptions,
} from './report';

export {
  applyIntegrityFixes,
  type RepairOptions,
} from './fixes';

export {
  acceptsNull,
  columnOf,
  primaryKeyColumn,
  quoteIdentifier,
  readLiveTable,
  tableExists,
  type LiveTable,
  type TableColumn,
} from './table';

export {
  CLEAR_REFERENCE,
  findingsByKind,
  type AppliedRepair,
  type IntegrityFinding,
  type IntegrityFindingKind,
  type IntegrityFindingsByKind,
  type IntegrityFix,
  type IntegrityFixKind,
  type IntegrityOption,
  type IntegrityReport,
  type RepairConsent,
  type RepairResult,
  type SkippedRepair,
} from './types';
